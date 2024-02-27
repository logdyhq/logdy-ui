
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

    async sendGet(path: string): Promise<{
        status: number,
        headers: Headers,
        json?: Record<string, any>,
        body?: string
    }> {

        let headers = {}
        if (this.onRequestStart) {
            headers = this.onRequestStart() || {}
        }

        let res = await fetch("/api/" + path, {
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

}


export const client = new httpClient