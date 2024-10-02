import {requestProvider, WebLNProvider} from "webln";


export function isWebLNInstalled(): boolean {
    const isWebLNInstalled = (window as any)?.webln!=null;
    return isWebLNInstalled;
}

export function connectWebLN(): Promise<WebLNProvider> {
    return requestProvider();
}
