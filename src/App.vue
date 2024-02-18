<script setup lang="ts">
import { StyleValue, computed, onMounted, ref, watch } from 'vue';
import { Row, FacetValues, Facet, Message, CellHandler, Column, Settings, Middleware } from "./types"
import { Layout } from "./config"
import { storageLayout, storageLogs } from "./storage"
import Drawer from "./components/Drawer.vue"
import SettingsDrawer from "./components/SettingsDrawer.vue"
import FacetComponent from "./components/Facet.vue"
import Modal from "./components/Modal.vue"
import AuthPrompt from "./components/AuthPrompt.vue"
import StatusIndicator from "./components/StatusIndicator.vue"
import DemoBar from "./components/DemoBar.vue"
import Confirm from "./components/ConfirmModal.vue"
import Import from "./components/Import.vue"
import HideColumnIcon from "./components/HideColumnIcon.vue"
import ExportLogs from "./components/ExportLogs.vue"
import { useMainStore, InitSettings } from './store';
import { startDragging, endDragging, startColumnDragging } from './dragging';
import * as demo from "./demo";
import { initKeyEventListeners } from "./key_events"
import loadAnalytics from './analytics';
import "./app.scss"

const store = useMainStore()

const facets = ref<FacetValues>({})
const table = ref<HTMLElement>()

const searchbar = ref<string>("")
const settingsDrawer = ref<boolean>(false)

const columns = ref<Column[]>([])
const sampleLineIndex = ref<number>(0)

storageLogs.startClearingUnknowns()

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

const tryAddMessage = (msgs: Message[], settings: Settings) => {
  try {
    let mm = msgs.map(m => processMiddlewares(m, settings.middlewares)).filter(m => m) as Message[]
    if (msgs) {
      addMessages(mm)
    }
  } catch (e) {
    // todo: messages that cannot be processed should land in DLQ or some kind of buffer
    console.error("Could not process message", e)
  }
}

