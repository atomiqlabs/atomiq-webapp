
export enum LNNFCStartResult {
    OK = 0,
    NOT_SUPPORTED = 1,
    USER_DISABLED = 2
}

export class LNNFCReader {

    ndef: any;
    abortController: AbortController;
    callback: (lnurl: string[]) => void;

    static userDisable() {
        localStorage.setItem("crossLightning-nfcReadEnabled", "false");
    }

    static isUserDisabled() {
        return localStorage.getItem("crossLightning-nfcReadEnabled")!=="true";
    }

    static isSupported(): boolean {
        try {
            new (window as any).NDEFReader();
        } catch (e) {
            return false;
        }
        return true;
    }

    constructor() {
        try {
            this.ndef = new (window as any).NDEFReader();
            this.ndef.onreadingerror = (event) => {
                console.log(
                    "Error! Cannot read data from the NFC tag. Try a different one?",
                );
            };
            this.ndef.onreading = (event) => {
                if(event.message==null) return;
                if(event.message.records==null) return;
                if(event.message.records.length===0) return;
                console.log("NFC scanned, message: ", event.message);
                const filteredRecords = event.message.records.filter(record => record.recordType==="url" || record.recordType==="text");
                if(filteredRecords.length===0) return;
                if(this.callback!=null) this.callback(filteredRecords.map(e => Buffer.from(e.data.buffer).toString("ascii")));
            };
        } catch (e) {
            console.error(e);
        }
    }

    isSupported(): boolean {
        return this.ndef!=null;
    }

    onScanned(cbk: (lnurl: string[]) => void) {
        this.callback = cbk;
    }

    async start(tryToEnable?: boolean): Promise<LNNFCStartResult> {
        if(!this.isSupported()) return LNNFCStartResult.NOT_SUPPORTED;

        if(LNNFCReader.isUserDisabled() && !tryToEnable) return LNNFCStartResult.USER_DISABLED;

        if(this.abortController!=null) this.abortController.abort();
        this.abortController = new AbortController();

        try {
            await this.ndef.scan({
                signal: this.abortController.signal
            });
        } catch (e) {
            console.error(e);
            localStorage.setItem("crossLightning-nfcReadEnabled", "false");
            return LNNFCStartResult.USER_DISABLED;
        }
        localStorage.setItem("crossLightning-nfcReadEnabled", "true");

        return LNNFCStartResult.OK;
    }

    async stop(): Promise<void> {
        if(!this.isSupported()) return;

        if(this.abortController!=null) this.abortController.abort();
        this.abortController = null
    }

}