<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Row, FacetValues, Settings, Facet, Message, CellHandler, Column } from "./types"
import { Layout } from "./config"
import { Storage } from "./storage"
import Drawer from "./components/Drawer.vue"
import SettingsDrawer from "./components/SettingsDrawer.vue"
import FacetComponent from "./components/Facet.vue"
import StatusIndicator from "./components/StatusIndicator.vue"

const rows = ref<Row[]>([])
const facets = ref<FacetValues>({})
const settings = ref<Settings>({
  maxMessages: 1000,
  leftColWidth: 180,
})
const table = ref<HTMLElement>()
const drawer = ref<{
  row?: Row
}>({})
const searchbar = ref<string>("")
const settingsDrawer = ref<boolean>(false)
const columns = ref<Column[]>([])
const status = ref<"connected" | "not connected">("not connected")

const storage = new Storage<Message>('logs')
const storageLayout = new Storage<Layout>('layout')
const layout = ref<Layout>(new Layout('main'))

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

const tryAddMessage = (m: Message) => {
  try {
    addMessage(m)
  } catch (e) {
    // todo: messages that cannot be processed should land in DLQ or some kind of buffer
    console.error("Could not process message", e)

  }
}

const addMessage = (m: Message) => {
  if (m.content.length === 0) {
    return
  }

  if (rows.value.length >= settings.value.maxMessages) {
    removeMessage()
  }

  let cells = layout.value.columns.filter(c => !c.hidden).map((l): CellHandler => {
    try {
      let h = l.handler!(m)
      h.facets?.forEach(addToFacet)
      return h
    } catch (e) {
      return { text: "error" }
    }
  })
  let fields = layout.value.columns.filter(c => c.hidden).map((l): CellHandler => {
    try {
      let h = l.handler!(m)
      h.facets?.forEach(addToFacet)
      return h
    } catch (e) {
      return { text: "error" }
    }
  })

  rows.value.push({
    msg: m,
    cells,
    fields,
    facets: cells.map(c => c.facets || []).flat()
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

const clearAll = () => {
  rows.value = []
  facets.value = {}
  storage.removeAll()
}

const loadStorage = () => {
  storage.load().forEach(m => {
    tryAddMessage(m)
  })
}

const loadConfig = () => {

  let layouts = storageLayout.load()

  if (layouts[0]) {
    layout.value.loadFromObj(layouts[0])
    if (layouts[0].settings) {
      settings.value = layouts[0].settings
    }
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
  const selectedFacets: string[] = []
  for (let i in facets.value) {
    facets.value[i].items.forEach(el => {
      if (el.selected) {
        selectedFacets.push(i + "_" + el.label)
      }

    })
  }

  return rows.value.filter(r => {
    if (selectedFacets.length === 0) return true
    return r.facets.map(f => f.name + "_" + f.value).filter(a => selectedFacets.includes(a)).length > 0
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

const endDragging = () => {
  document.getElementById("app")?.classList.remove('noselect')
  document.removeEventListener('mousemove', handleDragging)


  layout.value.settings = settings.value
  storageLayout.removeAll()
  storageLayout.add(layout.value as Layout)
}

const handleDragging = (e: MouseEvent) => {
  settings.value.leftColWidth += (e.movementX)
}

const columnEdited = (col: Column) => {
  if (col.id === 'new') {
    layout.value.add(col)
  } else {
    layout.value.update(col)
  }
  storageLayout.removeAll()
  storageLayout.add(layout.value as Layout)
  render()
}

const columnRemoved = (colId: string) => {
  layout.value.removeColumn(colId)
  storageLayout.removeAll()
  storageLayout.add(layout.value as Layout)
  render()
}

const render = () => {
  rows.value = []
  facets.value = {}
  loadColumnsFromLayout()
  loadStorage()
}


loadConfig()
render()

const connectToWs = () => {
  const socket = new WebSocket('ws://' + window.location.host + '/ws');
  status.value = 'not connected'
  var wasOpened = false

  socket.onopen = () => {
    wasOpened = true
    status.value = 'connected'
    render()
  }

  socket.onclose = () => {
    if (socket.CLOSED && wasOpened) {
      status.value = 'not connected'
      connectToWs()
    }
  }

  socket.onerror = (ev: Event) => {
    console.log(ev)
    setTimeout(() => {
      console.log("Reconnecting to WS")
      connectToWs()
    }, 1000)
  }

  socket.onmessage = (msg: MessageEvent) => {
    let m = JSON.parse(msg.data) as Message
    tryAddMessage(m)
    storage.add(m)
  }
}

onMounted(async () => {

  connectToWs()

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

</script>

<template>
  <div class="top-bar">
    <div class="left">
      <button @click="clearAll">Clear all</button>
      {{ displayRows.length }} of {{ rows.length }}
    </div>
    <div class="right">
      <input type="text" class="searchbar" v-model="searchbar" placeholder="Search logs..." />
    </div>
    <div class="end">
      <StatusIndicator :status="status" />
      <button @click="settingsDrawer = true">Settings</button>
    </div>
  </div>
  <div class="layout" @mouseup="endDragging">
    <div class="left-col" :style="{ width: settings.leftColWidth + 'px' }">
      <FacetComponent :facets="facets" />
    </div>
    <div class="mid-col" @mousedown="startDragging"></div>
    <div class="right-col" ref="table">
      <div class="btn stick" @click="stickToBottom">Stick to bottom</div>
      <table class="table" cellspacing="0" cellpadding="0">
        <tr>
          <th v-for="col in columns" :style="{ width: col.width + 'px' }">{{ col.name }}</th>
        </tr>
        <tr class="row" v-for="row in displayRows" @click="drawer.row = row">
          <td class="cell" v-for="_, k2 in columns">
            <div :style="{ width: columns[k2].width + 'px' }">{{ row.cells[k2].text }}</div>
          </td>
        </tr>
      </table>
    </div>
    <SettingsDrawer v-if="settingsDrawer" @close="settingsDrawer = false" :layout="(layout as Layout)"
      @edit="columnEdited" @remove="columnRemoved" @move="reorderColumns" />
    <Drawer :row="drawer.row" :layout="(layout as Layout)" @close="drawer.row = undefined" />
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
    width: 200px;
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
    min-width: 100px;
    // max-width: 180px;
    border-right: 1px solid var(--hl-bg);
    padding-right: 5px;

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

      td,
      th {
        padding: 1px 2px;
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
