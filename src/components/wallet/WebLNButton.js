import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Button, Dropdown } from "react-bootstrap";
import * as React from "react";
import { useContext } from "react";
import { ic_brightness_1 } from 'react-icons-kit/md/ic_brightness_1';
import Icon from "react-icons-kit";
import { WebLNContext } from "../../context/WebLNContext";
const WebLNConnectedWallet = React.forwardRef(({ onClick, noText }, ref) => (_jsxs("div", { className: "d-flex flex-row align-items-center cursor-pointer", onClick: onClick, children: [_jsx(Icon, { className: "text-success d-flex align-items-center me-1", icon: ic_brightness_1, size: 12 }), _jsx("img", { width: 16, height: 16, src: "/wallets/WebLN.png", className: "me-1" }), !noText ? "WebLN" : ""] })));
export function WebLNAnchor(props) {
    const { lnWallet, connect, disconnect } = useContext(WebLNContext);
    if (connect == null && lnWallet == null)
        return _jsx(_Fragment, {});
    return (_jsx(_Fragment, { children: lnWallet == null ? (_jsx(Button, { variant: "outline-light", style: { marginBottom: "2px" }, className: "py-0 px-1", onClick: () => connect(), children: _jsx("small", { className: "font-smallest", style: { marginBottom: "-2px" }, children: "Connect BTC-LN wallet" }) })) : (_jsxs(Dropdown, { align: { md: "start" }, children: [_jsx(Dropdown.Toggle, { as: WebLNConnectedWallet, id: "dropdown-custom-components", className: props.className, noText: props.noText, children: "Custom toggle" }), _jsx(Dropdown.Menu, { children: _jsx(Dropdown.Item, { eventKey: "1", onClick: () => disconnect(), children: "Disconnect" }) })] })) }));
}
