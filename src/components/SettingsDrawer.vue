<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { Layout } from "../config"
import * as monaco from 'monaco-editor';

import jsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import { Column } from "../types";
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

const LIBS = `
    type Message = {
        log_type: number,
        content: string,
        json_content?: any,
        is_json: boolean
    }

    type CellHandler = {
        text: string,
        isJson?: boolean,
        style?: object,
        facets?: Facet[]
    }
    
    type Facet = {
        name: string,
        value: string
    }
    `

let editor: monaco.editor.IStandaloneCodeEditor;
let models: Record<string, monaco.editor.ITextModel> = {};

let selectedColumn = ref<Column>()

const props = defineProps<{
    layout: Layout
}>()


const emit = defineEmits<{
    (e: 'close'): void
    (e: 'edit', column: Column): void
    (e: 'remove', columnId: string): void
    (e: 'move', columnId: string, diff: number): void
}>()

onMounted(() => {
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

    editor = monaco.editor.create(document.getElementById('editor')!, {
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
    });

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
    loadModel(models[id])
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

const loadModel = (model: monaco.editor.ITextModel) => {
    editor.setModel(model)
    const lc = model.getLineCount()
    let newh = (lc > 20 ? 20 : lc) * 18
    editor.layout({
        width: document.getElementById('editor')!.clientWidth,
        height: newh
    })
    editor.getAction('editor.action.formatDocument')!.run();

    editor.getModel()?.onDidChangeContent(_ => {
        const lc = model.getLineCount()
        let newh = (lc > 20 ? 20 : lc) * 18
        editor.layout({
            width: document.getElementById('editor')!.clientWidth,
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

    loadModel(models['new'])
}

const removeCol = (colId: string) => {
    emit('remove', colId)
}

</script>

<template>
    <div class="drawer">
        <div class="inner-drawer">
            <div class="header">
                <button @click="$emit('close')">Close</button>
            </div>
            <div v-if="!selectedColumn" style="margin: 10px 0;">
                <button @click="add">Add new column</button>
            </div>
            <div>
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