import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Dropdown } from 'react-bootstrap';
import * as React from 'react';
import { ic_brightness_1 } from 'react-icons-kit/md/ic_brightness_1';
import Icon from 'react-icons-kit';
import { useChainForCurrency } from './hooks/useChainForCurrency';
import { BaseButton } from '../components/BaseButton';
import { close } from 'react-icons-kit/fa/close';
const ConnectedWallet = React.forwardRef(({ name, icon, onClick, noText }, ref) => (_jsx(BaseButton, { icon: _jsx(Icon, { size: 12, icon: ic_brightness_1, className: "wallet-connections__indicator" }), variant: "transparent", className: "w-100 justify-content-start", size: "smaller", onClick: onClick, children: !noText ? name : '' })));
export function ConnectedWalletAnchor(props) {
    const { wallet, connect, disconnect, changeWallet, chain } = useChainForCurrency(props.currency);
    if (wallet == null && connect == null)
        return _jsx(_Fragment, {});
    return (_jsx(_Fragment, { children: wallet == null ? (_jsx(BaseButton, { icon: _jsx(Icon, { size: 20, icon: close }), onClick: () => connect(), variant: "transparent", size: "smaller", className: "wallet-connections__item__button", children: "Connect Wallet" })) : (_jsxs(Dropdown, { align: { md: 'start' }, children: [_jsx(Dropdown.Toggle, { as: ConnectedWallet, id: "dropdown-custom-components", className: props.className, name: wallet.name, icon: wallet.icon, noText: props.noText, children: "Custom toggle" }), _jsxs(Dropdown.Menu, { children: [_jsx(Dropdown.Item, { eventKey: "1", onClick: disconnect, children: "Disconnect" }), changeWallet != null ? (_jsx(Dropdown.Item, { eventKey: "2", onClick: () => {
                                changeWallet();
                            }, children: "Change wallet" })) : ('')] })] })) }));
}
