import { faker } from "@faker-js/faker";
import { Layout } from "./config";
import { Middleware } from "./types";

export function generateData(json: boolean, separator: string = " | "): object | string {
    let data = {
        uuid: faker.string.uuid(),
        domain: faker.internet.domainName(),
        ipv4: faker.internet.ipv4(),
        url: faker.internet.url(),
        level: Math.random() > 0.5 ? 'info' : 'error',
        ua: faker.internet.userAgent(),
        method: faker.internet.httpMethod(),
        issuer: faker.finance.creditCardIssuer(),
        duration: Math.round(Math.random() * 250),
        active: Math.random() > 0.5
    }

    return json ? data : Object.values(data).join(separator)
}

export function getLayout(json: boolean = true): Layout {
    let middlewares: Middleware[] = []

    if (!json) {
        middlewares.push({
            id: "1",
            name: "parse row",
            handlerTsCode: `(line: Message): Message | void => {
    line.is_json = true
    line.json_content = Object.assign({}, line.content.split("|").map(l => l.trim()))
    return line;
}`
        })
    }

    let l = new Layout("demo", { maxMessages: 1000, leftColWidth: 300, drawerColWidth: 900, middlewares, entriesOrder: "desc" })

    if (!json) {
        l.add({
            id: "1",
            name: "raw",
            handlerTsCode: `(line: Message): CellHandler => {
                return { 
                    text: line.content, 
                }
            }`,
            width: 500
        })
        return l
    }

    l.add({
        id: "",
        name: "ts",
        handlerTsCode: `(line: Message): CellHandler => {
            return { text: moment().format('DD-MM HH:mm:ss.SSS') }
        }`
    })

    l.add({
        id: "1",
        name: "method",
        width: 100,
        faceted: true,
        handlerTsCode: `(line: Message): CellHandler => {
            return { 
                text: line.json_content.method, 
            }
        }`
    })
    l.add({
        id: "2",
        name: "level",
        width: 100,
        handlerTsCode: `(line: Message): CellHandler => {
            return { 
                text: line.json_content.level,
                facets: [
                    { name:"Level", value:line.json_content.level }
                ] 
            }
        }`
    })
    l.add({
        id: "3",
        name: "domain",
        width: 150,
        handlerTsCode: `(line: Message): CellHandler => {
            return { text: line.json_content.domain }
        }`
    })
    l.add({
        id: "4",
        name: "ipv4",
        width: 120,
        handlerTsCode: `(line: Message): CellHandler => {
            return { text: line.json_content.ipv4 }
        }`
    })
    l.add({
        id: "5",
        name: "url",
        width: 300,
        handlerTsCode: `(line: Message): CellHandler => {
            return { text: line.json_content.url }
        }`
    })
    l.add({
        id: "8",
        name: "duration",
        width: 100,
        handlerTsCode: `(line: Message): CellHandler => {
            return { text: line.json_content.duration }
        }`
    })
    l.add({
        id: "9",
        name: "active",
        width: 100,
        faceted: true,
        handlerTsCode: `(line: Message): CellHandler => {
            return { text: line.json_content.active }
        }`
    })
    l.add({
        id: "6",
        name: "issuer",
        width: 300,
        faceted: true,
        handlerTsCode: `(line: Message): CellHandler => {
            return { 
                text: line.json_content.issuer,
             }
        }`
    })

    l.add({
        id: "7",
        name: "ua",
        hidden: true,
        handlerTsCode: `(line: Message): CellHandler => {
            return { text: line.json_content.ua }
        }`
    })
    return l
}