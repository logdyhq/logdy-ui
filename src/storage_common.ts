import { Storage } from "./storage";

interface CommonStorage {
    id?: string
    updateBarVersionSeen?: string // which version the user acknowledged
    updateBarShowAfter?: number //a UNIX timestamp after which the banner can be displayed next time
}

class CommonStorageImpl {

    private storage: Storage<CommonStorage>;

    constructor() {
        this.storage = new Storage<CommonStorage>('common')
    }

    private ID = "main_id"

    get(): CommonStorage {
        let st = this.storage.getOne(this.ID)

        if (!st) {
            this.storage.upsert(this.ID, {})
        } else {
            return st
        }

        return {}
    }

    save(item: CommonStorage) {
        this.storage.update(this.ID, item)
    }
}

export const storageCommon = new CommonStorageImpl()