const addMessages = (msgs: Message[]) => {
  if (msgs.length === 0) {
    return
  }

  let toAdd: Row[] = []
  msgs.forEach(m => {

    let cells = store.layout.columns.filter(c => !c.hidden).map((l): CellHandler => {
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
    let fields = store.layout.columns.filter(c => c.hidden).map((l): CellHandler => {
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

    toAdd.push({
      id: m.id,
      orderKey: m.order_key || 0,
      msg: m,
      cells,
      fields,
      facets: cells.map(c => c.facets || []).flat().concat(fields.map(c => c.facets || []).flat())
    })

  })


  if (store.rows.length >= store.layout.settings.maxMessages) {
    if (store.rows.length > store.layout.settings.maxMessages) {
      removeMessage(store.rows.length - store.layout.settings.maxMessages)
    }
    removeMessage(msgs.length)
  }
  store.rows.push(...toAdd)

  if ((toAdd[0] as any).orderKey) {
    store.rows.sort((a, b) => { return (a.orderKey || 0) >= (b.orderKey || 0) ? 1 : -1 })
  }

  setTimeout(() => {
    if (store.stickedToBottom) {
      stickToBottom()
    }
  }, 10)
}

const shouldStickToBottom = () => {
  return table.value && (table.value.scrollTop + table.value.offsetHeight + 20) >= table.value.scrollHeight
}

const removeMessage = (count: number = 1) => {
  for (let i = 0; i < count; i++) {
    removeFromFacet(store.rows[i])
    storageLogs.removeFirst()
  }
  storageLogs.clearUnknown()
  store.rows.splice(0, count)
}

const clearAllRows = () => {
  store.rows = []
  facets.value = {}
  storageLogs.removeAll()
}

const clearAll = () => {
  store.confirm("Are you sure you want to clear all logs?", clearAllRows)
}

const loadStorage = () => {
  let msgs = storageLogs.load()
  let openIds: Record<string, number> = {}
  tryAddMessage(msgs.map(sm => {
    if (sm.opened) openIds[sm.id!] = 1
    return sm.message
  }), store.layout.settings)

  msgs.forEach((msg, k) => {
    if (!openIds[store.rows[k].id!]) {
      return
    }
    store.rows[k].opened = msg.opened
  })
}

const loadConfig = (load?: Layout) => {

  let layouts = load ? [load] : storageLayout.load()

  if (store.initSettings?.configStr) {
    console.log("Loading Layout from backend config")
    layouts = [JSON.parse(store.initSettings?.configStr)]
  }

  if (layouts[0]) {
    store.layout.loadFromObj(layouts[0])
  } else {
    store.layout.add({
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

  return store.rows.filter(r => {
    if (Object.keys(selectedFacets).length === 0) return true
    let sel = { ...selectedFacets }
    let cnt = Object.keys(sel).length

    r.facets.forEach(f => {
      if (sel[f.name] && sel[f.name].includes(f.value)) {
        cnt--
      }
    })
    return cnt === 0
  }).filter(r => {
    if (searchbar.value.length < 3) {
      return true
    }

    return (r.msg.content || "").search(new RegExp(searchbar.value, 'i')) >= 0
  })
})

const loadColumnsFromLayout = () => {
  columns.value = store.layout.columns.filter(col => !col.hidden)
}

const addRawColumn = () => {
  columnEdited({
    name: "raw",
    id: "new",
    width: 500,
    handlerTsCode: `(line: Message): CellHandler => {
    return { text: line.content || "-"}
}`
  })
}

const columnEdited = (col: Column) => {
  if (col.id === 'new') {
    store.layout.add(col)
  } else {
    store.layout.update(col)
  }
  storageLayout.update('main', store.layout as Layout)
  render()
}

const layoutLoaded = (lt: Layout) => {
  store.layout = lt
  storageLayout.update('main', store.layout as Layout)
  render()
}

const columnRemoved = (colId: string) => {
  store.layout.removeColumn(colId)
  storageLayout.update('main', store.layout as Layout)
  render()
}

const settingsUpdate = (settings: Settings) => {
  store.layout.settings = settings
  store.layout.processMiddlewareHandlers()
  storageLayout.update('main', store.layout as Layout)
  render()
}

const render = () => {
  store.rows = []
  facets.value = {}
  loadColumnsFromLayout()
  loadStorage()
}

const connectToWs = () => {
  console.log("Connecting to WS")
  const socket = new WebSocket('ws://' + window.location.host + '/ws?password=' + store.getPassword());
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
      case "log_bulk":
        tryAddMessage(m.messages, store.layout.settings);
        (m.messages as Message[]).forEach(msg => {
          storageLogs.add({ id: msg.id, message: msg }, msg.id)
        })
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
  store.layout = demo.getLayout(store.demoContent === 'json')
  store.layout.processMiddlewareHandlers()
  clearAllRows()
  render()
}

const addDemoData = (count: number = 1) => {
  let isJson = store.demoContent === 'json'

  let rand = Math.random()
  let origin = {
    port: "",
    file: ""
  }
  if (rand < 0.50) {
    origin.port = "8123"
    origin.file = "foo.log"
  } else {
    origin.port = "8999"
    origin.file = "foo/bar.log"
  }

  while (count--) {
    let data = demo.generateData(isJson)
    tryAddMessage([{
      id: new Date().getTime().toString(),
      content: isJson ? JSON.stringify(data) : data as string,
      is_json: true,
      log_type: 0,
      json_content: isJson ? data : null,
      origin,
      ts: new Date().getTime(),
    }], store.layout.settings)
  }
}

watch(() => store.initSettings?.received, (newVal?: boolean) => {
  if (newVal && store.initSettings?.analyticsEnabled) {
    loadAnalytics(false)
  }
})

const hideColumn = (col: Column) => {
  useMainStore().confirm("Are you sure you want to hide the column? You can always restore it in the settings", () => {
    col.hidden = true
    columnEdited(col)
  })
}

onMounted(async () => {
  if (store.demoMode) {
    loadDemoMode()
    loadAnalytics(true)
  } else {
    await initWs()
  }

  render()

  initKeyEventListeners()

  table.value?.addEventListener("scroll", () => {
    if (!shouldStickToBottom()) {
      store.stickedToBottom = false
    } else {
      store.stickedToBottom = true
    }
  })
})

const postAuth = () => {
  store.modalShow = ""
  connectToWs()
  loadAnalytics(false)
  loadConfig()
}

const initWs = async () => {
  let res = await fetch("/api/status")

  let init
  try {
    init = await res.json() as InitSettings
  } catch (e) {
    return
  }

  store.initSettings = init

  let passValid = await fetch("/api/check-pass?password=" + store.getPassword())
  if (store.initSettings.authRequired && passValid.status !== 200) {
    store.modalShow = "auth"
  } else {
    postAuth()
  }
}

const reorderColumns = (colId: string, diff: number) => {
  store.layout.move(colId, diff)
  render()
}

const stickToBottom = () => {
  table.value!.scrollTop = table.value!.scrollHeight + 30
}

const changeDemoMode = (mode: "json" | "string") => {
  store.demoContent = mode
  renderDemoMode()
}

const sampleLine = computed(() => {
  return store.rows && store.rows[sampleLineIndex.value] && store.rows[sampleLineIndex.value].msg
})

const updateSampleLine = () => {
  sampleLineIndex.value = Math.floor(Math.random() * store.rows.length)
}

</script>

<template>
  <Modal @close="store.modalShow = ''" v-if="store.modalShow">
    <AuthPrompt v-if="store.modalShow == 'auth'" @success="postAuth" />
    <Import v-if="store.modalShow == 'import'" :layout="(store.layout as Layout)" @layout-loaded="layoutLoaded" />
    <ExportLogs v-if="store.modalShow == 'export-logs'" :rows="store.rows" :visible-rows="displayRows"
      :layout="(store.layout as Layout)" />
  </Modal>
  <Confirm />

  <SettingsDrawer v-if="settingsDrawer" @close="settingsDrawer = false" :layout="(store.layout as Layout)"
    @edit="columnEdited" @remove="columnRemoved" @move="reorderColumns" @settings-update="settingsUpdate"
    @update-sample-line="updateSampleLine" :sampleLine="sampleLine" />
  <Drawer :row="store.drawer.row" :layout="(store.layout as Layout)" @close="store.closeLogDrawer" />
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
      <div class="left-col" :style="{ width: store.layout.settings.leftColWidth + 'px' }">
        <div class="counter">
          <span>Showing {{ displayRows.length }} out of {{ store.rows.length }} logs</span>
          <br />
          <button class="btn-sm" style="margin-top:4px" @click="useMainStore().modalShow = 'export-logs'">Export
            messages</button>
        </div>
        <FacetComponent :facets="facets" />
      </div>
      <div class="mid-col" @mousedown="startDragging"></div>
      <div class="right-col" ref="table">
        <div v-if="columns.length === 0" style="text-align: center; padding-top:100px; font-size: 20px;">

          <div v-if="useMainStore().status == 'not connected'" style="margin: 10px; padding: 5px;">Status: <strong>Not
              connected</strong></div>

          <template v-else>
            No columns defined, open <span class="clickable" @click="settingsDrawer = true">Settings</span> and add
            columns<br />
            or <span class="clickable" @click="addRawColumn">add column with raw content now</span>.
          </template>
        </div>
        <template v-else>
          <div class="btn stick" @click="stickToBottom" :class="{ sticked: store.stickedToBottom }">
            <template v-if="!store.stickedToBottom">Stick to bottom</template>
            <template v-else>Sticked</template>
          </div>
          <table class="table" cellspacing="0" cellpadding="0">
            <tr>
              <th v-for="col in columns" :style="{ width: col.width + 'px', cursor: 'auto' }" class="column-name">
                <span style="cursor: auto;">{{ col.name }}</span>
                <div class="hide-icon"
                  style="height: 12px; width: 12px; display: inline; visibility: hidden; opacity: 0.4; cursor: pointer; margin-left: 3px;"
                  @click="hideColumn(col)">
                  <HideColumnIcon />
                </div>
                <div class="header-border" @mousedown="startColumnDragging(col.id)">
                  &nbsp;</div>
              </th>
            </tr>
            <tr class="row" :class="{ opened: row.opened, open: row.open }" v-for="row, k in displayRows"
              @click="store.openLogDrawer(k)" :style="(row.msg.style as StyleValue || {})">
              <td class="cell" v-for="_, k2 in columns" :style="row.cells[k2].style as StyleValue || {}">
                <div :style="{ width: columns[k2].width + 'px' }">{{ row.cells[k2].text }}</div>
              </td>
            </tr>
          </table>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
