<script setup lang="ts">
import { useMainStore } from "../store";
import Modal from "./Modal.vue"
</script>

<template>
    <Modal v-if="useMainStore().confirmShow === true" @close="useMainStore().confirmProcess(false)">
        <div class="container">
            <p>{{ useMainStore().confirmMsg || `Are you sure you want to proceed?` }}</p>

            <div>
                <button @click="useMainStore().confirmProcess(true)">Confirm</button>
                <button @click="useMainStore().confirmProcess(false)">Cancel</button>
            </div>
        </div>
    </Modal>
</template>

<style lang="scss">
.container {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    justify-content: center;

    button {
        margin-left: 5px;
    }
}
</style>