import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { BitcoinWallet } from "../bitcoin/onchain/BitcoinWallet";
import { getInstalledBitcoinWallets } from "../bitcoin/onchain/BitcoinWalletUtils";
import { CloseButton, ListGroup, Modal } from "react-bootstrap";
import * as React from "react";
import { useLocalStorage } from "../utils/useLocalStorage";
import { useStateRef } from "../utils/useStateRef";
import { useWallet } from "@solana/wallet-adapter-react";
export const BitcoinWalletContext = createContext({});
export function BitcoinWalletModal(props) {
    return (_jsxs(Modal, { contentClassName: "text-white bg-dark", size: "sm", centered: true, show: props.modalOpened, onHide: () => props.setModalOpened(false), dialogClassName: "min-width-400px", children: [_jsx(Modal.Header, { className: "border-0", children: _jsxs(Modal.Title, { id: "contained-modal-title-vcenter", className: "d-flex flex-grow-1", children: ["Select a Bitcoin wallet", _jsx(CloseButton, { className: "ms-auto", variant: "white", onClick: () => props.setModalOpened(false) })] }) }), _jsx(Modal.Body, { children: _jsx(ListGroup, { variant: "flush", children: props.usableWallets.map((e, index) => {
                        return (_jsxs(ListGroup.Item, { action: true, onClick: () => props.connectWallet(e), className: "d-flex flex-row bg-transparent text-white border-0", children: [_jsx("img", { width: 20, height: 20, src: e.iconUrl, className: "me-2" }), _jsx("span", { children: e.name })] }, e.name));
                    }) }) })] }));
}
export function BitcoinWalletProvider(props) {
    const [bitcoinWallet, setBitcoinWallet] = React.useState();
    const [usableWallets, setUsableWallets] = useState([]);
    console.log("BitcoinWalletProvider(): usable wallets: ", usableWallets);
    const [autoConnect, setAutoConnect] = useLocalStorage("btc-wallet-autoconnect", true);
    const bitcoinWalletRef = useStateRef(bitcoinWallet);
    const prevConnectedWalletRef = useRef();
    const wallet = useWallet();
    useEffect(() => {
        if (wallet.wallet != null && wallet.publicKey == null)
            return;
        console.log("BitcoinWalletProvider(): Solana wallet changed: ", wallet.wallet?.adapter?.name);
        if (prevConnectedWalletRef.current != null && wallet.wallet == null) {
            setAutoConnect(true);
            if (bitcoinWalletRef.current != null && bitcoinWalletRef.current.wasAutomaticallyInitiated)
                disconnect(true);
        }
        prevConnectedWalletRef.current = wallet.wallet?.adapter?.name;
        if (wallet.wallet == null)
            return;
        if (!autoConnect)
            return;
        const activeWallet = BitcoinWallet.loadState();
        console.log("BitcoinWalletProvider(): Current active wallet: ", activeWallet);
        if (usableWallets == null)
            return;
        if (activeWallet == null) {
            const bitcoinWalletType = usableWallets.find(walletType => walletType.name === wallet.wallet.adapter.name);
            console.log("BitcoinWalletProvider(): Found matching bitcoin wallet: ", bitcoinWalletType);
            if (bitcoinWalletType != null)
                bitcoinWalletType.use({ multichainConnected: true }).then(wallet => setBitcoinWallet(wallet)).catch(e => {
                    console.error(e);
                });
        }
    }, [wallet.publicKey, usableWallets]);
    useEffect(() => {
        getInstalledBitcoinWallets().then(resp => {
            setUsableWallets(resp.installed);
            if (resp.active != null && bitcoinWallet == null) {
                resp.active().then(wallet => setBitcoinWallet(wallet)).catch(e => {
                    console.error(e);
                });
            }
        }).catch(e => console.error(e));
    }, []);
    useEffect(() => {
        console.log("BitcoinWalletProvider(): Bitcoin wallet changed: ", bitcoinWallet);
        if (bitcoinWallet == null)
            return;
        let listener;
        bitcoinWallet.onWalletChanged(listener = (newWallet) => {
            console.log("BitcoinWalletProvider(): New bitcoin wallet set: ", newWallet);
            if (newWallet == null) {
                BitcoinWallet.clearState();
                setBitcoinWallet(null);
                return;
            }
            if (bitcoinWallet.getReceiveAddress() === newWallet.getReceiveAddress())
                return;
            setBitcoinWallet(newWallet);
        });
        return () => {
            bitcoinWallet.offWalletChanged(listener);
        };
    }, [bitcoinWallet]);
    const connectWallet = useCallback(async (bitcoinWalletType) => {
        const wallet = await bitcoinWalletType.use();
        return setBitcoinWallet(wallet);
    }, []);
    const disconnect = useCallback((skipToggleAutoConnect) => {
        if (skipToggleAutoConnect !== true && bitcoinWalletRef.current != null && bitcoinWalletRef.current.wasAutomaticallyInitiated)
            setAutoConnect(false);
        BitcoinWallet.clearState();
        setBitcoinWallet(null);
    }, []);
    const [modalOpened, setModalOpened] = useState(false);
    const connect = useCallback(() => {
        if (usableWallets.length === 0) {
            connectWallet(usableWallets[0]).catch(e => {
                console.error(e);
            });
            return;
        }
        else {
            setModalOpened(true);
        }
    }, [usableWallets]);
    return (_jsxs(BitcoinWalletContext.Provider, { value: {
            bitcoinWallet,
            connect: usableWallets.length > 0 ? connect : null,
            disconnect: bitcoinWallet != null ? disconnect : null,
            changeWallet: bitcoinWallet != null && usableWallets.length > 1 ? connect : null
        }, children: [_jsx(BitcoinWalletModal, { modalOpened: modalOpened, setModalOpened: setModalOpened, connectWallet: (wallet) => {
                    connectWallet(wallet).then(() => setModalOpened(false)).catch(err => console.error(err));
                }, usableWallets: usableWallets }), props.children] }));
}
