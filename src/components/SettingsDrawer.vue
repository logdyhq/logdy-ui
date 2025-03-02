<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { Layout } from "../config"
import * as monaco from 'monaco-editor';

import jsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import { Column, Settings, Middleware, Message } from "../types";
import { momentdts } from "../moment.lib.ts";
import { LIB_ES5_D_LIB } from "../lib_es5";
import { LIB_ES2015_PROMISE_LIB } from "../lib_es2015.promise";
import { LIB_ES5_CORE_LIB } from "../lib_es2015_core";
import { useMainStore } from "../store";
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import { themeHandler } from "../theme.ts";
import Sun from "./icon/Sun.vue";
import Moon from "./icon/Moon.vue";

self.MonacoEnvironment = {
    getWorker: function (_, label) {
        switch (label) {
            case 'typescript':
            case 'javascript':
                //@ts-expect-error
                return jsWorker();
            default:
                //@ts-expect-error
                return editorWorker();
        }
    }
};

const EMPTY_COL = `(line: Message): CellHandler => {
    return { text: "-" }
}`
const EMPTY_MIDDLEWARE = `(line: Message): Message | void => {
    return line;
}`

const LIBS = `
type Message = {
    /**
     * Whether a log was produced as STDOUT (=1) or STDERR (=2)
     */
    log_type: number,
    /**
     * Raw content of the log line
     */
    content: string,
    /**
     * If the content is in json format, 
     * this field will be automatically populated with the parsed value
     */
    json_content?: any,
    /**
     * Specifies whether the 'content' field is in json format
     */
    is_json: boolean,
    /**
     * A UNIX timestamp in milliseconds for when the message was received by Logdy
     */
    ts: number,
    /**
     * A numerical key by which all of the messages will be ordered. Setting this key is useful
     * when you're dealing with multiple sources of logs and want them ordered, 
     * for example by the timestamp, then you can assign the timestamp value as this key.
     */
    order_key?: number,
    /**
     * Specifies the origin of the message
     */
     origin?: {
        /**
         * Origin port number
         */
        port: string
        /**
         * Origin file name with path
         */
        file: string,
        /**
         * Origin of the message coming from the API
         */
        api_source: string
    },
    /** 
     * Special styles that will be applied to entire row
     * of the table. For example { "background": "red" }, will make the whole row
     * background red.
     */
    style?: object,
    /**
     * A correlation identifier used to trace log messages that belongs to the same transaction 
     * (chain of requests between components within a system).
     */
    correlation_id?: string,
    /**
     * This object can be filled with values that represent timings 
     * of the event represented by the particular log line.
     * All of the value must be positive numbers. 
     * There is no defined unit.
     */
    timing?: {
        /**
         * Represents a start of the event
        */
        start: number,
        /**
         * Represents an end of the event
        */
        end?: number,
        /**
         * Represents a duration of the event. In case an 'end' is present
         * this field will be ignored.
        */
        duration?: number,
        /**
         * The message to present when hovering over block in trace view
         */
        label?: string,
        /**
         * Styles to be applied to a particular trace
         */
        style?: {
            /**
             * Background style
             */
            backgroundColor?: string,
            /**
             * Border style
             */
            border?: string,
            /**
             * Font color
             */
            color?: string,
        },
    }
}

type CellHandler = {
    /**
     * The value that will be presented in the table cell or log drawer
     */
    text: string,
    /**
     * Whether the value is in JSON format
     * if so, a better formatting will be applied in the Log drawer
     */
    isJson?: boolean,
    /** 
     * Special styles that will be applied to a particular cell
     * in the table. For example { "background": "red" }, will make the cell
     * background red.
     */
    style?: object,
    /**
     * A list of Facets that for a particular line
     */
    facets?: Facet[],
    /**
     * Whether 'text' is allowed to contain HTML tags.
     * Setting it to 'true' is danger since the string will be interpreted as HTML
     * and opens a vulnerability for XSS attacks.
     */
    allowHtmlInText?: boolean
}

type Facet = {
    /**
     * A facet name, will be used to group values under same label
     */
    name: string,
    /**
     * A facet value, will be used to automatically build filters
     */
    value: string
}
`

let editor: monaco.editor.IStandaloneCodeEditor;
let editorMiddleware: monaco.editor.IStandaloneCodeEditor;
let models: Record<string, monaco.editor.ITextModel> = {};
const settingsChanged = ref<boolean>(false)

let selectedColumn = ref<Column>()
let sampleLineVisible = ref<boolean>(true)
let selectedMiddleware = ref<Middleware>()
let settings = ref<Settings>({ leftColWidth: 200, drawerColWidth: 900, maxMessages: 1000, middlewares: [], entriesOrder: "desc" })

