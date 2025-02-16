import { useCallback, useMemo, useState } from "react";
import { connectWebLN, isWebLNInstalled } from "../bitcoin/lightning/WebLNUtils";
const isInstalled = isWebLNInstalled();
export function useWebLNWalletContext() {
    const [lnWallet, setLnWallet] = useState();
    const connect = useCallback(() => {
        connectWebLN().then(res => {
            setLnWallet(res);
        }).catch(e => console.error(e));
    }, []);
    const disconnect = useMemo(() => {
        if (lnWallet != null) {
            return () => setLnWallet(null);
        }
        return null;
    }, [lnWallet]);
    return { lnWallet, connect: isInstalled ? connect : null, disconnect };
}
