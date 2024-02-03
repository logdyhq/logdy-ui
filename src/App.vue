<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Row, FacetValues, Facet, Message, CellHandler, Column, Settings, Middleware } from "./types"
import { Layout } from "./config"
import { Storage } from "./storage"
import Drawer from "./components/Drawer.vue"
import SettingsDrawer from "./components/SettingsDrawer.vue"
import FacetComponent from "./components/Facet.vue"
import StatusIndicator from "./components/StatusIndicator.vue"
import DemoBar from "./components/DemoBar.vue"
import Confirm from "./components/ConfirmModal.vue"
import { useMainStore, InitSettings } from './store';
import * as demo from "./demo";
import loadAnalytics from './analytics';

const store = useMainStore()

const rows = ref<Row[]>([])
const facets = ref<FacetValues>({})
const table = ref<HTMLElement>()
const drawer = ref<{
  row?: Row
}>({})
const searchbar = ref<string>("")
const settingsDrawer = ref<boolean>(false)
const columns = ref<Column[]>([])

const storage = new Storage<Message>('logs')
storage.startClearingUnknowns()

const storageLayout = new Storage<Layout>('layout')
const layout = ref<Layout>(new Layout('main', { leftColWidth: 300, maxMessages: 1000, middlewares: [] }))

const addToFacet = (f: Facet) => {
  if (!facets.value[f.name]) {
    facets.value[f.name] = {
      items: [],
      toggled: true,
      name: f.name
    }
  }
  let idx = facets.value[f.name].items.findIndex(v => v.label === f.value)
  if (idx < 0) {
    facets.value[f.name].items.push({
      count: 0,
      selected: false,
      label: f.value
    })
    idx = facets.value[f.name].items.length - 1
  }
  facets.value[f.name].items[idx].count++
}

const removeFromFacet = (r: Row) => {
  r.facets.forEach(f => {
    let idx = facets.value[f.name].items.findIndex(v => v.label === f.value)
    facets.value[f.name].items[idx].count--
    if (facets.value[f.name].items[idx].count <= 0) {
      facets.value[f.name].items.splice(idx, 1)
    }
  })
}

const processMiddlewares = (msg: Message, middlewares: Middleware[]): Message | void => {
  for (let i in middlewares) {
    let _msg = middlewares[i].handler!(msg)
    if (_msg == null) {
      return
    }
    msg = _msg
  }

  return msg
}

const tryAddMessage = (m: Message, settings: Settings) => {
  try {
    let msg = processMiddlewares(m, settings.middlewares)
    if (msg) {
      addMessage(m)
    }
  } catch (e) {
    // todo: messages that cannot be processed should land in DLQ or some kind of buffer
    console.error("Could not process message", e)
  }
}

const addMessage = (m: Message) => {
  if (m.content.length === 0) {
    return
  }

  if (rows.value.length >= layout.value.settings.maxMessages) {
    removeMessage()
  }

  let cells = layout.value.columns.filter(c => !c.hidden).map((l): CellHandler => {
    try {
      let h = l.handler!(m)
      if (l.faceted) {
        h.facets = (h.facets || [])
        h.facets.push({
          name: l.name,
          value: h.text
        })
      }
      h.facets?.forEach(addToFacet)
      return h
    } catch (e) {
      console.log(e)
      return { text: "error" }
    }
  })
  let fields = layout.value.columns.filter(c => c.hidden).map((l): CellHandler => {
    try {
      let h = l.handler!(m)
      if (l.faceted) {
        h.facets = (h.facets || [])
        h.facets.push({
          name: l.name,
          value: h.text
        })
      }
      h.facets?.forEach(addToFacet)
      return h
    } catch (e) {
      console.log(e)
      return { text: "error" }
    }
  })

  rows.value.push({
    msg: m,
    cells,
    fields,
    facets: cells.map(c => c.facets || []).flat().concat(fields.map(c => c.facets || []).flat())
  })

  let change = table.value && (table.value.scrollTop + table.value.offsetHeight + 20) >= table.value.scrollHeight
  setTimeout(() => {
    if (change) {
      stickToBottom()
    }
  }, 10)
}

