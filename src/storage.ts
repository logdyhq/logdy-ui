const APP_PREFIX = 'logdy'

export class Storage<T> {
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
        localStorage.setItem(_id, JSON.stringify(item))
        this.lastInsertAt = k

        this.keys.push(_id)
        return {
            id: _id
        }
    }

    update(id: string, item: T) {
        // console.debug("updating", this.id(id))
        localStorage.setItem(this.id(id), JSON.stringify(item))
    }

    removeAll() {
        for (let i in this.keys) {
            // console.debug("removing all", this.keys[i])
            localStorage.removeItem(this.keys[i])
        }
        this.keys = []
    }

    removeFirst() {
        let id = this.keys[0]
        this.keys.splice(0, 1)
        // console.debug("removing first", id)
        localStorage.removeItem(id)
    }
}

export const storageApp = new Storage<{
    password?: string
}>('app')