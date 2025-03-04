import { defineStore } from "pinia";
import { ref } from "vue";
import { UpdateResponse, useMainStore } from "../store";
import { storageCommon } from "../storage_common";

const DAY = 1000 * 3600 * 24

export const useNotificationBarStore = defineStore("notification_bar", () => {

    const display = ref<Boolean>(false)
    const updateResponse = ref<UpdateResponse>()

    const processNotification = (resp: UpdateResponse) => {
        updateResponse.value = resp

        let s = useMainStore().initSettings

        if (!s?.updateVersion.checked) {
            return
        }

        if (s.updateVersion.current_version == s.updateVersion.local_version) {
            return
        }

        let stored = storageCommon.get()
        if (stored.updateBarVersionSeen == s.updateVersion.current_version) {
            return
        }

        if (stored.updateBarShowAfter && stored.updateBarShowAfter > new Date().getTime()) {
            return
        }

        display.value = true
    }

    const hide = () => {
        let st = storageCommon.get()
        st.updateBarVersionSeen = updateResponse.value?.current_version
        st.updateBarShowAfter = undefined
        storageCommon.save(st)

        display.value = false
    }
    const remindLater = () => {
        display.value = false
        let st = storageCommon.get()
        st.updateBarShowAfter = new Date().getTime() + (3 * DAY)
        storageCommon.save(st)

    }

    return {
        display,
        processNotification,
        hide,
        remindLater,
        updateResponse
    };
});