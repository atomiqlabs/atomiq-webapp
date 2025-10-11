import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as React from 'react';
import { useLocalStorage } from '../../utils/hooks/useLocalStorage';
import { useStateRef } from '../../utils/hooks/useStateRef';
import { ExtensionBitcoinWallet } from './bitcoin/base/ExtensionBitcoinWallet';
import { getInstalledBitcoinWallets } from './bitcoin/utils/BitcoinWalletUtils';
export function useBitcoinWalletData(connectedOtherChainWallets) {
    const [bitcoinWallet, setBitcoinWallet] = React.useState(undefined);
    const [usableWallets, setUsableWallets] = useState([]);
    const [installableWallets, setInstallableWallets] = useState([]);
    const [autoConnect, setAutoConnect] = useLocalStorage('btc-wallet-autoconnect', true);
    const bitcoinWalletRef = useStateRef(bitcoinWallet);
    const prevConnectedWalletRef = useRef({});
    useEffect(() => {
        for (let chainName in connectedOtherChainWallets) {
            const oldWalletName = prevConnectedWalletRef.current[chainName];
            const newWalletName = connectedOtherChainWallets[chainName];
            if (prevConnectedWalletRef.current[chainName] == connectedOtherChainWallets[chainName])
                continue;
            const activeWallet = ExtensionBitcoinWallet.loadState();
            if (oldWalletName != null && newWalletName == null && activeWallet?.name === oldWalletName) {
                setAutoConnect(true);
                if (bitcoinWalletRef.current != null && bitcoinWalletRef.current.wasAutomaticallyInitiated)
                    disconnect(true);
            }
            prevConnectedWalletRef.current[chainName] = newWalletName;
            if (newWalletName == null)
                continue;
            if (!autoConnect)
                continue;
            if (usableWallets == null)
                continue;
            if (activeWallet == null) {
                const bitcoinWalletType = usableWallets.find((walletType) => walletType.name === newWalletName);
                console.log('useBitcoinWalletData(): useEffect(autoconnect): found matching bitcoin wallet: ', bitcoinWalletType);
                if (bitcoinWalletType != null)
                    bitcoinWalletType
                        .use({ multichainConnected: true })
                        .then((wallet) => setBitcoinWallet(wallet))
                        .catch((e) => {
                        console.error(e);
                    });
                return;
            }
        }
    }, [connectedOtherChainWallets, usableWallets]);
    useEffect(() => {
        getInstalledBitcoinWallets()
            .then((resp) => {
            setUsableWallets(resp.installed);
            setInstallableWallets(resp.installable);
            if (resp.active != null && bitcoinWallet == null) {
                resp
                    .active()
                    .then((wallet) => setBitcoinWallet(wallet))
                    .catch((e) => {
                    console.error(e);
                });
            }
        })
            .catch((e) => console.error(e));
    }, []);
    useEffect(() => {
        if (bitcoinWallet == null)
            return;
        let listener;
        bitcoinWallet.onWalletChanged((listener = (newWallet) => {
            console.log('useBitcoinWalletData(): useEffect(walletChangeListener): New bitcoin wallet set: ', newWallet);
            if (newWallet == null) {
                ExtensionBitcoinWallet.clearState();
                setBitcoinWallet(undefined);
                return;
            }
            if (bitcoinWallet.getReceiveAddress() === newWallet.getReceiveAddress())
                return;
            setBitcoinWallet(newWallet);
        }));
        return () => {
            bitcoinWallet.offWalletChanged(listener);
        };
    }, [bitcoinWallet]);
    const connectWallet = useCallback(async (bitcoinWalletType) => {
        const wallet = await bitcoinWalletType.use();
        return setBitcoinWallet(wallet);
    }, []);
    const disconnect = useCallback((skipToggleAutoConnect) => {
        if (skipToggleAutoConnect !== true &&
            bitcoinWalletRef.current != null &&
            bitcoinWalletRef.current.wasAutomaticallyInitiated)
            setAutoConnect(false);
        ExtensionBitcoinWallet.clearState();
        setBitcoinWallet(undefined);
    }, []);
    const [modalOpened, setModalOpened] = useState(false);
    const openModal = useCallback(() => {
        setModalOpened(true);
    }, []);
    const closeModal = useCallback(() => {
        setModalOpened(false);
    }, []);
    const connect = useCallback(() => {
        if (usableWallets.length === 1) {
            connectWallet(usableWallets[0]).catch((e) => {
                console.error(e);
            });
            return;
        }
        else {
            openModal();
        }
    }, [usableWallets, connectWallet, openModal]);
    // Convert BitcoinWalletType to ChainWalletOption
    const installedWalletOptions = useMemo(() => usableWallets.map((wallet) => ({ name: wallet.name, icon: wallet.iconUrl, data: wallet })), [usableWallets]);
    const installableWalletOptions = useMemo(() => installableWallets.map((wallet) => ({ name: wallet.name, icon: wallet.iconUrl, data: wallet })), [installableWallets]);
    const connectWalletOption = useCallback(async (wallet) => {
        await connectWallet(wallet.data);
        closeModal();
    }, [connectWallet, closeModal]);
    console.log(bitcoinWallet);
    const chainData = useMemo(() => ({
        chain: {
            name: 'Bitcoin',
            icon: '/icons/chains/BITCOIN.svg',
        },
        wallet: bitcoinWallet == null
            ? null
            : {
                name: bitcoinWallet.getName(),
                icon: bitcoinWallet.getIcon(),
                instance: bitcoinWallet,
                address: bitcoinWallet.getReceiveAddress(),
            },
        id: 'BITCOIN',
        connect: usableWallets.length > 0 || installableWallets.length > 0 ? connect : null,
        disconnect: bitcoinWallet != null ? disconnect : null,
        changeWallet: bitcoinWallet != null && usableWallets.length > 1 ? connect : null,
    }), [bitcoinWallet, usableWallets, installableWallets, connect, disconnect]);
    return useMemo(() => ({
        chainData,
        installedWallets: installedWalletOptions,
        installableWallets: installableWalletOptions,
        connectWallet: connectWalletOption,
        openModal,
        closeModal,
        isModalOpen: modalOpened,
    }), [chainData, installedWalletOptions, installableWalletOptions, connectWalletOption, openModal, closeModal, modalOpened]);
}
