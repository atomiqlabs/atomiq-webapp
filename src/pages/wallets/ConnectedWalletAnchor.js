import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Dropdown, OverlayTrigger, Tooltip } from 'react-bootstrap';
import * as React from 'react';
import { ic_brightness_1 } from 'react-icons-kit/md/ic_brightness_1';
import Icon from 'react-icons-kit';
import { isBtcToken } from '@atomiqlabs/sdk';
import { useChain } from './hooks/useChain';
import { BaseButton } from '../components/BaseButton';
import { useContext } from 'react';
import { ChainDataContext } from './context/ChainDataContext';
const ConnectedWallet = React.forwardRef(({ name, onClick, noText }) => (_jsx(BaseButton, { icon: _jsx(Icon, { size: 12, icon: ic_brightness_1, className: "wallet-connections__indicator" }), variant: "transparent", className: "w-100 justify-content-start", size: "smaller", onClick: onClick, children: !noText ? name : '' })));
export function ConnectedWalletAnchor({ className, noText, currency, variantButton = 'transparent', simple = false, maxSpendable, inputRef, }) {
    const { wallet, hasWallets, chainId } = useChain(currency);
    const { connectWallet, disconnectWallet, changeWallet } = useContext(ChainDataContext);
    if (wallet == null && hasWallets == null) {
        return _jsx(_Fragment, {});
    }
    const isLightning = isBtcToken(currency) && currency.lightning;
    if (simple && wallet != null) {
        return (_jsxs("div", { className: "wallet-connections wallet-connections__simple", children: [_jsx("img", { width: 16, height: 16, src: wallet.icon, alt: wallet.name }), !isLightning && (_jsx(_Fragment, { children: maxSpendable?.balance?.amount ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "wallet-connections__amount", children: [maxSpendable.balance.amount, " ", currency.ticker] }), inputRef ? (_jsx(BaseButton, { variant: "border-only", className: "wallet-connections__simple__max", onClick: () => {
                                    inputRef.current.setValue(maxSpendable?.balance?.amount);
                                }, children: "max" })) : null] })) : (_jsx("div", { className: "wallet-connections__amount is-loading" })) })), _jsx("div", { className: "wallet-connections__simple__disconnect", children: _jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { children: "Disconnect wallet" }), children: _jsx("div", { className: "icon icon-disconnect", onClick: () => disconnectWallet(chainId) }) }) })] }));
    }
    return (_jsx(_Fragment, { children: wallet == null ? (_jsx(BaseButton, { customIcon: "connect", onClick: () => connectWallet(chainId), variant: variantButton, size: "smaller", className: "wallet-connections__item__button", children: "Connect Wallet" })) : (_jsxs(Dropdown, { align: { md: 'start' }, children: [_jsx(Dropdown.Toggle, { as: ConnectedWallet, id: "dropdown-custom-components", className: className, name: wallet.name, icon: wallet.icon, noText: noText, children: "Custom toggle" }), _jsxs(Dropdown.Menu, { children: [_jsx(Dropdown.Item, { eventKey: "1", onClick: () => disconnectWallet(chainId), children: "Disconnect" }), changeWallet != null ? (_jsx(Dropdown.Item, { eventKey: "2", onClick: () => {
                                changeWallet(chainId);
                            }, children: "Change wallet" })) : ('')] })] })) }));
}
