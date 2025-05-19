import { requestProvider } from "webln";
export function isWebLNInstalled() {
    const isWebLNInstalled = window?.webln != null;
    return isWebLNInstalled;
}
export function connectWebLN() {
    return requestProvider();
}