const props = defineProps<{
    layout: Layout,
    sampleLine?: Message
}>()

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'edit', column: Column): void
    (e: 'settings-update', settings: Settings): void
    (e: 'remove', columnId: string): void
    (e: 'move', columnId: string, diff: number): void
    (e: 'update-sample-line'): void
}>()

const createEditor = (elId: string): monaco.editor.IStandaloneCodeEditor => {
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2015,
        noLib: true,
    });
    const libUri = 'ts:lib.d.ts'

    monaco.languages.typescript.typescriptDefaults.addExtraLib(LIBS, libUri)

    monaco.languages.typescript.typescriptDefaults.addExtraLib(LIB_ES5_D_LIB, "ts:filename/facts.d.ts");
    monaco.languages.typescript.typescriptDefaults.addExtraLib(LIB_ES5_CORE_LIB, "ts:filename/es2015.core.d.ts");
    monaco.languages.typescript.typescriptDefaults.addExtraLib(LIB_ES2015_PROMISE_LIB, "ts:filename/es2015.promise.d.ts");

    monaco.languages.typescript.typescriptDefaults.addExtraLib(momentdts, 'ts:moment.d.ts')
    let uri = monaco.Uri.parse(libUri)
    if (!monaco.editor.getModel(uri)) {
        monaco.editor.createModel(LIBS, "typescript", uri);
    }

    return monaco.editor.create(document.getElementById(elId)!, {
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
    });
}

onMounted(() => {

    editor = createEditor('editor')
    editorMiddleware = createEditor('middleware-editor')

    cancelSettings()

    watch(() => settings.value.maxMessages, () => {
        settingsChanged.value = true
    })
    watch(() => settings.value.entriesOrder, () => {
        settingsChanged.value = true
    })
    watch(() => settings.value.middlewares, () => {
        settingsChanged.value = true
    })
})

onUnmounted(() => {
    monaco.editor.getModels().forEach(m => {
        m.dispose()
    })
})

const edit = (id: string) => {
    selectedColumn.value = { ...props.layout.getColumn(id) }
    if (!models[id]) {
        models[id] = monaco.editor.createModel(props.layout.getColumn(id).handlerTsCode!, "typescript", monaco.Uri.parse("ts:" + id + ".ts"))
    }
    loadModel(editor, models[id], 'editor')
}

const save = () => {
    if (!selectedColumn.value) {
        throw new Error("Failed to update")
    }
    selectedColumn.value.handlerTsCode = monaco.editor.getModels().find(m => {
        return m.uri.toString() === "ts:" + selectedColumn.value!.id + ".ts"
    })!.getValue()
    emit('edit', selectedColumn.value)
    selectedColumn.value = undefined
}

const saveSettings = () => {
    emit('settings-update', { ...settings.value! })
}

const cancelSettings = () => {
    cancelMiddleware()
    settings.value = JSON.parse(JSON.stringify(props.layout.settings))
    setTimeout(() => { settingsChanged.value = false }, 10)
}

const loadModel = (editor: monaco.editor.IStandaloneCodeEditor, model: monaco.editor.ITextModel, elId: string) => {
    editor.setModel(model)
    const lc = model.getLineCount()
    let newh = (lc > 20 ? 20 : lc) * 18
    editor.layout({
        width: document.getElementById(elId)!.clientWidth,
        height: newh
    })
    editor.getAction('editor.action.formatDocument')!.run();

    editor.getModel()?.onDidChangeContent(_ => {
        const lc = model.getLineCount()
        let newh = (lc > 20 ? 20 : lc) * 18
        editor.layout({
            width: document.getElementById(elId)!.clientWidth,
            height: newh
        })
    })
}

const add = () => {
    selectedColumn.value = {
        id: "new",
        name: "",
        handlerTsCode: "",
        faceted: false
    }

    if (!models['new']) {
        models['new'] = monaco.editor.createModel(EMPTY_COL, "typescript", monaco.Uri.parse("ts:new.ts"))
    }

    loadModel(editor, models['new'], 'editor')
}

const autoGenerate = () => {
    console.log(props.sampleLine)
    if (!props.sampleLine) {
        return
    }

    Object.keys(props.sampleLine.json_content).forEach(k => {
        let col = {
            id: "new",
            name: "column " + k.toString(),
            handlerTsCode: `(line: Message): CellHandler => {
    return { text: line.json_content['${k.toString()}'] }
}`
        }
        emit('edit', col)
        console.log('Column auto generated', k, col)
    })
}

