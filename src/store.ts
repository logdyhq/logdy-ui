import { defineStore } from "pinia";
import { ref } from "vue";
import { storageApp, storageLogs } from "./storage";
import { Row } from "./types";
import { Layout } from "./config";

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

    // this will hold a Layout JSON to load from the backend
    configStr: string;
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
    const modalShow = ref<"" | "auth" | "import" | "export-logs">("")
    const password = ref<string>("")
    const stickedToBottom = ref<boolean>(false)
    const rows = ref<Row[]>([])

    const initSettings = ref<InitSettings>()

    const drawer = ref<{
        row?: Row,
        idx?: number
    }>({})

    const layout = ref<Layout>(new Layout('main', { leftColWidth: 300, maxMessages: 1000, middlewares: [] }))

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

    const openLogDrawer = (k: number) => {

        if (!rows.value[k]) {
            return
        }

        closeLogDrawer()
        let row = rows.value[k]
        row.open = true;
        drawer.value.row = row;
        drawer.value.idx = k
        storageLogs.update(row.id, { id: row.id, message: row.msg, opened: true })
    }

    const closeLogDrawer = () => {
        if (!drawer.value.row) {
            return
        }
        drawer.value.row.open = false
        drawer.value.row.opened = true;
        drawer.value.row = undefined
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
        getPassword,

        stickedToBottom,

        drawer,
        openLogDrawer,
        closeLogDrawer,

        layout,

        rows
    };
});