<script setup lang="ts">
import { Row } from '../types';
import { Layout } from "../config"
import { ref } from 'vue';
import ArrowUp from './icon/ArrowUp.vue'
import ArrowDown from './icon/ArrowDown.vue'
import Clipboard from './icon/Clipboard.vue'

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
    <div class="drawer" v-if="row">
        <div class="inner-drawer">
            <div class="header">
                <div style="margin-right: 10px;">
                    <ArrowUp /> Next /
                    <ArrowDown /> Prev
                </div>

                <button @click="$emit('close')">Close <kbd>Esc</kbd></button>
            </div>
            <h3>Table columns</h3>
            <div v-for="col, k in layout?.columns.filter(c => !c.hidden)">
                <h4 v-tooltip="'Click to copy'" style="display: inline;" @click="copyToClipboard(row.cells[k].text)">{{
                    col.name }}
                    <Clipboard :class="'clipboard'" />
                </h4>
                <pre v-if="!row.cells[k].isJson">{{ row.cells[k].text }}</pre>
                <pre v-else v-highlightjs><code class="json">{{ JSON.parse(row.cells[k].text) }}</code></pre>
            </div>
            <h3>Non-table fields</h3>
            <div v-for="col, k in layout?.columns.filter(c => c.hidden)">
                <h4 v-tooltip="'Click to copy'" style="display: inline;" @click="copyToClipboard(row.fields[k].text)">{{
                    col.name }}
                    <Clipboard :class="'clipboard'" />
                </h4>
                <pre v-if="!row.fields[k].isJson">{{ row.fields[k].text }}</pre>
                <pre v-else v-highlightjs><code class="json">{{ row.fields[k].text }}</code></pre>
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
                    <pre v-highlightjs><code class="json">{{ row.msg.json_content }}</code></pre>
                </div>
                <div v-if="!row.msg.is_json" class="raw">
                    <h4 v-tooltip="'Click to copy'" style="display: inline;" @click="copyToClipboard(row.msg.content)">
                        Raw message
                        <Clipboard :class="'clipboard'" />
                    </h4>
                    <pre><code>{{ row.msg.content }}</code></pre>
                </div>
                <div v-if="row.msg.origin?.port" class="raw">
                    <h4 v-tooltip="'Click to copy'" style="display: inline;" @click="copyToClipboard(row.msg.origin?.port)">
                        Origin port
                        <Clipboard :class="'clipboard'" />
                    </h4>
                    <pre><code>{{ row.msg.origin?.port }}</code></pre>
                </div>
                <div v-if="row.msg.origin?.file" class="raw">
                    <h4 v-tooltip="'Click to copy'" style="display: inline;" @click="copyToClipboard(row.msg.origin?.file)">
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
    position: fixed;
    right: 0;
    top: 0;
    width: 900px;
    height: calc(100vh - 22px);
    background: var(--hl-bg);
    z-index: 999;
    opacity: 0.97;
    padding: 10px;

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
        margin-top: 10px;
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
        background: #1E1E1E;
        padding: 10px;
        white-space: pre-wrap;
    }

}
</style>