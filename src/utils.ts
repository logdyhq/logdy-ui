export function formatThousands(x: number): string {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function getUrlParam(url: string, param: string): string | null {
    let params = new URLSearchParams(url)
    console.log(params, url)
    return params.get(param)
}