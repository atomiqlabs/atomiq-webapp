import {useContext, useEffect, useRef, useState} from "react";
import {LNNFCReader, LNNFCStartResult} from "./LNNFCReader";
import {LNURLPay, LNURLWithdraw} from "@atomiqlabs/sdk";
import {SwapsContext} from "../context/SwapsContext";

type LNNFCCallback = (result: LNURLPay | LNURLWithdraw) => void;

export function useLNNFCScanner(_callback: LNNFCCallback, disable?: boolean): LNNFCStartResult | null {
    const {swapper} = useContext(SwapsContext);

    const callback = useRef<LNNFCCallback>(null);
    useEffect(() => {
        callback.current = _callback;
    }, [_callback]);

    const [NFCScanning, setNFCScanning] = useState<LNNFCStartResult>(null);

    const nfcScannerRef = useRef<LNNFCReader>(null);

    useEffect(() => {
        if(disable || swapper==null) return;

        const nfcScanner = new LNNFCReader();
        if(!nfcScanner.isSupported()) return;

        nfcScanner.onScanned((lnurls: string[]) => {
            if(lnurls[0]!=null) {
                swapper.getLNURLTypeAndData(lnurls[0]).then((result: LNURLPay | LNURLWithdraw) => {
                    if(result==null) return;
                    if(callback.current==null) return;
                    callback.current(result);
                });
            }
        });
        nfcScannerRef.current = nfcScanner;

        nfcScanner.start().then((res: LNNFCStartResult) => {
            setNFCScanning(res);
        });

        return () => {
            nfcScanner.stop();
        };
    }, [swapper, disable]);

    return NFCScanning;
}