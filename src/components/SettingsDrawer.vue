<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { Layout } from "../config"
import * as monaco from 'monaco-editor';

import jsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import { Column, Settings, Middleware } from "../types";
import { momentdts } from "../moment.lib.ts";

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
    is_json: boolean
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
    facets?: Facet[]
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
let selectedMiddleware = ref<Middleware>()
let settings = ref<Settings>({ leftColWidth: 200, maxMessages: 1000, middlewares: [] })

const props = defineProps<{
    layout: Layout,
}>()

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'edit', column: Column): void
    (e: 'settings-update', settings: Settings): void
    (e: 'remove', columnId: string): void
    (e: 'move', columnId: string, diff: number): void
}>()

const createEditor = (elId: string): monaco.editor.IStandaloneCodeEditor => {
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: false,
    });

    // compiler options
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
    });
    const libUri = 'ts:lib.d.ts'

    monaco.languages.typescript.typescriptDefaults.addExtraLib(LIBS, libUri)
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
    emit('settings-update', settings.value!)
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
        handlerTsCode: ""
    }

    if (!models['new']) {
        models['new'] = monaco.editor.createModel(EMPTY_COL, "typescript", monaco.Uri.parse("ts:new.ts"))
    }

    loadModel(editor, models['new'], 'editor')
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
                <button @click="$emit('close')">Close</button>
            </div>

            <div class="settings" v-if="settings && !selectedColumn">
                <div>Maximum number of log messages stored</div>
                <div>
                    <input class="input" v-model="settings.maxMessages" type="number" />
                </div>
                <div style="margin-top: 10px">
                    <hr />
                    <span><strong>Middlewares</strong> <button class="btn-sm" @click="addMiddleware">Add</button></span>
                    <div v-for="m in settings.middlewares" style="margin:10px 0">
                        {{ m.name }}
                        <button @click="editMiddleware(m.id)" class="btn-sm">Edit</button>
                        <button @click="removeMiddleware(m.id)" class="btn-sm">Remove</button>
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
                    <button :disabled="!settingsChanged" @click="saveSettings">Save settings</button>
                    <button @click="cancelSettings">Cancel</button>
                </div>
                <hr />
            </div>
            <div v-if="!selectedColumn" style="margin: 10px 0;">
                <strong>Columns</strong> <button class="btn-sm" @click="add">Add</button>
            </div>
            <div class="column-edit">
                <div v-if="!selectedColumn" v-for="col, k in layout.columns" :id="'container_' + col.name"
                    style="margin-top:10px" class="col-row">
                    <div class="name">{{ col.name }}</div>
                    <div class="controls">
                        <button @click="edit(col.id)" class="btn-sm">Edit</button>
                        <button @click="removeCol(col.id)" class="btn-sm">Remove</button>
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

                <div style="margin:10px 0;" :style="{ 'display': !selectedColumn ? 'none' : 'block' }" id="editor"></div>
                <div style="margin-top:10px" v-if="selectedColumn">
                    <button @click="save()">Save</button>
                    <button @click="selectedColumn = undefined">Cancel</button>
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
    z-index: 999999;
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
        background: #1E1E1E;
        padding: 10px;
        white-space: pre-wrap;
    }

}

.btn-sm {
    padding: 4px 6px;
    margin-right: 4px;
    border-radius: 4px;
    font-size: 12px;
}
</style>../moment.lib.ts