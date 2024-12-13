

export const BreserInit = async () => {
    //@ts-expect-error
    const go = new Go();
    const result = await WebAssembly.instantiateStreaming(fetch("/main.wasm"), go.importObject)
    go.run(result.instance)
}

export const BreserSetQuery = (query: string): string | undefined => {
    console.log("Breser query:", query)
    // @ts-expect-error
    let error = GO_EXPR_setExpression(query)
    if (error && error.error) {
        console.log("Error while setting Breser query", error)
        return error.error
    }
}

export const BreserFilterData = (data: object[]) => {
    //@ts-expect-error
    let res = GO_EXPR_runQuery(JSON.stringify(data)) as { result: boolean[], error?: string }
    return res
}