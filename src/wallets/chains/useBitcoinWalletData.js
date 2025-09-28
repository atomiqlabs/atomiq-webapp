import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as React from 'react';
import { useLocalStorage } from '../../utils/hooks/useLocalStorage';
import { useStateRef } from '../../utils/hooks/useStateRef';
import { ExtensionBitcoinWallet } from './bitcoin/base/ExtensionBitcoinWallet';
import { getInstalledBitcoinWallets } from './bitcoin/utils/BitcoinWalletUtils';
import { WalletModal } from '../shared/WalletModal';
import { WalletListItem } from '../shared/WalletListItem';
function BitcoinWalletModal(props) {
    return (_jsxs(WalletModal, { visible: props.modalOpened, onClose: () => props.setModalOpened(false), title: "Select a Bitcoin Wallet", children: [_jsx("ul", { className: "wallet-adapter-modal-list", children: props.usableWallets.map((e) => (_jsx(WalletListItem, { name: e.name, icon: e.iconUrl, isInstalled: true, onClick: () => props.connectWallet(e) }, e.name))) }), _jsx("ul", { className: "wallet-adapter-modal-list", children: props.installableWallets.map((e) => (_jsx(WalletListItem, { name: e.name, icon: e.iconUrl, isInstalled: false, onClick: () => props.connectWallet(e) }, e.name))) })] }));
}
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
    const connect = useCallback(() => {
        if (usableWallets.length === 1) {
            connectWallet(usableWallets[0]).catch((e) => {
                console.error(e);
            });
            return;
        }
        else {
            setModalOpened(true);
        }
    }, [usableWallets]);
    const [modalOpened, setModalOpened] = useState(false);
    const modal = useMemo(() => (_jsx(BitcoinWalletModal, { modalOpened: modalOpened, setModalOpened: setModalOpened, connectWallet: (wallet) => {
            connectWallet(wallet)
                .then(() => setModalOpened(false))
                .catch((err) => console.error(err));
        }, usableWallets: usableWallets, installableWallets: installableWallets })), [modalOpened, connectWallet, usableWallets, installableWallets]);
    console.log(bitcoinWallet);
    return useMemo(() => [
        {
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
        },
        modal,
    ], [bitcoinWallet, usableWallets, installableWallets, connect, disconnect, modal]);
}
