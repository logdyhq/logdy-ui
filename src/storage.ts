import { Layout } from "./config";
import { StoredMessage } from "./types";

const APP_PREFIX = 'logdy'

export class Storage<T extends { id?: string }> {
    private lastInsertAt: string = "";
    private sameInserts: number = 0;

    private keys: string[] = [];

    constructor(private prefix: string) {
    }

    clear() {
        this.lastInsertAt = ""
        this.sameInserts = 0;
        this.keys = []
    }

    startClearingUnknowns() {
        setInterval(() => {
            this.clearUnknown()
        }, 10 * 1000)
    }

    clearUnknown() {
        for (let i in localStorage) {
            if (this.doesBelong(i) && !this.keys.includes(i)) {
                // console.debug('removing item', i)
                localStorage.removeItem(i)
            }
        }
    }

    private doesBelong(key: string): boolean {
        return key.startsWith(APP_PREFIX + '_' + this.prefix + '_')
    }

    private id(id: string): string {
        return APP_PREFIX + '_' + this.prefix + '_' + id
    }

    load(): T[] {
        this.clear()
        for (let i in localStorage) {
            if (!this.doesBelong(i)) {
                continue
            }

            this.lastInsertAt = i
            this.keys.push(i)
        }

        return this.keys.sort().map(k => {
            return JSON.parse(localStorage.getItem(k)!) as T
        })
    }

    count(): number {
        let c = 0
        for (let i in localStorage) {
            if (!this.doesBelong(i)) {
                continue
            }
            c++
        }

        return c
    }

    getOne(id: string): T | undefined {
        let item = localStorage.getItem(this.id(id))
        return item ? JSON.parse(item) : undefined
    }

    add(item: T, id?: string): { id: string } {
        let k = (new Date()).getTime().toString()
        if (k === this.lastInsertAt) {
            k = k + "." + (++this.sameInserts).toString()
        }
        let _id = this.id(id || k)
        item.id = _id;
        localStorage.setItem(_id, JSON.stringify(item))
        this.lastInsertAt = k

        this.keys.push(_id)
        return {
            id: k.toString()
        }
    }

    update(id: string, item: T) {
        // console.debug("updating", this.id(id))
        localStorage.setItem(this.id(id), JSON.stringify(item))
    }

    upsert(id: string, item: T) {
        if (typeof item !== 'object') {
            throw new Error("upsert is only available for objects")
        }

        let doc = this.getOne(id)

        if (doc) {
            this.update(id, { ...doc, ...item })
        } else {
            this.add(item, id)
        }
    }

    remove(id: string) {
        let _id = this.id(id)
        localStorage.removeItem(_id)
        let idx = this.keys.indexOf(_id)
        this.keys.splice(idx, 1)
    }

    removeAll() {
        for (let i in this.keys) {
            // console.debug("removing all", this.keys[i])
            localStorage.removeItem(this.keys[i])
        }
        this.keys = []
    }

    removeFirst() {
        localStorage.removeItem(this.keys[0])
        this.keys.splice(0, 1)
        // console.debug("removing first", id)
    }
}

export const storageApp = new Storage<{
    id?: string,
    password?: string
}>('app')

export const storageLogs = new Storage<StoredMessage>('logs')

export const storageLayout = new Storage<Layout>('layout')