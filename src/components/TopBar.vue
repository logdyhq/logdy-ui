<script lang="ts" setup>
import { useMainStore } from '../store';
import Close from './icon/Close.vue'
import Pause from './icon/Pause.vue'
import Play from './icon/Play.vue'
import PlayNext from './icon/PlayNext.vue'
import Load from './icon/Load.vue'
import Bolt from './icon/Bolt.vue'
import DateModal from '../components/DateModal.vue';
import { ref } from 'vue';
import Cog from './icon/Cog.vue';

const store = useMainStore()
const datepickerVisible = ref<boolean>()

const clearAll = () => {
    store.confirm("Are you sure you want to clear all logs? Logs will be cleared only in the browser, buffered logs will stay untouched.", store.clearAllRows)
}

const updateDates = (range: { from: number, to: number }) => {
    store.datepicker = { ...range }
}

</script>
<template>
    <div style="display:relative; margin-right: 3px;">
        <button @click="datepickerVisible = true" v-html="store.datepickerLabel" style="font-size: 12px;"></button>
        <DateModal v-if="datepickerVisible" @close="datepickerVisible = false" @change="updateDates" />
    </div>
    <div class="ctrls">
        <button :disabled="store.receiveStatus.includes('following')"
            @click="store.changeReceiveStatus('following_cursor')" class="ctrl-btn"
            v-tooltip="'Resume incoming messages where paused'">
            <Play width="19" height="19" />
        </button>
        <button :disabled="store.receiveStatus.includes('following')" @click="store.changeReceiveStatus('following')"
            class="ctrl-btn" v-tooltip="'Resume incoming messages, starting with the latest (space)'">
            <PlayNext width="19" height="19" />
        </button>
        <button :disabled="store.receiveStatus === 'paused'" @click="store.changeReceiveStatus('paused')"
            class="ctrl-btn" v-tooltip="'Pause incoming messages (space)'">
            <Pause width="19" height="19" />
        </button>
        <button :disabled="store.receiveStatus !== 'paused'" @click="useMainStore().modalShow = 'load-logs'"
            class="ctrl-btn" v-tooltip="'Load logs. Connection: ' + store.status + ' Status: ' + store.statusStr">
            <Load width="19" height="19" />
            <Bolt :disabled="store.status === 'not connected'" :fill="store.status === 'connected' ? 'green' : 'red'"
                :size="'19'" />
        </button>
        <button @click="clearAll" class="ctrl-btn" v-tooltip="'Clear all messages'">
            <Close width="19" height="19" />
        </button>
    </div>
    <button @click="store.settingsDrawer = true" style="padding: 5px 8px">
        <Cog />
    </button>
</template>