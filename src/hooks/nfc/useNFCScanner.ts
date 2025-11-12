import { useEffect, useRef, useState } from 'react';
import { useStateRef } from '../utils/useStateRef';
import { NFCReader, NFCStartResult } from '../../utils/NFCReader';

type NFCCallback = (result: string) => void;

export function useNFCScanner(_callback: NFCCallback, disable?: boolean): NFCStartResult | null {
  const callback = useStateRef(_callback);
  const [NFCScanning, setNFCScanning] = useState<NFCStartResult>(null);
  const nfcScannerRef = useRef<NFCReader>(null);

  useEffect(() => {
    if (disable) return;

    const nfcScanner = new NFCReader();
    if (!nfcScanner.isSupported()) return;

    nfcScanner.onScanned((lnurls: string[]) => {
      if (lnurls[0] != null) {
        if (callback.current == null) return;
        callback.current(lnurls[0]);
      }
    });
    nfcScannerRef.current = nfcScanner;

    nfcScanner.start().then((res: NFCStartResult) => {
      setNFCScanning(res);
    });

    return () => {
      nfcScanner.stop();
    };
  }, [disable]);

  return NFCScanning;
}
