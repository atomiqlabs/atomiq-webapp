import { useCallback, useMemo, useState } from "react";
import { requestProvider } from "webln";
export function useLightningWalletData() {
    const isWebLNInstalled = window?.webln != null;
    const [wallet, setWallet] = useState();
    const [modalOpened, setModalOpened] = useState(false);
    const openModal = useCallback(() => {
        setModalOpened(true);
    }, []);
    const closeModal = useCallback(() => {
        setModalOpened(false);
    }, []);
    const connect = useCallback(async () => {
        setWallet(await requestProvider());
    }, []);
    const disconnect = useCallback(() => {
        setWallet(null);
    }, []);
    // Lightning uses WebLN's built-in modal, so we return empty arrays
    const installedWalletOptions = useMemo(() => [], []);
    const installableWalletOptions = useMemo(() => [], []);
    const connectWallet = useCallback(async (_wallet) => {
        // Not used for Lightning - uses WebLN modal
    }, []);
    const chainData = useMemo(() => ({
        chain: {
            name: "Lightning",
            icon: "/icons/chains/LIGHTNING.svg",
        },
        wallet: wallet == null
            ? null
            : {
                name: "WebLN",
                icon: "/wallets/WebLN.png",
                instance: wallet,
            },
        id: "LIGHTNING",
        connect: isWebLNInstalled ? connect : null,
        disconnect: wallet != null ? disconnect : null,
    }), [wallet, isWebLNInstalled, connect, disconnect]);
    return useMemo(() => ({
        chainData,
        installedWallets: installedWalletOptions,
        installableWallets: installableWalletOptions,
        connectWallet,
        openModal,
        closeModal,
        isModalOpen: modalOpened,
    }), [chainData, installedWalletOptions, installableWalletOptions, connectWallet, openModal, closeModal, modalOpened]);
}
