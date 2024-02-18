import { Layout } from "./config"
import { storageLayout } from "./storage"
import { useMainStore } from "./store"


export const startDragging = () => {
    document.getElementById("app")?.classList.add('noselect')
    document.addEventListener('mousemove', handleDragging)
}

export const startColumnDragging = (colId: string) => {
    document.getElementById("app")?.classList.add('noselect')
    const signal = new AbortController()
    document.addEventListener('mousemove', (e: MouseEvent) => {
        handleColumnDragging(colId, e)
    }, { signal: signal.signal })

    document.addEventListener('mouseup', () => {
        signal.abort()

        storageLayout.update('main', useMainStore().layout as Layout)
    }, { once: true })
}

export const endDragging = () => {
    document.getElementById("app")?.classList.remove('noselect')
    document.removeEventListener('mousemove', handleDragging)

    storageLayout.update('main', useMainStore().layout as Layout)
}

export const handleColumnDragging = (colId: string, e: MouseEvent) => {
    let col = useMainStore().layout.getColumn(colId)
    if (!col.width) {
        col.width = 150
    }
    col.width += e.movementX
    if (col.width <= 40) {
        col.width = 40
        return
    }
    useMainStore().layout.update(col)
}

export const handleDragging = (e: MouseEvent) => {
    useMainStore().layout.settings.leftColWidth += (e.movementX)
}