const removeMessage = () => {
  removeFromFacet(rows.value[0])
  rows.value.splice(0, 1)
  storage.removeFirst()
}

const clearAllRows = () => {
  rows.value = []
  facets.value = {}
  storage.removeAll()
}

const clearAll = () => {
  store.confirm("Are you sure you want to clear all logs?", clearAllRows)
}

const loadStorage = () => {
  storage.load().forEach(m => {
    tryAddMessage(m, layout.value.settings)
  })
}

const loadConfig = (load?: Layout) => {

  let layouts = load ? [load] : storageLayout.load()

  if (layouts[0]) {
    layout.value.loadFromObj(layouts[0])
  } else {
    layout.value.add({
      id: "",
      name: "raw",
      handlerTsCode: `(line: Message): CellHandler => {
          return { text: line.content || "-"}
      }`
    })
  }
}

const displayRows = computed(() => {
  const selectedFacets: Record<string, string[]> = {}
  for (let i in facets.value) {
    facets.value[i].items.forEach(el => {
      if (el.selected) {
        if (!selectedFacets[i]) {
          selectedFacets[i] = []
        }
        selectedFacets[i].push(el.label)
      }
    })
  }

  return rows.value.filter(r => {
    if (Object.keys(selectedFacets).length === 0) return true
    let sel = { ...selectedFacets }
    let cnt = Object.keys(sel).length

    r.facets.forEach(f => {
      if (sel[f.name] && sel[f.name].includes(f.value)) {
        cnt--
      }
    })
    console.log(r.facets)
    return cnt === 0
  }).filter(r => {
    if (searchbar.value.length < 3) {
      return true
    }

    return (r.msg.content || "").search(new RegExp(searchbar.value, 'i')) >= 0
  })
})

const loadColumnsFromLayout = () => {
  columns.value = layout.value.columns.filter(col => !col.hidden)
}

const startDragging = () => {
  document.getElementById("app")?.classList.add('noselect')
  document.addEventListener('mousemove', handleDragging)
}

const startColumnDragging = (colId: string) => {
  document.getElementById("app")?.classList.add('noselect')
  const signal = new AbortController()
  document.addEventListener('mousemove', (e: MouseEvent) => {
    handleColumnDragging(colId, e)
  }, { signal: signal.signal })

  document.addEventListener('mouseup', () => {
    signal.abort()

    storageLayout.update('main', layout.value as Layout)
  }, { once: true })
}

const endDragging = () => {
  document.getElementById("app")?.classList.remove('noselect')
  document.removeEventListener('mousemove', handleDragging)

  storageLayout.update('main', layout.value as Layout)
}

const handleColumnDragging = (colId: string, e: MouseEvent) => {
  let col = layout.value.getColumn(colId)
  if (!col.width) {
    col.width = 150
  }
  col.width += e.movementX
  if (col.width <= 40) {
    col.width = 40
    return
  }
  layout.value.update(col)
}

const handleDragging = (e: MouseEvent) => {
  layout.value.settings.leftColWidth += (e.movementX)
}

const columnEdited = (col: Column) => {
  if (col.id === 'new') {
    layout.value.add(col)
  } else {
    layout.value.update(col)
  }
  storageLayout.update('main', layout.value as Layout)
  render()
}

const columnRemoved = (colId: string) => {
  layout.value.removeColumn(colId)
  storageLayout.update('main', layout.value as Layout)
  render()
}

const settingsUpdate = (settings: Settings) => {
  layout.value.settings = settings
  layout.value.processMiddlewareHandlers()
  storageLayout.update('main', layout.value as Layout)
  render()
}

const render = () => {
  rows.value = []
  facets.value = {}
  loadColumnsFromLayout()
  loadStorage()
}

