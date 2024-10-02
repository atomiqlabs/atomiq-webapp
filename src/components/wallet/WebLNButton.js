import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Dropdown } from "react-bootstrap";
import * as React from "react";
import { useContext } from "react";
import { ic_brightness_1 } from 'react-icons-kit/md/ic_brightness_1';
import Icon from "react-icons-kit";
import { connectWebLN, isWebLNInstalled } from "../../bitcoin/lightning/WebLNUtils";
import { WebLNContext } from "../../context/WebLNContext";
export function useWebLNWalletChooser() {
    const { lnWallet, setLnWallet } = useContext(WebLNContext);
    const isInstalled = isWebLNInstalled();
    const connectWallet = () => {
        connectWebLN().then(res => {
            setLnWallet(res);
        }).catch(e => console.error(e));
    };
    return { isInstalled, lnWallet, connectWallet, setLnWallet };
}
export function WebLNButton(props) {
    const { isInstalled, lnWallet, connectWallet } = useWebLNWalletChooser();
    if (!isInstalled && lnWallet == null)
        return _jsx(_Fragment, {});
    return (_jsx(_Fragment, { children: lnWallet == null ? (_jsx(Button, { variant: "dark", className: "me-2 px-3", onClick: () => connectWallet(), children: "Connect BTC-LN wallet" })) : (_jsxs(Button, { variant: "dark", className: "me-2 px-3", children: [_jsx("img", { width: 20, height: 20, src: "/wallets/WebLN.png", className: "me-2" }), "WebLN"] })) }));
}
const WebLNConnectedWallet = React.forwardRef(({ onClick }, ref) => (_jsxs("div", { className: "d-flex flex-row align-items-center cursor-pointer", onClick: onClick, children: [_jsx(Icon, { className: "text-success d-flex align-items-center me-1", icon: ic_brightness_1, size: 12 }), _jsx("img", { width: 16, height: 16, src: "/wallets/WebLN.png", className: "me-1" }), "WebLN"] })));
export function WebLNAnchor(props) {
    const { isInstalled, lnWallet, connectWallet, setLnWallet } = useWebLNWalletChooser();
    if (!isInstalled && lnWallet == null)
        return _jsx(_Fragment, {});
    return (_jsx(_Fragment, { children: lnWallet == null ? (_jsx("a", { className: props.className, href: "javascript:void(0);", onClick: () => connectWallet(), children: "Connect BTC-LN wallet" })) : (_jsxs(Dropdown, { align: { md: "start" }, children: [_jsx(Dropdown.Toggle, { as: WebLNConnectedWallet, id: "dropdown-custom-components", className: props.className, children: "Custom toggle" }), _jsx(Dropdown.Menu, { children: _jsx(Dropdown.Item, { eventKey: "1", onClick: () => {
                            setLnWallet(null);
                        }, children: "Disconnect" }) })] })) }));
}
