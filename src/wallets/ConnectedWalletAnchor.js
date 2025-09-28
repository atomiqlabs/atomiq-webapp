import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Dropdown } from 'react-bootstrap';
import * as React from 'react';
import { ic_brightness_1 } from 'react-icons-kit/md/ic_brightness_1';
import Icon from 'react-icons-kit';
import { useChainForCurrency } from './hooks/useChainForCurrency';
import { BaseButton } from '../components/BaseButton';
const ConnectedWallet = React.forwardRef(({ name, onClick, noText }, ref) => (_jsx(BaseButton, { icon: _jsx(Icon, { size: 12, icon: ic_brightness_1, className: "wallet-connections__indicator" }), variant: "transparent", className: "w-100 justify-content-start", size: "smaller", onClick: onClick, children: !noText ? name : '' })));
export function ConnectedWalletAnchor({ className, noText, currency, variantButton = 'transparent', simple = false, maxSpendable, }) {
    const { wallet, connect, disconnect, changeWallet, chain } = useChainForCurrency(currency);
    if (wallet == null && connect == null) {
        return _jsx(_Fragment, {});
    }
    if (simple && wallet != null) {
        return (_jsxs("div", { className: "wallet-connections wallet-connections__simple", children: [_jsx("img", { width: 16, height: 16, src: wallet.icon, alt: wallet.name }), _jsx("div", { className: "wallet-connections__amount", children: maxSpendable?.balance?.amount ?? '-' })] }));
    }
    return (_jsx(_Fragment, { children: wallet == null ? (_jsx(BaseButton, { customIcon: "connect", onClick: () => connect(), variant: variantButton, size: "smaller", className: "wallet-connections__item__button", children: "Connect Wallet" })) : (_jsxs(Dropdown, { align: { md: 'start' }, children: [_jsx(Dropdown.Toggle, { as: ConnectedWallet, id: "dropdown-custom-components", className: className, name: wallet.name, icon: wallet.icon, noText: noText, children: "Custom toggle" }), _jsxs(Dropdown.Menu, { children: [_jsx(Dropdown.Item, { eventKey: "1", onClick: disconnect, children: "Disconnect" }), changeWallet != null ? (_jsx(Dropdown.Item, { eventKey: "2", onClick: () => {
                                changeWallet();
                            }, children: "Change wallet" })) : ('')] })] })) }));
}