const toggleColumnFaceted = (colId: string) => {
    selectedColumn.value = { ...props.layout.getColumn(colId) }
    selectedColumn.value.faceted = !selectedColumn.value.faceted
    emit('edit', selectedColumn.value)
    selectedColumn.value = undefined
}

const toggleView = (colId: string) => {
    selectedColumn.value = { ...props.layout.getColumn(colId) }
    selectedColumn.value.hidden = !selectedColumn.value.hidden
    emit('edit', selectedColumn.value)
    selectedColumn.value = undefined
}

const removeCol = (colId: string) => {
    emit('remove', colId)
}

const editMiddleware = (id: string) => {
    let m = settings.value.middlewares.find(m => m.id === id)
    if (!m) {
        throw new Error('Not found')
    }
    selectedMiddleware.value = { ...m }
    if (!models[id]) {
        models[id] = monaco.editor.createModel(m?.handlerTsCode!, "typescript", monaco.Uri.parse("ts:" + id + ".ts"))
    }
    loadModel(editorMiddleware, models[id], 'middleware-editor')
}

const removeMiddleware = (mid: string) => {
    settingsChanged.value = true
    delete models[mid]
    let idx = settings.value.middlewares.findIndex(m => m.id === mid)

    settings.value.middlewares.splice(idx, 1)
}

const saveMiddleware = () => {
    settingsChanged.value = true
    selectedMiddleware.value!.handlerTsCode = monaco.editor.getModels().find(m => {
        return m.uri.toString() === "ts:" + selectedMiddleware.value!.id + ".ts"
    })!.getValue()

    let idx = settings.value.middlewares.findIndex(m => m.id === selectedMiddleware.value?.id)

    if (idx >= 0) {
        settings.value.middlewares[idx] = { ...selectedMiddleware.value! }
    } else {
        settings.value.middlewares.push({ ...selectedMiddleware.value! })
    }
    cancelMiddleware()
}

const cancelMiddleware = () => {
    selectedMiddleware.value = undefined
}
const addMiddleware = () => {
    let id = "m_" + Math.random().toString().substring(2, 8)
    selectedMiddleware.value = {
        id,
        name: "",
        handlerTsCode: ""
    }

    if (!models[id]) {
        models[id] = monaco.editor.createModel(EMPTY_MIDDLEWARE, "typescript", monaco.Uri.parse("ts:" + id + ".ts"))
    }

    loadModel(editorMiddleware, models[id], 'middleware-editor')
}

</script>