const connectToWs = () => {
  console.log("Connecting to WS")
  const socket = new WebSocket('ws://' + window.location.host + '/ws');
  store.status = 'not connected'
  var wasOpened = false

  socket.onopen = () => {
    wasOpened = true
    store.status = 'connected'
    render()
  }

  socket.onclose = () => {
    if (socket.CLOSED && wasOpened) {
      store.status = 'not connected'
      connectToWs()
    }
  }

  socket.onerror = (_: Event) => {
    socket.close()
    setTimeout(() => {
      console.log("Reconnecting to WS")
      connectToWs()
    }, 1000)
  }

  socket.onmessage = (msg: MessageEvent) => {
    let m = JSON.parse(msg.data)

    switch (m.message_type) {
      case "init":
        console.debug('Received init message', m)
        m = m as InitSettings
        break
      case "log":
        tryAddMessage(m as Message, layout.value.settings)
        storage.add(m)
        break
      default:
        console.error(m)
        throw new Error("Unrecognized message")
    }

  }
}

const loadDemoMode = () => {
  store.status = 'connected'
  const numPerSec = 2
  renderDemoMode()

  setInterval(() => {
    if (store.demoStatus === 'stopped') {
      return
    }
    addDemoData()
  }, (1 / numPerSec) * 1000)
}

const renderDemoMode = () => {
  layout.value = demo.getLayout(store.demoContent === 'json')
  layout.value.processMiddlewareHandlers()
  clearAllRows()
  render()
}

const addDemoData = (count: number = 1) => {
  let isJson = store.demoContent === 'json'
  while (count--) {
    let data = demo.generateData(isJson)
    tryAddMessage({
      content: isJson ? JSON.stringify(data) : data as string,
      is_json: true,
      log_type: 0,
      json_content: isJson ? data : null
    }, layout.value.settings)
  }
}

watch(() => store.initSettings?.received, (newVal?: boolean) => {
  if (newVal && store.initSettings?.analyticsEnabled) {
    loadAnalytics(false)
  }
})

onMounted(async () => {
  if (store.demoMode) {
    loadDemoMode()
    loadAnalytics(true)
  } else {
    connectToWs()
    loadAnalytics(false)
    loadConfig()
  }

  render()

  document.addEventListener("keyup", (event: KeyboardEvent) => {
    if (event.code === 'Escape') {
      drawer.value.row = undefined
    }
  });

})

const reorderColumns = (colId: string, diff: number) => {
  layout.value.move(colId, diff)
  render()
}

const stickToBottom = () => {
  table.value!.scrollTop = table.value!.scrollHeight + 30
}

const changeDemoMode = (mode: "json" | "string") => {
  store.demoContent = mode
  renderDemoMode()
}

</script>

