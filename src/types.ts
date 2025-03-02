
export type ConnectionStatus = "connected" | "not connected"

export type Settings = {
    maxMessages: number,
    entriesOrder: "asc" | "desc",
    leftColWidth: number,
    drawerColWidth: number,
    middlewares: Middleware[]
}

export type Message = {
    /**
     * A random identifier for a message
     */
    id: string,
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
     * A UNIX timestamp in milliseconds for when the message was received by Logdy
     */
    ts: number,
    /**
     * A numerical key by which all of the messages will be ordered. Setting this key is useful
     * when you're dealing with multiple sources of logs and want them ordered, 
     * for example by the timestamp, then you can assign the timestamp value as this key.
     */
    order_key?: number,
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
        file: string,
        /**
         * Origin of the message coming from the API
         */
        api_source: string
    },
    /** 
     * Special styles that will be applied to entire row
     * of the table. For example { "background": "red" }, will make the whole row
     * background red.
     */
    style?: object,
    /**
     * A correlation identifier used to trace log messages that belongs to the same transaction 
     * (chain of requests between components within a system).
     */
    correlation_id?: string,
    /**
     * This object can be filled with values that represent timings 
     * of the event represented by the particular log line.
     * All of the value must be positive numbers. 
     * There is no defined unit.
     */
    timing?: {
        /**
         * Represents a start of the event
         */
        start: number,
        /**
         * Represents an end of the event
         */
        end?: number,
        /**
         * Represents a duration of the event. In case an 'end' is present
         * this field will be ignored.
         */
        duration?: number,
        /**
         * The message to present when hovering over block in trace view
         */
        label?: string,
        /**
         * Styles to be applied to a particular trace
         */
        style?: {
            /**
             * Background style
             */
            backgroundColor?: string,
            /**
             * Border style
             */
            border?: string,
            /**
             * Font color
             */
            color?: string,
        }
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
    facets?: Facet[],
    /**
     * Whether 'text' is allowed to contain HTML tags.
     * Setting it to 'true' is danger since the string will be interpreted as HTML
     * and opens a vulnerability for XSS attacks.
     */
    allowHtmlInText?: boolean
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

export type MessageMetadata = {
    opened?: boolean,
    starred?: boolean
}

export type StoredMessage = MessageMetadata & {
    id?: string,
    message: Message
}

export type TraceRow = {
    id: string,
    offset: number,
    width: number,
    label?: string,
    style?: object,
}

export type Row = MessageMetadata & {
    id: string,
    open?: boolean,
    orderKey?: number,
    msg: Message,
    cells: CellHandler[], // these are the columns in the table
    fields: CellHandler[], // these are the fields visible only in the drawer
    facets: Facet[] // these are facets cumulated from all cells
}