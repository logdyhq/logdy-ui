<script lang="ts" setup>
import { ConnectionStatus } from "../types"
const props = defineProps<{
    status: ConnectionStatus
}>()
</script>

<template>
    <div class="status">
        <div class="indicator" :class="{ 'connected': props.status === 'connected' }">&nbsp;</div>
        <div class="status-label">
            {{ props.status }}
        </div>
    </div>
</template>

<style lang="scss">
.status {
    padding: 0 5px;
    display: flex;
    align-items: center;

    .indicator {
        margin: 0 5px;
        border-radius: 5px;
        width: 10px;
        height: 10px;
        background: red;
        display: block;

        &.connected {
            background: green;
        }

    }

    .status-label {
        display: block;
    }
}
</style>