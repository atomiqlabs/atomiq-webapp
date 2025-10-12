import { useCallback, useMemo, useState } from "react";
import { requestProvider } from "webln";
export function useLightningWalletData(enabled) {
    const isWebLNInstalled = window?.webln != null;
    const [wallet, setWallet] = useState();
    const connect = useCallback(async () => {
        setWallet(await requestProvider());
    }, []);
    const disconnect = useCallback(() => {
        setWallet(null);
    }, []);
    const webLnWallet = useMemo(() => ({
        name: "WebLN",
        icon: "/wallets/WebLN.png",
        isConnected: wallet != null,
        downloadLink: "https://www.webln.dev/"
    }), [wallet]);
    return useMemo(() => !enabled ? null : ({
        chain: {
            name: "Lightning",
            icon: "/icons/chains/LIGHTNING.svg"
        },
        wallet: wallet == null ? null : {
            ...webLnWallet,
            instance: wallet
        },
        installedWallets: isWebLNInstalled ? [webLnWallet] : [],
        nonInstalledWallets: isWebLNInstalled ? [] : [webLnWallet],
        chainId: "LIGHTNING",
        _connectWallet: isWebLNInstalled ? connect : null,
        _disconnect: wallet != null ? disconnect : null,
        hasWallets: isWebLNInstalled
    }), [wallet, webLnWallet, isWebLNInstalled, connect, disconnect]);
}
