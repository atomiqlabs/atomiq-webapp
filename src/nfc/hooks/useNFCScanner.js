import { useEffect, useRef, useState } from "react";
import { useStateRef } from "../../utils/hooks/useStateRef";
import { NFCReader } from "../NFCReader";
export function useNFCScanner(_callback, disable) {
  const callback = useStateRef(_callback);
  const [NFCScanning, setNFCScanning] = useState(null);
  const nfcScannerRef = useRef(null);
  useEffect(() => {
    if (disable) return;
    const nfcScanner = new NFCReader();
    if (!nfcScanner.isSupported()) return;
    nfcScanner.onScanned((lnurls) => {
      if (lnurls[0] != null) {
        if (callback.current == null) return;
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
  }, [disable]);
  return NFCScanning;
}
