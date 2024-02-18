<script setup lang="ts">
import { Row } from '../types';
import { Layout } from "../config"
import { ref } from 'vue';
import ArrowUp from './icon/ArrowUp.vue'
import ArrowDown from './icon/ArrowDown.vue'

withDefaults(defineProps<{
    row?: Row,
    layout?: Layout
}>(), {})

const showRaw = ref<boolean>(false)

defineEmits<{
    (e: 'close'): void
}>()

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
                <h4>{{ col.name }}</h4>
                <pre v-if="!row.cells[k].isJson">{{ row.cells[k].text }}</pre>
                <pre v-else v-highlightjs><code class="json">{{ JSON.parse(row.cells[k].text) }}</code></pre>
            </div>
            <h3>Non-table fields</h3>
            <div v-for="col, k in layout?.columns.filter(c => c.hidden)">
                <h4>{{ col.name }}</h4>
                <pre v-if="!row.fields[k].isJson">{{ row.fields[k].text }}</pre>
                <pre v-else v-highlightjs><code class="json">{{ row.fields[k].text }}</code></pre>
            </div>
            <hr />
            <button @click="showRaw = !showRaw">Show/hide raw message</button>
            <div v-if="showRaw">
                <div v-if="row.msg.is_json">
                    <h3>Raw message (JSON)</h3>
                    <pre v-highlightjs><code class="json">{{ row.msg.json_content }}</code></pre>
                </div>
                <div v-if="!row.msg.is_json" class="raw">
                    <h3>Raw message</h3>
                    <pre><code>{{ row.msg.content }}</code></pre>
                </div>
                <div v-if="row.msg.origin?.port" class="raw">
                    <h3>Origin port</h3>
                    <pre><code>{{ row.msg.origin?.port }}</code></pre>
                </div>
                <div v-if="row.msg.origin?.file" class="raw">
                    <h3>Origin filename</h3>
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

    h4 {
        margin: 2px;
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