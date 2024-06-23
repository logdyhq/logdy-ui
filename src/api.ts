
class httpClient {

    private headers: { [key: string]: string } = {}
    public onRequestStart: (() => { [key: string]: string } | void) | null = null;
    public onRequestEnd: (() => void) | null = null;

    setHeader(key: string, val: string) {
        this.headers[key] = val;
    }

    setAuthToken(val?: string) {
        if (!val) {
            return
        }
        this.setHeader("logdy-client-id", val)
    }

    async sendGet<T = Record<string, any>>(path: string): Promise<{
        status: number,
        headers: Headers,
        json?: T,
        body?: string
    }> {

        let headers = {}
        if (this.onRequestStart) {
            headers = this.onRequestStart() || {}
        }

        let res = await fetch(window.location.pathname + "api/" + path, {
            method: "GET",
            headers: {
                // "Content-Type": "application/json",
                ...this.headers,
                ...headers
            },
        })

        this.onRequestEnd && this.onRequestEnd()
        return {
            status: res.status,
            headers: res.headers,
            json: res.headers.get('content-type') == 'application/json' ? await res.json() : {},
            body: res.bodyUsed ? "" : await res.text()
        }
    }

    async sendPost<T = Record<string, any>>(path: string, data?: object): Promise<{
        status: number,
        headers: Headers,
        json?: T,
        body?: string
    }> {

        let headers = {}
        if (this.onRequestStart) {
            headers = this.onRequestStart() || {}
        }

        let res = await fetch("api/" + path, {
            method: "POST",
            body: data ? JSON.stringify(data) : null,
            headers: {
                "Content-Type": "application/json",
                ...this.headers,
                ...headers
            },
        })

        this.onRequestEnd && this.onRequestEnd()
        return {
            status: res.status,
            headers: res.headers,
            json: res.headers.get('content-type') == 'application/json' ? await res.json() : {},
            body: res.bodyUsed ? "" : await res.text()
        }
    }

    async resume() {
        await this.sendGet("client/set-status?status=following")
    }

    async resumeFromCursor() {
        await this.sendGet("client/set-status?status=following&from_cursor=true")
    }

    async pause() {
        await this.sendGet("client/set-status?status=stopped")
    }

    async clientStatus() {
        return this.sendGet("client/check-status")
    }

    async peek(offset: number, offsetEnd: number) {
        return this.sendPost("client/peek-log", {
            idxs: [
                offset, offsetEnd
            ]
        })
    }

    async load(offset: number, count: number) {
        return this.sendGet(`client/load?start=${offset + 1}&count=${count}`)
    }

}


export const client = new httpClient