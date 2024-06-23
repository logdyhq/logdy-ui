import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { storageApp, storageLogs } from "./storage";
import { FacetValues, Message, Row, TraceRow } from "./types";
import { Layout } from "./config";
import { useFilterStore } from "./stores/filter";
import { client } from "./api";
import { formatThousands } from "./utils";

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
    apiPrefix: string;

    // this will hold a Layout JSON to load from the backend
    configStr: string;
}

type ReceiveStatus = "paused" | "following" | "following_cursor"

interface ReceiveCounters {
    MessageCount: number,
    MessagesToTail: number,
    LastDeliveredIdx: number
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
    const receiveStatus = ref<ReceiveStatus>("paused")
    const receiveCounters = ref<ReceiveCounters>({ LastDeliveredIdx: 0, MessageCount: 0, MessagesToTail: 0 })
    const anotherTab = ref<boolean>(false)
    const modalShow = ref<"" | "auth" | "import" | "export-logs" | "load-logs" | "feedback">("")
    const password = ref<string>("")
    const stickedToBottom = ref<boolean>(false)
    const rows = ref<Row[]>([])
    const rowsIds = ref<Record<string, boolean>>({})
    const facets = ref<FacetValues>({})
    const searchbar = ref<string>("")
    const settingsDrawer = ref<boolean>(false)
    const correlationFilter = ref<string>("")
    const tracesRows = ref<Record<string, TraceRow>>({})

    const initSettings = ref<InitSettings>()

    const drawer = ref<{
        row?: Row,
        idx?: number
    }>({})

    const layout = ref<Layout>(new Layout('main', { leftColWidth: 300, drawerColWidth: 900, maxMessages: 1000, middlewares: [] }))

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

    const statusStr = computed(() => {
        if (receiveStatus.value === 'paused') {
            return `Paused at entry #${formatThousands(receiveCounters.value.LastDeliveredIdx + 1)} out of ${formatThousands(receiveCounters.value.MessageCount)
                } (${formatThousands(receiveCounters.value.MessageCount - receiveCounters.value.LastDeliveredIdx - 1)} not seen)`
        }
        if (receiveStatus.value.includes('following')) {
            return `Following real-time out of ${formatThousands(receiveCounters?.value.MessageCount)} entries`
        }
        return '-'
    })

    const filterCorrelated = (row: Message) => {
        if (!row.correlation_id) {
            return
        }
        correlationFilter.value = row.correlation_id
        refeshFilterCorrelated()
    }

    const refeshFilterCorrelated = () => {
        if (!correlationFilter.value || displayRows.value.length === 0) {
            return
        }

        let traces: Record<string, TraceRow> = {}
        let absStart = displayRows.value[0].msg.timing && displayRows.value[0].msg.timing.start || 0
        let resolution = 1//(end - absStart) / 1000
        displayRows.value.forEach((r) => {
            if (!r.msg.timing) {
                return
            }

            traces[r.id] = {
                id: r.id,
                offset: (r.msg.timing!.start - absStart) / resolution,
                width: (r.msg.timing?.duration || 1) / resolution,
                label: r.msg.timing?.label,
                style: r.msg.timing?.style || {}
            }
        })

        tracesRows.value = traces
    }

    const resetAllFiltersAndFacets = () => {
        useFilterStore().resetToggles()
        clearAllFacets()
    }

    const resetCorrelationFilter = () => {
        correlationFilter.value = ""
    }

    const changeReceiveStatus = async (status: ReceiveStatus) => {
        switch (status) {
            case 'following':
                await client.resume()
                receiveStatus.value = 'following';
                break;
            case 'following_cursor':
                await client.resumeFromCursor()
                receiveStatus.value = 'following_cursor';
                break;
            case 'paused':
                await client.pause()
                receiveStatus.value = 'paused';
                break;
        }
    }

    const clearAllRows = () => {
        rows.value = []
        facets.value = {}
        rowsIds.value = {}
        useFilterStore().reset()
        storageLogs.removeAll()
    }

    const clearRowIds = () => {
        rowsIds.value = {}
    }

    const clearAllFacets = () => {
        for (let i in facets.value) {
            let f = facets.value[i]
            for (let i2 in f.items) {
                facets.value[f.name].items[i2].selected = false
            }
        }
    }

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
        let fileOriginFilter = filters.filter(f => f.startsWith('origin_file_')).length > 0
        let portOriginFilter = filters.filter(f => f.startsWith('origin_port_')).length > 0
        let naOriginFilter = filters.filter(f => f.startsWith('origin_na')).length > 0
        let originFilter = filters.filter(f => f.startsWith('origin_')).length > 0
        return rows.value.filter((r) => {

            if (correlationFilter.value && correlationFilter.value != r.msg.correlation_id) {
                return false;
            }

            let ret = true
            if (filters.length > 0) {
                if (filters.includes('starred') && !r.starred) return false
                if (filters.includes('read') && !r.opened) return false
                if (filters.includes('unread') && r.opened) return false

                if (originFilter) {
                    if (fileOriginFilter && r.msg.origin?.file && filters.includes('origin_file_' + r.msg.origin?.file)) {
                        ret = true
                    } else if (portOriginFilter && r.msg.origin?.port && filters.includes('origin_port_' + r.msg.origin?.port)) {
                        ret = true
                    } else if (naOriginFilter && (!r.msg.origin?.file && !r.msg.origin?.port) && filters.includes('origin_na')) {
                        ret = true
                    } else {
                        ret = false
                    }
                }
            }
            if (!ret) {
                return ret
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
        statusStr,

        receiveStatus,
        receiveCounters,
        changeReceiveStatus,

        initSettings,
        anotherTab,
        modalShow,

        setPassword,
        getPassword,

        stickedToBottom,

        clearAllRows,
        resetAllFiltersAndFacets,
        filterCorrelated,
        correlationFilter,
        resetCorrelationFilter,
        tracesRows,
        refeshFilterCorrelated,

        settingsDrawer,

        drawer,
        openLogDrawer,
        closeLogDrawer,

        layout,

        rows,
        rowsIds,
        clearRowIds,
        displayRows,

        facets,
        searchbar,

        toggleRowMark
    };
});