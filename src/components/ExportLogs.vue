<script setup lang="ts">
import { ref } from 'vue';
import { Row } from '../types';
import { Layout } from '../config';

const props = defineProps<{
    rows: Row[],
    visibleRows: Row[],
    layout: Layout
}>()

const onlyVisible = ref<boolean>(true)
const format = ref<"json" | "csv">("json")
const content = ref<"columns" | "full">("full")

function convertToCSV(arr: any[]) {
    const array = [Object.keys(arr[0])].concat(arr)

    return array.map(it => {
        return Object.values(it).map(s => `"${s.replace(/"/g, '\"')}"`).toString()
    })
}

const exportFile = () => {
    let rows = onlyVisible.value ? props.visibleRows : props.rows
    let contents = rows.map(r => {
        let obj: any = {}
        props.layout.columns.filter(c => !c.hidden).forEach((c, k) => {
            obj[c.name] = r.cells[k].text
        })

        if (content.value === 'full') {
            props.layout.columns.filter(c => c.hidden).forEach((c, k) => {
                obj[c.name] = r.fields[k].text
            })
        }
        return obj
    })
    let text = format.value === 'json' ? contents.map(c => JSON.stringify(c)) : convertToCSV(contents)
    const myFile = new File([text.join("\n")], "logdy-messages." + format.value);

    downloadFile(myFile)
}

function downloadFile(file: File) {
    const link = document.createElement("a");
    link.style.display = "none";
    link.href = URL.createObjectURL(file);
    link.download = file.name;

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
        URL.revokeObjectURL(link.href);
        link.parentNode!.removeChild(link);
    }, 0);
}

</script>

<template>
    <div>
        <input type="checkbox" v-model="onlyVisible" /> <label>Export only visible (filtered)</label><br />
        <small>If you uncheck this, all messages will be exported</small>
    </div>
    <p>Format</p>
    <div>
        <input type="radio" v-model="format" value="json" /> <label>JSON</label><br />
        <input type="radio" v-model="format" value="csv" /> <label>CSV</label>
    </div>
    <p>Contents</p>
    <div>
        <input type="radio" v-model="content" value="columns" /> <label>Only columns</label><br />
        <input type="radio" v-model="content" value="full" /> <label>Full row</label>
    </div>
    <br />
    <button class="btn" @click="exportFile">Export</button>
</template>

<style lang="scss"></style>