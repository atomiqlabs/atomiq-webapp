import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useContext, useState } from 'react';
import { Badge, Dropdown } from 'react-bootstrap';
import { ChainDataContext } from './context/ChainDataContext';
import { BaseButton } from '../components/BaseButton';
import { ConnectedWalletAnchor } from './ConnectedWalletAnchor';
import { useStateWithOverride } from '../utils/hooks/useStateWithOverride';
import { smartChainTokenArray } from '../tokens/Tokens';
import { Tokens } from '../FEConstants';
function MultichainWalletDisplay(props) {
    const chains = Object.keys(props.wallet.chains).map((chain) => props.wallet.chains[chain]);
    const [show, setShow] = useState(false);
    return (_jsxs(Dropdown, { align: "end", show: show, onToggle: (isOpen) => setShow(isOpen), children: [_jsxs("div", { className: "wallet-connections__trigger", onClick: () => setShow((s) => !s), "aria-expanded": show, role: "button", children: [_jsx("div", { className: "wallet-connections__badge", children: _jsxs(Badge, { id: 'dropdown' + props.wallet.name, className: "p-0 bg-opacity-50 cursor-pointer align-items-center d-flex flex-row", children: [_jsx("img", { width: 24, height: 24, src: props.wallet.icon }), chains.map((value) => {
                                    return (_jsx("img", { className: "mx-1", width: 18, height: 18, src: value.icon }, value.name));
                                })] }) }), _jsx("div", { className: "icon icon-dropdown" })] }), _jsx(Dropdown.Menu, { popperConfig: { strategy: 'absolute' }, className: 'wallet-connections__dropdown', children: chains.map((value) => {
                    return (_jsxs(_Fragment, { children: [_jsxs(Dropdown.Header, { children: [_jsx("div", { className: "sc-title", children: props.wallet.name }), _jsxs("div", { className: "sc-subtitle", children: [_jsx("img", { width: 24, height: 24, src: value.icon, className: "sc-icon" }), _jsx("div", { className: "sc-text", children: value.name })] })] }), _jsxs("div", { className: "dropdown-list", children: [_jsxs(Dropdown.Item, { onClick: () => value.disconnect(), children: [_jsx("div", { className: "icon icon-disconnect" }), "Disconnect Wallet"] }), value.changeWallet != null ? (_jsxs(Dropdown.Item, { onClick: () => value.changeWallet(), children: [_jsx("div", { className: "icon icon-change-wallet" }), "Change Wallet"] })) : ('')] })] }));
                }) })] }));
}
export function WalletConnections() {
    var _a;
    const chainWalletData = useContext(ChainDataContext);
    const connectedWallets = {};
    for (let chain in chainWalletData) {
        const chainData = chainWalletData[chain];
        if (chainData.wallet == null)
            continue;
        connectedWallets[_a = chainData.wallet.name] ?? (connectedWallets[_a] = {
            name: chainData.wallet.name,
            icon: chainData.wallet.icon,
            chains: {},
        });
        connectedWallets[chainData.wallet.name].chains[chain] = {
            name: chainData.chain.name,
            icon: chainData.chain.icon,
            disconnect: chainData.disconnect,
            changeWallet: chainData.changeWallet,
        };
    }
    const walletsArr = Object.keys(connectedWallets).map((key) => connectedWallets[key]);
    // <img className="social-footer__icon" src={`/icons/socials/${image}`} alt={title}/>
    const [solanaToken, setSolanaToken] = useStateWithOverride(smartChainTokenArray[0], null);
    const [bitcoinToken, setBitcoinToken] = useStateWithOverride(Tokens.BITCOIN.BTC, null);
    const connections = [
        {
            name: 'Solana',
            code: 'solana',
            icon: '/icons/chains/solana.svg',
            token: solanaToken,
        },
        {
            name: 'Bitcoin',
            code: 'bitcoin',
            icon: '/icons/chains/bitcoin.svg',
            token: bitcoinToken,
        },
    ];
    return (_jsxs("div", { className: "wallet-connections", children: [walletsArr &&
                walletsArr.map((value) => _jsx(MultichainWalletDisplay, { wallet: value }, value.name)), walletsArr.length < 2 ? (_jsxs(Dropdown, { align: "end", children: [walletsArr.length == 0 ? (_jsx(Dropdown.Toggle, { as: BaseButton, className: "wallet-connections__button is-main is-full", variant: "transparent", customIcon: "connect", bsPrefix: "none", children: "Connect Wallet" })) : (_jsx(Dropdown.Toggle, { as: BaseButton, className: "wallet-connections__button", variant: "clear", customIcon: "connect", bsPrefix: "none" })), _jsx(Dropdown.Menu, { className: "wallet-connections__dropdown", children: connections.map((value) => (_jsxs("div", { className: "wallet-connections__item", children: [_jsxs("div", { className: "wallet-connections__item__header", children: [_jsx("img", { src: value.icon, alt: value.name, width: 24, height: 24 }), _jsx("span", { className: "wallet-connections__item__header__name", children: value.name })] }), _jsx(ConnectedWalletAnchor, { noText: false, currency: value.token })] }, value.code))) })] })) : null] }));
}