<template>
    <div class="drawer">
        <div class="inner-drawer">
            <div class="header">
                <button class="btn" style="padding:0.6em; margin-right:3px;" @click="themeHandler.toggleTheme()">
                    <Sun v-if="themeHandler.theme.value === 'dark'" />
                    <Moon v-if="themeHandler.theme.value === 'light'" />
                </button>
                <button @click="$emit('close')">Close</button>
            </div>

            <div class="settings" v-if="settings && !selectedColumn">
                <h2>Settings
                    <button class="btn-sm" @click="useMainStore().modalShow = 'import'">Export / import</button>
                </h2>
                <div class="block">
                    Order of entries
                    <button class="btn-sm" :disabled="settings.entriesOrder === 'desc'"
                        @click="settings.entriesOrder = 'desc'">Newest at the top</button>
                    <button class="btn-sm" :disabled="settings.entriesOrder === 'asc'"
                        @click="settings.entriesOrder = 'asc'">Newest at the bottom</button>
                </div>
                <div class="block">
                    <div>Maximum number of log messages stored in the browser</div>
                    <div>
                        <input class="input" v-model="settings.maxMessages" type="number" />
                    </div>
                </div>
                <div class="block" style="margin-top: 10px">
                    <span>Middlewares <button class="btn-sm" @click="addMiddleware">Add</button></span>
                    <div v-for="m in settings.middlewares" style="margin:10px 0">
                        {{ m.name }}
                        <button @click="editMiddleware(m.id)" class="btn-sm">Edit</button>
                        <button @click="removeMiddleware(m.id)" class="btn-sm btn-danger">Remove</button>
                    </div>
                    <div v-if="selectedMiddleware">
                        <div>Name</div>
                        <div>
                            <input class="input" v-model="selectedMiddleware.name" type="text" />
                        </div>
                    </div>
                    <div style="margin:10px 0;" :style="{ 'display': !selectedMiddleware ? 'none' : 'block' }"
                        id="middleware-editor"></div>
                    <div v-if="selectedMiddleware">
                        <button @click="saveMiddleware" class="btn-sm">Save middleware</button>
                        <button @click="cancelMiddleware" class="btn-sm">Cancel</button>
                    </div>

                </div>
                <div class="buttons">
                    <button :disabled="!settingsChanged" class="btn-sm" @click="saveSettings">Save settings</button>
                    <button @click="cancelSettings" class="btn-sm">Cancel</button>
                </div>
                <hr />
            </div>
            <div v-if="!selectedColumn" style="margin: 10px 0;">
                <h2>Columns
                    <button class="btn-sm" @click="add">Add</button>
                    <button class="btn-sm" @click="autoGenerate">Auto-generate</button>
                </h2>
            </div>
            <div class="column-edit">
                <div v-if="!selectedColumn" v-for="col, k in layout.columns" :id="'container_' + col.name"
                    style="margin-top:10px" class="col-row">
                    <div class="name">{{ col.name }}</div>
                    <div class="controls">
                        <button @click="edit(col.id)" class="btn-sm">Edit</button>
                        <button @click="toggleView(col.id)" class="btn-sm"
                            :class="{ active: !col.hidden }">Toggle</button>
                        <button @click="toggleColumnFaceted(col.id)" :class="{ 'active': col.faceted }"
                            class="btn-sm">Faceted</button>
                        <button @click="removeCol(col.id)" class="btn-sm btn-danger">Remove</button>
                        <button :disabled="k === 0" @click="$emit('move', col.id, -1)" class="btn-sm">Move up</button>
                        <button :disabled="k === layout.columns.length - 1" @click="$emit('move', col.id, 1)"
                            class="btn-sm">Move
                            down</button>
                    </div>
                </div>
                <div v-if="selectedColumn">
                    <div class="row">
                        <div>Name</div>
                        <div>
                            <input class="input" v-model="selectedColumn.name" type="text" />
                        </div>
                    </div>
                    <div class="row">
                        <div>Column hidden</div>
                        <div>
                            <input v-model="selectedColumn.hidden" type="checkbox" />
                        </div>
                    </div>
                    <div class="row">
                        <div>Column width</div>
                        <div>
                            <input class="input" v-model="selectedColumn.width" type="number" />
                        </div>
                    </div>
                </div>

                <div style="margin:10px 0;" :style="{ 'display': !selectedColumn ? 'none' : 'block' }" id="editor">
                </div>
                <div style="margin-top:10px" v-if="selectedColumn">
                    <button @click="save()">Save</button>
                    <button @click="selectedColumn = undefined">Cancel</button>
                </div>
            </div>
            <div class="sample-line">
                <hr />
                <h2>Sample line preview
                    <button class="btn-sm" @click="sampleLineVisible = !sampleLineVisible">Toggle sample line</button>
                    <button class="btn-sm" v-if="sampleLineVisible" @click="$emit('update-sample-line')">Change
                        line</button>

                </h2>
                <div v-if="sampleLineVisible">
                    <div v-if="sampleLine">
                        <h4>Field: content</h4>
                        <pre>{{ sampleLine?.content }}</pre>
                        <h4>Field: is_json</h4>
                        <pre>{{ sampleLine?.is_json }}</pre>
                        <h4>Field: json_content</h4>
                        <pre>
                            <VueJsonPretty :theme="'dark'" :data="sampleLine?.json_content"></VueJsonPretty>
                        </pre>
                    </div>
                    <div v-else>
                        <pre>No sample line provided</pre>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
hr {
    opacity: 0.1;
}

.drawer {
    position: fixed;
    right: 0;
    top: 0;
    width: 900px;
    height: calc(100vh - 22px);
    background: var(--hl-bg);
    z-index: 999;
    opacity: 0.97;
    padding: 10px;

    h4 {
        margin: 2px;
    }

    .settings {
        .buttons {
            margin-top: 10px;

            button {
                margin-right: 5px;
            }
        }

        .block {
            border-bottom: 1px solid rgba(255, 255, 255, .1);
            padding-bottom: 8px;
            margin-bottom: 8px;
        }
    }

    .column-edit {
        button {
            margin-right: 5px;
        }
    }

    .input {
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

    .col-row {
        display: flex;

        .name {
            width: 200px;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
        }
    }

    .inner-drawer {
        margin-top: 10px;
        height: calc(100% - 15px);
        overflow-y: scroll;

        .header {
            width: 100%;
            text-align: right;
        }
    }

    pre {
        margin: 6px 0;
        background: var(--hl-bg2);
        padding: 10px;
        white-space: pre-wrap;
    }

}

.btn-sm {
    padding: 4px 6px;
    margin-right: 4px;
    border-radius: 4px;
    font-size: 12px;

    &.active {
        color: rgba(255, 255, 255, .3)
    }

    &.grey {
        color: rgba(255, 255, 255, .5)
    }
}
</style>