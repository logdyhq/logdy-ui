import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { storageApp, storageLogs } from "./storage";
import { FacetValues, Row } from "./types";
import { Layout } from "./config";
import { useFilterStore } from "./stores/filter";

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
    const facets = ref<FacetValues>({})
    const searchbar = ref<string>("")

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

    const openLogDrawer = (row: Row, delta: number = 0) => {
        closeLogDrawer()

        if (delta !== 0) {
            for (let i = 0; i <= displayRows.value.length; i++) {
                if (displayRows.value[i].id !== row.id) {
                    continue
                }
                row = displayRows.value[i + delta]
                break
            }
        }

        if (!row) {
            return
        }

        if (!row.opened) {
            useFilterStore().changeFilter('read', 1)
            useFilterStore().changeFilter('unread', -1)
        }

        row.open = true;
        row.opened = true;
        drawer.value.row = row;
        storageLogs.update(row.id, { id: row.id, message: row.msg, opened: true, starred: row.starred })
    }

    const closeLogDrawer = () => {
        if (!drawer.value.row) {
            return
        }
        drawer.value.row.open = false
        drawer.value.row.opened = true;
        drawer.value.row = undefined
    }

    const toggleRowMark = (row: Row) => {
        row.starred = !row.starred
        useFilterStore().changeFilter('starred', row.starred ? 1 : -1)
        storageLogs.update(row.id, { id: row.id, message: row.msg, opened: row.opened, starred: row.starred })
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

    const displayRows = computed(() => {
        const selectedFacets: Record<string, string[]> = {}
        for (let i in facets.value) {
            facets.value[i].items.forEach(el => {
                if (el.selected) {
                    if (!selectedFacets[i]) {
                        selectedFacets[i] = []
                    }
                    selectedFacets[i].push(el.label)
                }
            })
        }

        let filters = useFilterStore().enabledFilters
        console.log(filters)
        return rows.value.filter((r, k) => {
            if (filters.length > 0) {
                if (filters.includes('starred') && !r.starred) return false
                if (filters.includes('read') && !r.opened) return false
                if (filters.includes('unread') && r.opened) return false
            }
            if (Object.keys(selectedFacets).length === 0) return true
            let sel = { ...selectedFacets }
            let cnt = Object.keys(sel).length

            r.facets.forEach(f => {
                if (sel[f.name] && sel[f.name].includes(f.value)) {
                    cnt--
                }
            })
            return cnt === 0
        }).filter(r => {
            if (searchbar.value.length < 3) {
                return true
            }

            return (r.msg.content || "").search(new RegExp(searchbar.value, 'i')) >= 0
        })
    })

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

        rows,
        displayRows,

        facets,
        searchbar,

        toggleRowMark
    };
});