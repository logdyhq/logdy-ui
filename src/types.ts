
export type ConnectionStatus = "connected" | "not connected"

export type Settings = {
    maxMessages: number,
    leftColWidth: number,
    middlewares: Middleware[]
}

export type Message = {
    /**
     * Whether a log was produced as STDOUT (=1) or STDERR (=2)
     */
    log_type: number,
    /**
     * Raw content of the log line
     */
    content: string,
    /**
     * If the content is in json format, 
     * this field will be automatically populated with the parsed value
     */
    json_content?: any,
    /**
     * Specifies whether the 'content' field is in json format
     */
    is_json: boolean,
    /**
     * Specifies the origin of the message
     */
    origin?: {
        /**
         * Origin port number
         */
        port: string
        /**
         * Origin file name with path
         */
        file: string
    }
}

export type CellHandler = {
    /**
     * The value that will be presented in the table cell or log drawer
     */
    text: string,
    /**
     * Whether the value is in JSON format
     * if so, a better formatting will be applied in the Log drawer
     */
    isJson?: boolean,
    /** 
     * Special styles that will be applied to a particular cell
     * in the table. For example { "background": "red" }, will make the cell
     * background red.
     */
    style?: object,
    /**
     * A list of Facets that for a particular line
     */
    facets?: Facet[]
}


export type Facet = {
    /**
     * A facet name, will be used to group values under same label
     */
    name: string,
    /**
     * A facet value, will be used to automatically build filters
     */
    value: string
}

type RowHandlerFn = (line: Message) => Message | void

type CellHandlerFn = (line: Message) => CellHandler

export type Middleware = {
    id: string,
    name: string,
    handler?: RowHandlerFn,
    handlerTsCode?: string,
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
    handler?: CellHandlerFn,
    handlerTsCode?: string,
    faceted?: boolean
}

export type Row = {
    msg: Message,
    cells: CellHandler[], // these are the columns in the table
    fields: CellHandler[], // these are the fields visible only in the drawer
    facets: Facet[] // these are facets cumulated from all cells
}