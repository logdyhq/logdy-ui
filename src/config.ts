import { Column, Settings } from "./types"
import ts from "typescript"

export class Layout {
    name: string;
    columns: Column[] = [];

    settings: Settings;

    constructor(name: string, settings: Settings) {
        this.name = name
        this.settings = settings;
    }

    loadFromObj(obj: any) {
        this.name = obj.name
        this.settings = obj.settings
        this.columns = obj.columns.map((c: Column) => {
            return this.prepareColumn(c)
        })
        this.processMiddlewareHandlers()
    }

    toObj(): object {
        return {
            name: this.name, columns: this.columns, settings: this.settings
        }
    }

    removeColumn(id: string) {
        this.columns.splice(this.columns.findIndex(c => c.id === id), 1)
    }

    private prepareColumn(col: Column): Column {
        let transpiled = ts.transpile(`return ` + col.handlerTsCode)
        col.handler = new Function(transpiled)() as any

        return col
    }

    processMiddlewareHandlers() {
        this.settings.middlewares = this.settings.middlewares.map(m => {
            let transpiled = ts.transpile(`return ` + m.handlerTsCode)
            m.handler = new Function(transpiled)() as any
            return m
        })
    }

    private swapElement(indexA: number, indexB: number) {
        var tmp = this.columns[indexA];
        this.columns[indexA] = this.columns[indexB];
        this.columns[indexB] = tmp;
    }

    move(colId: string, diff: number) {
        let idx = this.columns.findIndex(c => c.id === colId)
        let idx2 = diff > 0 ? idx + 1 : idx - 1;
        this.swapElement(idx, idx2)
    }

    add(col: Column) {
        col.idx = this.columns.length === 0 ? 0 : this.columns.length
        col.id = Math.random().toString().substring(2, 8)
        col.width = col.width || 150

        if (col.handlerTsCode) {
            col = this.prepareColumn(col)
        }
        this.columns.push(col)
    }

    update(col: Column) {
        col = this.prepareColumn(col)
        let idx = this.columns.findIndex(c => c.id === col.id)
        this.columns[idx] = col
    }

    getColumn(id: string): Column {
        return this.columns.find(c => c.id === id)!
    }
}