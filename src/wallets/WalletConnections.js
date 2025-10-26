import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useContext, useMemo, useState } from 'react';
import { Badge, Dropdown } from 'react-bootstrap';
import { ChainDataContext } from './context/ChainDataContext';
import { BaseButton } from '../components/BaseButton';
function MultichainWalletDisplay(props) {
    const chainWalletData = useContext(ChainDataContext);
    const chains = Object.keys(props.wallet.chains).map((chain) => props.wallet.chains[chain]);
    const [show, setShow] = useState(false);
    return (_jsxs(Dropdown, { align: "end", show: show, onToggle: (isOpen) => setShow(isOpen), children: [_jsxs("div", { className: "wallet-connections__trigger", onClick: () => setShow((s) => !s), "aria-expanded": show, role: "button", children: [_jsx("div", { className: "wallet-connections__badge", children: _jsxs(Badge, { id: 'dropdown' + props.wallet.name, className: "p-0 bg-opacity-50 cursor-pointer align-items-center d-flex flex-row", children: [_jsx("img", { width: 24, height: 24, src: props.wallet.icon }), chains.map((value) => {
                                    return (_jsx("img", { className: "mx-1", width: 18, height: 18, src: value.icon }, value.name));
                                })] }) }), _jsx("div", { className: "icon icon-dropdown" })] }), _jsxs(Dropdown.Menu, { popperConfig: { strategy: 'absolute' }, className: 'wallet-connections__dropdown', children: [_jsx(Dropdown.Header, { children: _jsx("div", { className: "sc-title", children: props.wallet.name }) }), chains.map((value) => (_jsxs("div", { children: [_jsx(Dropdown.Header, { children: _jsxs("div", { className: "sc-subtitle", children: [_jsx("img", { width: 24, height: 24, src: value.icon, className: "sc-icon" }), _jsx("div", { className: "sc-text", children: value.name })] }) }), _jsxs("div", { className: "dropdown-list", children: [_jsxs(Dropdown.Item, { onClick: () => chainWalletData.disconnectWallet(value.chainId), children: [_jsx("div", { className: "icon icon-disconnect" }), "Disconnect Wallet"] }), _jsxs(Dropdown.Item, { onClick: () => chainWalletData.changeWallet(value.chainId), children: [_jsx("div", { className: "icon icon-change-wallet" }), "Change Wallet"] })] })] }, value.chainId)))] })] }));
}
export function WalletConnections() {
    const { chains, connectWallet } = useContext(ChainDataContext);
    const [connectedWallets, nonConnectedChains] = useMemo(() => {
        var _a;
        const nonConnectedChains = [];
        const connectedWallets = {};
        for (let chain in chains) {
            const chainData = chains[chain];
            if (chainData.wallet == null) {
                nonConnectedChains.push(chainData);
                continue;
            }
            connectedWallets[_a = chainData.wallet.name] ?? (connectedWallets[_a] = {
                name: chainData.wallet.name,
                icon: chainData.wallet.icon,
                chains: {},
            });
            connectedWallets[chainData.wallet.name].chains[chain] = {
                name: chainData.chain.name,
                icon: chainData.chain.icon,
                chainId: chain,
            };
        }
        return [
            Object.keys(connectedWallets).map(key => connectedWallets[key]),
            nonConnectedChains
        ];
    }, [chains, connectWallet]);
    return (_jsxs("div", { className: "wallet-connections", children: [connectedWallets &&
                connectedWallets.map((value) => _jsx(MultichainWalletDisplay, { wallet: value }, value.name)), nonConnectedChains.length > 0 ? (_jsxs(Dropdown, { align: "end", children: [connectedWallets.length == 0 ? (_jsx(Dropdown.Toggle, { as: BaseButton, className: "wallet-connections__button is-main is-full", variant: "transparent", customIcon: "connect", bsPrefix: "none", children: "Connect Wallet" })) : (_jsx(Dropdown.Toggle, { as: BaseButton, className: "wallet-connections__button", variant: "clear", customIcon: "connect", bsPrefix: "none" })), _jsx(Dropdown.Menu, { className: "wallet-connections__dropdown", children: nonConnectedChains.map((value) => (_jsxs("div", { className: "wallet-connections__item", children: [_jsxs("div", { className: "wallet-connections__item__header", children: [_jsx("img", { src: value.chain.icon, alt: value.chain.name, width: 24, height: 24 }), _jsx("span", { className: "wallet-connections__item__header__name", children: value.chain.name })] }), _jsx(BaseButton, { customIcon: "connect", onClick: () => connectWallet(value.chainId), variant: "transparent", size: "smaller", className: "wallet-connections__item__button", children: "Connect Wallet" })] }, value.chainId))) })] })) : null] }));
}
