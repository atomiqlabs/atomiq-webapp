import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Badge, Dropdown } from "react-bootstrap";
import { useWalletList } from "../utils/useWalletList";
function MultichainWalletDisplay(props) {
    const chains = Object.keys(props.wallet.chains).map(chain => props.wallet.chains[chain]);
    const [show, setShow] = useState(false);
    return (_jsxs(Dropdown, { align: "end", show: show, onToggle: (nextShow) => setShow(nextShow), children: [_jsxs(Badge, { id: "dropdown" + props.wallet.name, pill: true, bg: "dark", className: "ms-1 bg-opacity-50 cursor-pointer align-items-center d-flex flex-row", onClick: () => setShow(true), children: [_jsx("img", { width: 24, height: 24, src: props.wallet.icon, className: "me-1" }), _jsx("div", { className: "me-auto pe-1 " + (!show ? "d-none" : ""), children: props.wallet.name }), _jsx("div", { style: { width: "1px", height: "1rem" }, className: "me-2 bg-light bg-opacity-25" }), chains.map(value => {
                        return (_jsx("img", { style: { marginLeft: "-4px" }, width: 18, height: 18, src: value.icon }, value.name));
                    })] }), _jsx(Dropdown.Menu, { popperConfig: { strategy: "absolute" }, children: chains.map(value => {
                    return (_jsxs(_Fragment, { children: [_jsx(Dropdown.Header, { children: value.name }), _jsx(Dropdown.Item, { onClick: () => value.disconnect(), children: "Disconnect" }), value.changeWallet != null ? (_jsx(Dropdown.Item, { onClick: () => value.changeWallet(), children: "Change wallet" })) : ""] }));
                }) })] }));
}
export function WalletConnectionsSummary(props) {
    var _a;
    const chainWalletData = useWalletList();
    const connectedWallets = {};
    for (let chain in chainWalletData) {
        const chainData = chainWalletData[chain];
        if (chainData.name == null)
            continue;
        connectedWallets[_a = chainData.name] ?? (connectedWallets[_a] = {
            name: chainData.name,
            icon: chainData.icon,
            chains: {}
        });
        connectedWallets[chainData.name].chains[chain] = {
            name: chainData.chainName,
            icon: chainData.chainLogo,
            disconnect: chainData.disconnect,
            changeWallet: chainData.changeWallet
        };
    }
    const walletsArr = Object.keys(connectedWallets).map(key => connectedWallets[key]);
    return (_jsx("div", { className: "d-flex flex-row", children: walletsArr.map(value => _jsx(MultichainWalletDisplay, { wallet: value }, value.name)) }));
}
