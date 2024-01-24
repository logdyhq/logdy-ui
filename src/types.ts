
export type ConnectionStatus = "connected" | "not connected"

export type Settings = {
    maxMessages: number,
    leftColWidth: number
}

export type Message = {
    message_type: number,
    content: string,
    json_content?: any,
    is_json: boolean
}

export type CellHandler = {
    text: string,
    isJson?: boolean,
    style?: object,
    facets?: Facet[]
}


export type Facet = {
    name: string,
    value: string
}

export type FacetItem = { count: number, label: string, selected: boolean }
export type FacetCollection = {
    items: FacetItem[],
    toggled: boolean,
    name: string
}
export type FacetValues = Record<string, FacetCollection>

export type Column = {
    id: string
    name: string,
    idx?: number,
    width?: number
    hidden?: boolean
    handler?: (line: Message) => CellHandler,
    handlerTsCode?: string,
}

export type Row = {
    msg: Message,
    cells: CellHandler[], // these are the columns in the table
    fields: CellHandler[], // these are the fields visible only in the drawer
    facets: Facet[]
}