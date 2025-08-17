import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useContext, useState } from 'react';
import { Badge, Dropdown } from 'react-bootstrap';
import { ChainDataContext } from './context/ChainDataContext';
import { BaseButton } from '../components/BaseButton';
import Icon from 'react-icons-kit';
import { close } from 'react-icons-kit/fa/close';
import { ConnectedWalletAnchor } from './ConnectedWalletAnchor';
import { useStateWithOverride } from '../utils/hooks/useStateWithOverride';
import { smartChainTokenArray } from '../tokens/Tokens';
import { Tokens } from '../FEConstants';
function MultichainWalletDisplay(props) {
    const chains = Object.keys(props.wallet.chains).map((chain) => props.wallet.chains[chain]);
    const [show, setShow] = useState(false);
    return (_jsxs(Dropdown, { align: "end", show: show, onToggle: (nextShow) => setShow(nextShow), children: [_jsx("div", { className: "wallet-connections__badge", onClick: () => setShow(true), children: _jsxs(Badge, { id: 'dropdown' + props.wallet.name, className: "p-0 bg-opacity-50 cursor-pointer align-items-center d-flex flex-row", children: [_jsx("img", { width: 24, height: 24, src: props.wallet.icon }), chains.map((value) => {
                            return (_jsx("img", { className: "mx-1", width: 18, height: 18, src: value.icon }, value.name));
                        })] }) }), _jsx(Dropdown.Menu, { popperConfig: { strategy: 'absolute' }, children: chains.map((value) => {
                    return (_jsxs(_Fragment, { children: [_jsx(Dropdown.Header, { children: value.name }), _jsx(Dropdown.Item, { onClick: () => value.disconnect(), children: "Disconnect" }), value.changeWallet != null ? (_jsx(Dropdown.Item, { onClick: () => value.changeWallet(), children: "Change wallet" })) : ('')] }));
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
            icon: '/icons/chains/solana_v2.svg',
            token: solanaToken,
        },
        {
            name: 'Bitcoin',
            code: 'bitcoin',
            icon: '/icons/chains/bitcoin_v2.svg',
            token: bitcoinToken,
        },
    ];
    return (_jsxs("div", { className: "wallet-connections", children: [walletsArr &&
                walletsArr.map((value) => _jsx(MultichainWalletDisplay, { wallet: value }, value.name)), walletsArr.length < 2 ? (_jsxs(Dropdown, { align: "end", children: [walletsArr.length == 0 ? (_jsx(Dropdown.Toggle, { as: BaseButton, className: "wallet-connections__button", variant: "transparent", customIcon: "connect", bsPrefix: "none", children: "Connect Wallet" })) : (_jsx(Dropdown.Toggle, { as: BaseButton, className: "wallet-connections__button", variant: "clear", icon: _jsx(Icon, { size: 20, icon: close }), bsPrefix: "none" })), _jsx(Dropdown.Menu, { className: "wallet-connections__dropdown", children: connections.map((value) => (_jsxs("div", { className: "wallet-connections__item", children: [_jsxs("div", { className: "wallet-connections__item__header", children: [_jsx("img", { src: value.icon, alt: value.name, width: 24, height: 24 }), _jsx("span", { className: "wallet-connections__item__header__name", children: value.name })] }), _jsx(ConnectedWalletAnchor, { noText: false, currency: value.token })] }, value.code))) })] })) : null] }));
}
