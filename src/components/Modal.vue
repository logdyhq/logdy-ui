<script setup lang="ts">
defineEmits<{
    (e: 'close'): void,
}>()
</script>

<template>
    <div class="modal">
        <div class="close">
            <button @click="$emit('close')">Close</button>
        </div>
        <slot></slot>
    </div>
    <div class="overlay"></div>
</template>

<style lang="scss" scoped>
.overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: black;
    opacity: 0.5;
    z-index: 9999;
}

.modal {
    position: fixed;
    display: flex;
    flex-direction: column;
    top: 40px;
    left: 50%;
    transform: translate(-50%, 0);
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;

    width: 900px;
    max-height: calc(100% - 100px);
    overflow-y: scroll;
    background: var(--hl-bg);
    z-index: 10000;
    padding: 20px;

    .close {
        text-align: right;
    }
}
</style>