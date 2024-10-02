import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Button, CloseButton, Dropdown, ListGroup, Modal } from "react-bootstrap";
import * as React from "react";
import { useContext, useEffect, useState } from "react";
import { BitcoinWalletContext } from "../../context/BitcoinWalletContext";
import { getInstalledBitcoinWallets } from "../../bitcoin/onchain/BitcoinWalletUtils";
import { ic_brightness_1 } from 'react-icons-kit/md/ic_brightness_1';
import Icon from "react-icons-kit";
export function useBitcoinWalletChooser() {
    const { bitcoinWallet, setBitcoinWallet } = useContext(BitcoinWalletContext);
    const [loading, setLoading] = useState(false);
    const [modalOpened, setModalOpened] = useState(false);
    const [usableWallets, setUsableWallets] = useState([]);
    const [error, setError] = useState();
    useEffect(() => {
        setLoading(true);
        getInstalledBitcoinWallets().then(resp => {
            setUsableWallets(resp.installed);
            if (resp.active != null && bitcoinWallet == null) {
                resp.active().then(wallet => setBitcoinWallet(wallet)).catch(e => {
                    console.error(e);
                    setError(e.message);
                });
            }
            setLoading(false);
        }).catch(e => console.error(e));
    }, [bitcoinWallet == null]);
    useEffect(() => {
        if (bitcoinWallet == null)
            return;
        let listener;
        bitcoinWallet.onWalletChanged(listener = (newWallet) => {
            if (bitcoinWallet.getReceiveAddress() === newWallet.getReceiveAddress())
                return;
            console.log("New bitcoin wallet set: ", newWallet);
            setBitcoinWallet(newWallet);
        });
        return () => {
            bitcoinWallet.offWalletChanged(listener);
        };
    }, [bitcoinWallet]);
    const connectWallet = (wallet) => {
        if (wallet != null) {
            wallet.use().then(result => {
                setBitcoinWallet(result);
                setModalOpened(false);
            }).catch(e => {
                console.error(e);
                setError(e.message);
            });
            return;
        }
        if (usableWallets.length === 1) {
            usableWallets[0].use().then(result => {
                setBitcoinWallet(result);
            }).catch(e => {
                console.error(e);
                setError(e.message);
            });
        }
        else {
            setModalOpened(true);
        }
    };
    return { loading, modalOpened, setModalOpened, usableWallets, bitcoinWallet, connectWallet, setBitcoinWallet, error };
}
export function BitcoinWalletModal(props) {
    return (_jsxs(Modal, { contentClassName: "text-white bg-dark", size: "sm", centered: true, show: props.modalOpened, onHide: () => props.setModalOpened(false), dialogClassName: "min-width-400px", children: [_jsx(Modal.Header, { className: "border-0", children: _jsxs(Modal.Title, { id: "contained-modal-title-vcenter", className: "d-flex flex-grow-1", children: ["Select a Bitcoin wallet", _jsx(CloseButton, { className: "ms-auto", variant: "white", onClick: () => props.setModalOpened(false) })] }) }), _jsx(Modal.Body, { children: _jsx(ListGroup, { variant: "flush", children: props.usableWallets.map((e, index) => {
                        return (_jsxs(ListGroup.Item, { action: true, onClick: () => props.connectWallet(e), className: "d-flex flex-row bg-transparent text-white border-0", children: [_jsx("img", { width: 20, height: 20, src: e.iconUrl, className: "me-2" }), _jsx("span", { children: e.name })] }, e.name));
                    }) }) })] }));
}
export function BitcoinWalletButton(props) {
    const { loading, modalOpened, setModalOpened, usableWallets, bitcoinWallet, connectWallet } = useBitcoinWalletChooser();
    if (usableWallets.length === 0 && bitcoinWallet == null)
        return _jsx(_Fragment, {});
    return (_jsxs(_Fragment, { children: [_jsx(BitcoinWalletModal, { modalOpened: modalOpened, setModalOpened: setModalOpened, usableWallets: usableWallets, connectWallet: connectWallet }), bitcoinWallet == null ? (_jsx(Button, { variant: "dark", className: "me-2 px-3", onClick: () => connectWallet(), children: "Connect BTC wallet" })) : (_jsxs(Button, { variant: "dark", className: "me-2 px-3", children: [_jsx("img", { width: 20, height: 20, src: bitcoinWallet.getIcon(), className: "me-2" }), bitcoinWallet.getName()] }))] }));
}
const BitcoinConnectedWallet = React.forwardRef(({ bitcoinWallet, onClick, noText }, ref) => (_jsxs("div", { className: "d-flex flex-row align-items-center cursor-pointer", onClick: onClick, children: [_jsx(Icon, { className: "text-success d-flex align-items-center me-1", icon: ic_brightness_1, size: 12 }), _jsx("img", { width: 16, height: 16, src: bitcoinWallet.getIcon(), className: "me-1" }), !noText ? bitcoinWallet.getName() : ""] })));
export function BitcoinWalletAnchor(props) {
    const { loading, modalOpened, setModalOpened, usableWallets, bitcoinWallet, connectWallet, setBitcoinWallet, error } = useBitcoinWalletChooser();
    if (usableWallets.length === 0 && bitcoinWallet == null)
        return _jsx(_Fragment, {});
    return (_jsxs(_Fragment, { children: [_jsx(BitcoinWalletModal, { modalOpened: modalOpened, setModalOpened: setModalOpened, usableWallets: usableWallets, connectWallet: connectWallet }), bitcoinWallet == null ? (_jsx("a", { className: props.className, href: "javascript:void(0);", onClick: () => connectWallet(), children: "Connect BTC wallet" })) : (_jsxs(Dropdown, { align: { md: "start" }, children: [_jsx(Dropdown.Toggle, { as: BitcoinConnectedWallet, id: "dropdown-custom-components", className: props.className, bitcoinWallet: bitcoinWallet, noText: props.noText, children: "Custom toggle" }), _jsxs(Dropdown.Menu, { children: [_jsx(Dropdown.Item, { eventKey: "1", onClick: () => {
                                    setBitcoinWallet(null);
                                }, children: "Disconnect" }), usableWallets != null && usableWallets.length > 1 ? (_jsx(Dropdown.Item, { eventKey: "2", onClick: () => {
                                    connectWallet();
                                }, children: "Change wallet" })) : ""] })] }))] }));
}
