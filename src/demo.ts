import { faker } from "@faker-js/faker";
import { Layout } from "./config";

export function generateData(json: boolean, separator: string = " | "): object | string {
    let data = {
        uuid: faker.string.uuid(),
        domain: faker.internet.domainName(),
        ipv4: faker.internet.ipv4(),
        url: faker.internet.url(),
        level: Math.random() > 0.5 ? 'info' : 'error',
        ua: faker.internet.userAgent(),
        method: faker.internet.httpMethod(),
        issuer: faker.finance.creditCardIssuer()
    }

    return json ? data : Object.values(data).join(separator)
}

export function getLayout(): Layout {
    let l = new Layout("demo", { maxMessages: 1000, leftColWidth: 300 })
    l.add({
        id: "",
        name: "ts",
        handlerTsCode: `(line: Message): CellHandler => {
            return { text: moment().format('DD-MM hh:mm:ss.SSS') }
        }`
    })

    l.add({
        id: "",
        name: "method",
        width: 100,
        handlerTsCode: `(line: Message): CellHandler => {
            return { 
                text: line.json_content.method, 
                facets: [
                    { name:"Method", value:line.json_content.method }
                ] 
            }
        }`
    })
    l.add({
        id: "",
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
        id: "",
        name: "domain",
        width: 300,
        handlerTsCode: `(line: Message): CellHandler => {
            return { text: line.json_content.domain }
        }`
    })
    l.add({
        id: "",
        name: "ipv4",
        width: 300,
        handlerTsCode: `(line: Message): CellHandler => {
            return { text: line.json_content.ipv4 }
        }`
    })
    l.add({
        id: "",
        name: "url",
        width: 300,
        handlerTsCode: `(line: Message): CellHandler => {
            return { text: line.json_content.url }
        }`
    })
    l.add({
        id: "",
        name: "issuer",
        width: 300,
        handlerTsCode: `(line: Message): CellHandler => {
            return { 
                text: line.json_content.issuer,
                facets: [{
                    name: "Issuer", value: line.json_content.issuer
                }]
             }
        }`
    })

    l.add({
        id: "",
        name: "ua",
        hidden: true,
        handlerTsCode: `(line: Message): CellHandler => {
            return { text: line.json_content.ua }
        }`
    })
    return l
}