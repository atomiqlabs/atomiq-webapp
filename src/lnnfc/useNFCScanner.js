import { useContext, useEffect, useRef, useState } from "react";
import { LNNFCReader } from "./LNNFCReader";
import { SwapsContext } from "../context/SwapsContext";
export function useNFCScanner(_callback) {
    const { swapper } = useContext(SwapsContext);
    const callback = useRef(null);
    useEffect(() => {
        callback.current = _callback;
    }, [_callback]);
    const [NFCScanning, setNFCScanning] = useState(null);
    const nfcScannerRef = useRef(null);
    useEffect(() => {
        if (swapper == null)
            return;
        const nfcScanner = new LNNFCReader();
        if (!nfcScanner.isSupported())
            return;
        nfcScanner.onScanned((lnurls) => {
            if (lnurls[0] != null) {
                if (callback.current == null)
                    return;
                callback.current(lnurls[0]);
            }
        });
        nfcScannerRef.current = nfcScanner;
        nfcScanner.start().then((res) => {
            setNFCScanning(res);
        });
        return () => {
            nfcScanner.stop();
        };
    }, [swapper]);
    return NFCScanning;
}
