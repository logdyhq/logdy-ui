<script lang="ts" setup>
import { useMainStore } from '../store';
import { themeHandler } from '../theme';
import StatusIndicator from "./StatusIndicator.vue"
import Close from './icon/Close.vue'
import Pause from './icon/Pause.vue'
import Play from './icon/Play.vue'
import PlayNext from './icon/PlayNext.vue'
import Sun from './icon/Sun.vue'
import Moon from './icon/Moon.vue'


const store = useMainStore()

const clearAll = () => {
    store.confirm("Are you sure you want to clear all logs?", store.clearAllRows)
}
</script>
<template>
    <div class="ctrls">
        <button :disabled="store.receiveStatus.includes('following')" @click="store.changeReceiveStatus('following_cursor')"
            class="ctrl-btn" v-tooltip="'Resume incoming messages where paused'">
            <Play width="19" height="19" />
        </button>
        <button :disabled="store.receiveStatus.includes('following')" @click="store.changeReceiveStatus('following')"
            class="ctrl-btn" v-tooltip="'Resume incoming messages, starting with the latest (space)'">
            <PlayNext width="19" height="19" />
        </button>
        <button :disabled="store.receiveStatus === 'paused'" @click="store.changeReceiveStatus('paused')" class="ctrl-btn"
            v-tooltip="'Pause incoming messages (space)'">
            <Pause width="19" height="19" />
        </button>
        <button @click="clearAll" class="ctrl-btn" v-tooltip="'Clear all messages'">
            <Close width="19" height="19" />
        </button>
    </div>
    <button v-if="store.receiveStatus == 'paused'">
        Paused at entry #{{ store.receiveCounters.LastDeliveredIdx }} out of {{ store.receiveCounters.MessageCount
        }} ({{ store.receiveCounters.MessageCount - store.receiveCounters.LastDeliveredIdx }} not seen)
    </button>
    <button v-if="store.receiveStatus.includes('following')">
        Following real-time out of {{ store.receiveCounters?.MessageCount }} entries
    </button>
    <StatusIndicator :status="store.status" />
    <button @click="store.settingsDrawer = true">Settings</button>
    <button class="btn" style="padding:0.6em; margin-left:3px;" @click="themeHandler.toggleTheme()">
        <Sun v-if="themeHandler.theme.value === 'dark'" />
        <Moon v-if="themeHandler.theme.value === 'light'" />
    </button>
</template>