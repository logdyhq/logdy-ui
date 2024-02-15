import { defineStore } from "pinia";
import { ref } from "vue";
import { storageApp } from "./storage";

export interface Notification {
    id?: string;
    timeout?: number;
    msg: string;
    type?: "info" | "error" | "warning" | "success"
}

export interface InitSettings {
    received: boolean;
    analyticsEnabled: boolean;
    authRequired: boolean;
}

export const useMainStore = defineStore("main", () => {

    const demoMode = ref<boolean>(
        document.location.host.indexOf('demo') >= 0 ||
        document.location.search.indexOf('demo') >= 0
    )
    const demoStatus = ref<"started" | "stopped">("started")
    const demoContent = ref<"json" | "string">("json")

    const confirmMsg = ref<string>("");
    const confirmShow = ref<boolean>(false);

    const status = ref<"connected" | "not connected">("not connected")
    const anotherTab = ref<boolean>(false)
    const modalShow = ref<"" | "auth" | "import">("")
    const password = ref<string>("")

    const initSettings = ref<InitSettings>()

    let confirmFn: (() => void) | null = null;

    const setPassword = (pass: string, store: boolean = true) => {
        password.value = pass
        if (store) {
            storageApp.add({ password: pass }, "main")
        }
    }

    const getPassword = (): string => {
        if (!password.value) {
            password.value = storageApp.getOne("main")?.password || ""
        }
        return password.value
    }

    const confirm = (msg: string, fn: () => void) => {
        confirmMsg.value = msg
        confirmShow.value = true
        confirmFn = fn
    }

    const confirmProcess = async (confirm: boolean) => {
        if (confirm && confirmFn) {
            await confirmFn()
        }
        confirmFn = null
        confirmMsg.value = ""
        confirmShow.value = false
    }

    const channel = new BroadcastChannel('tab-activity');

    setInterval(() => {
        channel.postMessage("ping")
    }, 5 * 1000)

    channel.addEventListener('message', (event) => {
        if (event.data === 'ping') {
            channel.postMessage('pong')
        }

        if (!anotherTab.value) {
            confirm("We have detected Logdy opened in another tab. Currently we do not support multiple tabs", () => {
                anotherTab.value = false
            })
        }
        anotherTab.value = true
    });

    return {
        confirm,
        confirmShow,
        confirmMsg,
        confirmProcess,

        demoMode,
        demoStatus,
        demoContent,
        status,

        initSettings,
        anotherTab,
        modalShow,

        setPassword,
        getPassword
    };
});