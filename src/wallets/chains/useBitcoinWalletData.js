import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from 'react-bootstrap';
import * as React from 'react';
import { useLocalStorage } from '../../utils/hooks/useLocalStorage';
import { useStateRef } from '../../utils/hooks/useStateRef';
import { ExtensionBitcoinWallet } from './bitcoin/base/ExtensionBitcoinWallet';
import { getInstalledBitcoinWallets } from './bitcoin/utils/BitcoinWalletUtils';
function BitcoinWalletModal(props) {
    return (_jsx(Modal, { contentClassName: "wallet-adapter-modal-wrapper", size: "sm", centered: true, show: props.modalOpened, onHide: () => props.setModalOpened(false), dialogClassName: "wallet-modal", backdrop: false, children: _jsxs(Modal.Body, { children: [_jsx("button", { onClick: () => props.setModalOpened(false), className: "wallet-adapter-modal-button-close", children: _jsx("svg", { width: "14", height: "14", children: _jsx("path", { d: "M14 12.461 8.3 6.772l5.234-5.233L12.006 0 6.772 5.234 1.54 0 0 1.539l5.234 5.233L0 12.006l1.539 1.528L6.772 8.3l5.69 5.7L14 12.461z" }) }) }), _jsx("h1", { className: "wallet-adapter-modal-title", children: "Select a Bitcoin Wallet" }), _jsx("ul", { className: "wallet-adapter-modal-list", children: props.usableWallets.map((e) => (_jsx("li", { children: _jsxs("button", { className: "wallet-modal__item", onClick: () => props.connectWallet(e), children: [_jsx("img", { width: 20, height: 20, src: e.iconUrl }), e.name, _jsx("div", { className: "wallet-modal__item__status", children: "Installed" })] }, e.name) }))) }), _jsx("ul", { className: "wallet-adapter-modal-list", children: props.installableWallets.map((e) => (_jsx("li", { children: _jsxs("button", { className: "wallet-modal__item", onClick: () => props.connectWallet(e), children: [_jsx("img", { width: 20, height: 20, src: e.iconUrl }), "Install ", e.name] }, e.name) }))) })] }) }));
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
