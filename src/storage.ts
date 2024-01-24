const APP_PREFIX = 'logdy_'

export class Storage<T> {
    private lastInsertAt: string = "";
    private sameInserts: number = 0;

    private keys: string[] = [];

    constructor(private prefix: string) { }

    clear() {
        this.lastInsertAt = ""
        this.sameInserts = 0;
        this.keys = []
    }

    load(): T[] {
        this.clear()
        for (let i in localStorage) {
            if (!i.startsWith(APP_PREFIX + '_' + this.prefix + '_')) {
                continue
            }

            this.lastInsertAt = i
            this.keys.push(i)
        }

        return this.keys.sort().map(k => {
            return JSON.parse(localStorage.getItem(k)!) as T
        })
    }

    add(item: T): { id: string } {
        let k = (new Date()).getTime().toString()
        if (k === this.lastInsertAt) {
            k = k + "." + (++this.sameInserts).toString()
        }
        let id = APP_PREFIX + '_' + this.prefix + '_' + k
        localStorage.setItem(id, JSON.stringify(item))
        this.lastInsertAt = k

        this.keys.push(id)
        return {
            id
        }
    }

    removeAll() {
        for (let i in this.keys) {
            localStorage.removeItem(this.keys[i])
        }
        this.keys = []
    }

    removeFirst() {
        let id = this.keys[0]
        this.keys.splice(0, 1)
        localStorage.removeItem(id)
    }
}