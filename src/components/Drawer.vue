<script setup lang="ts">
import { Row } from '../types';
import { Layout } from "../config"
import { ref } from 'vue';
import ArrowUp from './icon/ArrowUp.vue'
import ArrowDown from './icon/ArrowDown.vue'
import Clipboard from './icon/Clipboard.vue'
import { startDraggingDrawer } from '../dragging';
import { useMainStore } from '../store';
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';

withDefaults(defineProps<{
    row?: Row,
    layout?: Layout
}>(), {})

const showRaw = ref<boolean>(false)

defineEmits<{
    (e: 'close'): void
}>()

const copyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value)
}

</script>

<template>
    <div class="drawer" v-if="row" :style="{ width: useMainStore().layout.settings.drawerColWidth + 'px' }">
        <div class="resize-handle" @mousedown="startDraggingDrawer"></div>
        <div class="inner-drawer">
            <div class="header">
                <div style="margin-right: 10px;">
                    <ArrowUp /> Next /
                    <ArrowDown /> Prev
                </div>

                <button @click="$emit('close')">Close <kbd>Esc</kbd></button>
            </div>
            <div>
                <button @click="useMainStore().filterCorrelated(row.msg)" :disabled="!row.msg.correlation_id">
                    Display correlated lines
                </button>
                <button @click="useMainStore().resetCorrelationFilter()" v-if="useMainStore().correlationFilter"
                    style="margin-left: 5px">
                    Reset correlation filter
                </button>
            </div>
            <hr />
            <h3>Table columns</h3>
            <div v-for="col, k in layout?.columns.filter(c => !c.hidden)">
                <h4 v-tooltip="'Click to copy'" style="display: inline;" @click="copyToClipboard(row.cells[k].text)">{{
        col.name }}
                    <Clipboard :class="'clipboard'" />
                </h4>
                <pre v-if="!row.cells[k].isJson">{{ row.cells[k].text }}</pre>
                <pre v-else>
                    <VueJsonPretty  :theme="'dark'" :data="JSON.parse(row.cells[k].text)"></VueJsonPretty>
                </pre>

            </div>
            <h3>Non-table fields</h3>
            <div v-for="col, k in layout?.columns.filter(c => c.hidden)">
                <h4 v-tooltip="'Click to copy'" style="display: inline;" @click="copyToClipboard(row.fields[k].text)">{{
        col.name }}
                    <Clipboard :class="'clipboard'" />
                </h4>
                <pre v-if="!row.fields[k].isJson">{{ row.fields[k].text }}</pre>
                <pre v-else>
                    <VueJsonPretty  :theme="'dark'" :data="row.fields[k].text"></VueJsonPretty>
                </pre>
            </div>
            <hr />
            <button @click="showRaw = !showRaw">Show/hide raw message</button>
            <div v-if="showRaw">
                <div v-if="row.msg.is_json">
                    <h4 v-tooltip="'Click to copy'" style="display: inline;"
                        @click="copyToClipboard(JSON.stringify(row.msg.json_content))">
                        Raw message (JSON)
                        <Clipboard :class="'clipboard'" />
                    </h4>
                    <pre>
                        <VueJsonPretty  :theme="'dark'" :data="row.msg.json_content"></VueJsonPretty>
                    </pre>
                </div>
                <div v-if="!row.msg.is_json" class="raw">
                    <h4 v-tooltip="'Click to copy'" style="display: inline;" @click="copyToClipboard(row.msg.content)">
                        Raw message
                        <Clipboard :class="'clipboard'" />
                    </h4>
                    <pre><code>{{ row.msg.content }}</code></pre>
                </div>
                <div v-if="row.msg.timing" class="raw">
                    <h4 v-tooltip="'Click to copy'" style="display: inline;"
                        @click="copyToClipboard(JSON.stringify(row.msg.timing))">
                        Timing
                        <Clipboard :class="'clipboard'" />
                    </h4>
                    <pre>
                        <VueJsonPretty  :theme="'dark'" :data="row.msg.timing"></VueJsonPretty>
                    </pre>
                </div>
                <div v-if="row.msg.origin?.port" class="raw">
                    <h4 v-tooltip="'Click to copy'" style="display: inline;"
                        @click="copyToClipboard(row.msg.origin?.port)">
                        Origin port
                        <Clipboard :class="'clipboard'" />
                    </h4>
                    <pre><code>{{ row.msg.origin?.port }}</code></pre>
                </div>
                <div v-if="row.msg.origin?.file" class="raw">
                    <h4 v-tooltip="'Click to copy'" style="display: inline;"
                        @click="copyToClipboard(row.msg.origin?.file)">
                        Origin filename
                        <Clipboard :class="'clipboard'" />
                    </h4>
                    <pre><code>{{ row.msg.origin?.file }}</code></pre>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.drawer {
    right: 0;
    top: 0;
    height: calc(100vh - 73px);
    background: var(--hl-bg);
    z-index: 999;
    opacity: 0.97;
    padding: 10px;
    padding-left: 0px;
    padding-top: 0;

    .resize-handle {
        background: white;
        width: 3px;
        opacity: 0.2;
        cursor: ew-resize;
        height: 100%;
        float: left;
        margin-right: 10px;
    }

    h4,
    h3 {
        margin: 2px;
        cursor: pointer;

        .clipboard {
            visibility: hidden;
        }

        &:hover {
            .clipboard {
                visibility: visible !important;
            }
        }
    }

    .inner-drawer {
        padding-top: 20px;
        height: calc(100% - 15px);
        overflow-y: scroll;


        .header {
            display: flex;
            align-items: center;
            float: right;
        }
    }

    pre {
        margin: 6px 0;
        background: var(--bg);
        padding: 10px;
        white-space: pre-wrap;
    }

}
</style>