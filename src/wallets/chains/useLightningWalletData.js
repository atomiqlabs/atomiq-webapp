import { useCallback, useMemo, useState } from "react";
import { requestProvider } from "webln";
export function useLightningWalletData() {
    const isWebLNInstalled = window?.webln != null;
    const [wallet, setWallet] = useState();
    const connect = useCallback(async () => {
        setWallet(await requestProvider());
    }, []);
    const disconnect = useCallback(() => {
        setWallet(null);
    }, []);
    return useMemo(() => [{
            chain: {
                name: "Lightning",
                icon: "/icons/chains/LIGHTNING.svg"
            },
            wallet: wallet == null ? null : {
                name: "WebLN",
                icon: "/wallets/WebLN.png",
                instance: wallet
            },
            id: "LIGHTNING",
            connect: isWebLNInstalled ? connect : null,
            disconnect: wallet != null ? disconnect : null,
        }], [wallet, isWebLNInstalled, connect, disconnect]);
}
