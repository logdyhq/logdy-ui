<script setup lang="ts">
import { ref } from 'vue';
import { Layout } from '../config';

const props = defineProps<{
    layout: Layout
}>()

const emit = defineEmits<{
    (e: 'layout-loaded', layout: Layout): void,
}>()

const copied = ref<boolean>(false)
const imported = ref<string>("")
const importResult = ref<string>("")

const exportLayout = () => {
    return JSON.stringify(props.layout.toObj(), null, '\t')
}

const copy = () => {
    navigator.clipboard.writeText(exportLayout())
    copied.value = true
}

function downloadFile(file: File) {
    // Create a link and set the URL using `createObjectURL`
    const link = document.createElement("a");
    link.style.display = "none";
    link.href = URL.createObjectURL(file);
    link.download = file.name;

    // It needs to be added to the DOM so it can be clicked
    document.body.appendChild(link);
    link.click();

    // To make this work on Firefox we need to wait
    // a little while before removing it.
    setTimeout(() => {
        URL.revokeObjectURL(link.href);
        link.parentNode!.removeChild(link);
    }, 0);
}


const download = () => {
    // Dynamically create a File
    const myFile = new File([exportLayout()], "logdy.json");

    // Download it using our function
    downloadFile(myFile);
}
function importFromFile() {
    let input = document.createElement('input') as HTMLInputElement;
    input.type = 'file';
    input.accept = '.json';
    input.onchange = _ => {
        // you can use this method to get file and perform respective operations
        let file = input.files;
        const reader = new FileReader();
        reader.onload = function () {
            const contents = reader.result;
            importLayout(contents as string)
            // Process the contents of the file
        };
        reader.readAsText(file!.item(0)!)
    };
    input.click();

}

const importFromJson = () => {
    importLayout(imported.value)
}

const importLayout = (data: string) => {
    let l = new Layout('main', { leftColWidth: 300, drawerColWidth: 900, maxMessages: 1000, middlewares: [] })
    l.loadFromObj(JSON.parse(data))
    emit('layout-loaded', l)
}

</script>
<template>
    <div>
        You can export and import UI setting in this view. Only layout (columns, facets) & settings (middlewares) are
        exported (not log messages).
        <h2>Export</h2>
        <button class="btn" @click="copy">Copy to clipboard</button>
        <button class="btn" @click="download">Save as file</button>
        <span v-if="copied">copied</span>
        <hr />
        <h2>Import</h2>
        <textarea rows="5"
            style="width:100%;max-height:200px; overflow: scroll; overflow-x: hidden; margin-bottom: 10px; margin-top: 10px;"
            placeholder="paste JSON here" v-model="imported"></textarea>

        <button class="btn" @click="importFromJson" :disabled="imported.length === 0">Import</button>
        <button class="btn" @click="importFromFile">Import from file</button>
        <br />
        <div class="">{{ importResult }}</div>
    </div>
</template>

<style scoped>
button {
    margin-right: 5px;
}
</style>