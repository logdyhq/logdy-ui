<script setup lang="ts">
import moment, { DurationInputArg2 } from 'moment';
import { onMounted, Ref, ref } from 'vue';
import { useMainStore } from '../store';

const emit = defineEmits<{
    (e: 'close'): void,
    (e: 'change', range: { from: number, to: number }): void
}>()

type Period = "5_m" | "15_m" | "30_m" | "1_h" | "4_h" | "1_d"

const changePeriod = (period?: Period) => {
    if (!period) {
        emit("change", {
            from: 0,
            to: 0
        })
        emit("close")
    } else {
        let splitted = period.split("_")
        from.value = moment().subtract(parseInt(splitted[0]), splitted[1] as DurationInputArg2).format().slice(0, 19)
    }
}

const from = ref<string | undefined>()
const to = ref<string | undefined>()

onMounted(() => {
    const store = useMainStore()

    if (store.datepicker.from) {
        from.value = moment(store.datepicker.from * 1000).format().slice(0, 19)
    }
    if (store.datepicker.to) {
        to.value = moment(store.datepicker.to * 1000).format().slice(0, 19)
    }
})

const setToNow = (r: "from" | "to") => {
    switch (r) {
        case 'from':
            from.value = moment().format().slice(0, 19)
            break
        case 'to':
            to.value = moment().format().slice(0, 19)

    }
}

const submitDates = (close?: boolean) => {
    emit("change", {
        from: moment(from.value).unix(),
        to: to.value ? moment(to.value).unix() : 0
    })
    if (close) {
        emit("close")
    }
}

</script>
<template>
    <div class="modal">
        <div class="date-picker">
            <span style="margin-bottom:5px">Pick from:</span>
            <div>
                <input type="datetime-local" step="1" class="date-from" v-model="from" />
                <button class="btn-sm" @click="setToNow('from')" style="margin-left:4px; margin-right: 0;">Now</button>
            </div>
            <div>
                <button class="btn-sm" @click="changePeriod('5_m')">Past 5 minutes</button>
                <button class="btn-sm" @click="changePeriod('15_m')">Past 15 minutes</button>
                <button class="btn-sm" @click="changePeriod('30_m')">Past 30 minutes</button>
                <button class="btn-sm" @click="changePeriod('1_h')">Past 1 hour</button>
                <button class="btn-sm" @click="changePeriod('4_h')">Past 4 hours</button>
                <button class="btn-sm" @click="changePeriod('1_d')">Past 1 day</button>
            </div>
            <hr style="width:100%" />
            <span style="margin-bottom:5px">Pick to:</span>
            <div>
                <input type="datetime-local" step="1" v-model="to" />
                <button class="btn-sm" @click="setToNow('to')" style="margin-left:4px; margin-right: 0;">Now</button>
            </div>
            <hr style="width:100%" />
            <div style="margin-top:7px">
                <button class="btn-sm" @click="submitDates()">Submit</button>
                <button class="btn-sm" @click="submitDates(true)">Submit and close</button>
                <button class="btn-sm" @click="changePeriod()">Clear</button>
            </div>
        </div>
    </div>
    <div class="overlay" @click="$emit('close')"></div>
</template>

<style lang="scss" scoped>
.overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9999;
}

.modal {
    position: absolute;
    display: flex;
    flex-direction: column;
    transform: translate(-50%, 0);
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;

    width: 250px;
    max-height: calc(100% - 100px);
    overflow-y: scroll;
    background: var(--hl-bg);
    z-index: 10000;
    padding: 20px;

    .date-picker {

        display: flex;
        flex-direction: column;

        .date-from {
            margin-bottom: 10px;
        }

        span.picker {
            cursor: pointer;
            padding: 3px;

            &:hover {
                background: rgba(255, 255, 255, 0.1);
            }
        }
    }
}
</style>