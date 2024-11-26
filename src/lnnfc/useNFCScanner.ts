import {useContext, useEffect, useRef, useState} from "react";
import {LNNFCReader, LNNFCStartResult} from "./LNNFCReader";
import {SwapsContext} from "../context/SwapsContext";

type NFCCallback = (result: string) => void;

export function useNFCScanner(_callback: NFCCallback): LNNFCStartResult | null {
    const {swapper} = useContext(SwapsContext);

    const callback = useRef<NFCCallback>(null);
    useEffect(() => {
        callback.current = _callback;
    }, [_callback]);

    const [NFCScanning, setNFCScanning] = useState<LNNFCStartResult>(null);

    const nfcScannerRef = useRef<LNNFCReader>(null);

    useEffect(() => {
        if(swapper==null) return;

        const nfcScanner = new LNNFCReader();
        if(!nfcScanner.isSupported()) return;

        nfcScanner.onScanned((lnurls: string[]) => {
            if(lnurls[0]!=null) {
                if(callback.current==null) return;
                callback.current(lnurls[0]);
            }
        });
        nfcScannerRef.current = nfcScanner;

        nfcScanner.start().then((res: LNNFCStartResult) => {
            setNFCScanning(res);
        });

        return () => {
            nfcScanner.stop();
        };
    }, [swapper]);

    return NFCScanning;
}