<template>
  <!-- <Modal @close="store.modalShow.value = false" v-if="store.modalShow.value" /> -->
  <Confirm />
  <DemoBar v-if="store.demoMode" @start="store.demoStatus = 'started'" @stop="store.demoStatus = 'stopped'"
    @mode="changeDemoMode" @add="addDemoData(100)" />
  <div :class="{ 'demo': store.demoMode }">
    <div class="top-bar">
      <div class="left">
        <div class="logo">
          <a href="https://logdy.dev" target="_blank"><img src="/logdy-transparent.png" /></a>
        </div>
        <div class="docs">
          <a href="https://logdy.dev/docs/quick-start">Open docs</a>
        </div>
      </div>
      <div class="right">
        <input type="text" class="searchbar" v-model="searchbar" placeholder="Search logs..." />
      </div>
      <div class="end">
        <button @click="clearAll">Clear all logs</button>
        <StatusIndicator :status="store.status" />
        <button @click="settingsDrawer = true">Settings</button>
      </div>
    </div>
    <div class="layout" @mouseup="endDragging">
      <div class="left-col" :style="{ width: layout.settings.leftColWidth + 'px' }">
        <div class="counter">
          <span>Showing {{ displayRows.length }} out of {{ rows.length }} logs</span>
        </div>
        <FacetComponent :facets="facets" />
      </div>
      <div class="mid-col" @mousedown="startDragging"></div>
      <div class="right-col" ref="table">
        <div class="btn stick" @click="stickToBottom">Stick to bottom</div>
        <table class="table" cellspacing="0" cellpadding="0">
          <tr>
            <th v-for="col in columns" :style="{ width: col.width + 'px' }">
              {{ col.name }}
              <div class="header-border" @mousedown="startColumnDragging(col.id)">
                &nbsp;</div>
            </th>
          </tr>
          <tr class="row" v-for="row in displayRows" @click="drawer.row = row">
            <td class="cell" v-for="_, k2 in columns">
              <div :style="{ width: columns[k2].width + 'px' }">{{ row.cells[k2].text }}</div>
            </td>
          </tr>
        </table>
      </div>
      <SettingsDrawer v-if="settingsDrawer" @close="settingsDrawer = false" :layout="(layout as Layout)"
        @edit="columnEdited" @remove="columnRemoved" @move="reorderColumns" @settings-update="settingsUpdate"
        :sampleLine="rows[0] && rows[0].msg" />
      <Drawer :row="drawer.row" :layout="(layout as Layout)" @close="drawer.row = undefined" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.top-bar {
  height: 50px;
  display: flex;
  align-items: center;
  flex-direction: row;
  padding: 8px;


  &div {
    flex: 1 1 auto;
  }

  .left {
    display: flex;
    align-items: center;

    .logo img {
      height: 40px;
    }

    .docs {
      margin-left: 10px;
      font-size: 12px;
      border: 1px solid var(--hl-bg);
      padding: 4px 8px;
      border-radius: 6px;
    }

    margin-left: 20px;
    margin-right: 20px;
  }

  .right {
    flex-grow: 1;
    display: flex;
    align-items: center;

    .searchbar {
      font-family: 'Roboto mono', sans-serif;
      font-size: 12px;
      padding: 5px;
      width: 100%;
      -webkit-box-sizing: border-box;
      -moz-box-sizing: border-box;
      -o-box-sizing: border-box;
      -ms-box-sizing: border-box;
      box-sizing: border-box;
    }
  }

  .end {
    display: flex;
    align-items: center;
    margin: 0 0px 0 10px;
  }

}


.layout {
  display: flex;
  height: calc(100vh - 66px);
  overflow: hidden;

  .mid-col {
    background: white;
    width: 4px;
    opacity: 0.2;
    cursor: ew-resize;
  }

  .left-col {

    overflow: auto;
    overflow-x: hidden;
    min-width: 150px;
    border-right: 1px solid var(--hl-bg);
    padding-right: 5px;

    .counter {
      text-align: center;
      padding-bottom: 10px;
    }

  }

  .right-col {
    padding-left: 5px;
    overflow: scroll;
    // overflow-x: hidden;
    width: 100%;
    height: calc(100%);


    .stick {
      position: fixed;
      right: 15px;
      bottom: 10px;
      font-size: 12px;
    }

    .table {
      font-family: 'Roboto mono', sans-serif;
      font-size: 12px;
      border: none;
      border-collapse: separate;
      border-spacing: 0;

      .header-border {
        height: 100%;
        display: inline;
        width: 3px;
        cursor: ew-resize;
        background: rgba(0, 0, 0, .25);
        float: right;
      }

      td,
      th {
        padding: 1px 2px;
      }

      th {
        position: sticky;
        top: 0;
        background-color: var(--hl-bg);
        padding: 2px 0;
      }

      td div {
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        word-wrap: break-word;
        word-break: break-all;
      }

      tr {
        cursor: pointer;
      }

      tr.row:hover {
        background-color: var(--hl-bg);
      }
    }
  }
}
</style>
