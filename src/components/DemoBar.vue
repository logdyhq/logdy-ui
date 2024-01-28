<script setup lang="ts">
defineEmits<{
    (e: 'start'): void,
    (e: 'stop'): void,
    (e: 'add'): void,
}>()
</script>

<template>
    <div class="demo-bar">
        <span>Demo mode</span>
        <button @click="$emit('start')">Start</button>
        <button @click="$emit('stop')">Stop</button>
        <button @click="$emit('add')">Add 100 messages</button>
    </div>
</template>

<style lang="scss">
.demo {
    .top-bar {
        padding-top: 50px !important;
    }

    .layout {
        height: calc(100vh - 116px) !important;
    }
}

.demo-bar {
    position: fixed;
    display: flex;
    align-items: center;
    justify-content: center;
    top: 0;

    width: 100%;
    font-weight: 600;

    height: 40px;
    background: #402c6b;
    border-bottom: 1px solid #583c93;

    span {
        margin-right: 20px;
    }

    button {
        padding: 4px 8px;
        font-size: 12px;
        border-radius: 7px;
        margin-right: 4px;
    }
}
</style>