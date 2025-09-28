import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useMemo, useState } from 'react';
import { useWalletModal, WalletIcon } from '@solana/wallet-adapter-react-ui';
import { WalletModal } from '../shared/WalletModal';
import { WalletListItem } from '../shared/WalletListItem';
export const CustomWalletModal = ({ className = '', container = 'body' }) => {
    const { wallets, select } = useWallet();
    const { visible, setVisible } = useWalletModal();
    const [expanded, setExpanded] = useState(false);
    const [listedWallets, collapsedWallets] = useMemo(() => {
        const installed = [];
        const notInstalled = [];
        for (const wallet of wallets) {
            if (wallet.readyState === WalletReadyState.Installed) {
                installed.push(wallet);
            }
            else {
                notInstalled.push(wallet);
            }
        }
        return installed.length ? [installed, notInstalled] : [notInstalled, []];
    }, [wallets]);
    const handleWalletClick = useCallback((event, walletName) => {
        select(walletName);
        setVisible(false);
    }, [select, setVisible]);
    const handleCollapseClick = useCallback(() => setExpanded(!expanded), [expanded]);
    return (_jsx(WalletModal, { className: className, container: container, visible: visible, onClose: () => setVisible(false), title: listedWallets.length ? "Select a Solana Wallet" : "You'll need a wallet on Solana to continue", children: listedWallets.length ? (_jsxs(_Fragment, { children: [_jsx("ul", { className: "wallet-adapter-modal-list", children: listedWallets.map((wallet) => (_jsx(WalletListItem, { name: wallet.adapter.name, icon: _jsx(WalletIcon, { wallet: wallet }), isInstalled: wallet.readyState === WalletReadyState.Installed, onClick: (event) => handleWalletClick(event, wallet.adapter.name) }, wallet.adapter.name))) }), _jsx("ul", { className: "wallet-adapter-modal-list", children: collapsedWallets.map((wallet) => (_jsx(WalletListItem, { name: wallet.adapter.name, icon: _jsx(WalletIcon, { wallet: wallet }), isInstalled: wallet.readyState === WalletReadyState.Installed, onClick: (event) => handleWalletClick(event, wallet.adapter.name), tabIndex: expanded ? 0 : -1 }, wallet.adapter.name))) })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "wallet-adapter-modal-middle", children: "icon" }), collapsedWallets.length ? (_jsxs(_Fragment, { children: [_jsxs("button", { className: "wallet-adapter-modal-list-more", onClick: handleCollapseClick, tabIndex: 0, children: [_jsxs("span", { children: [expanded ? 'Hide ' : 'Already have a wallet? View ', "options"] }), _jsx("svg", { width: "13", height: "7", viewBox: "0 0 13 7", xmlns: "http://www.w3.org/2000/svg", className: `${expanded ? 'wallet-adapter-modal-list-more-icon-rotate' : ''}`, children: _jsx("path", { d: "M0.71418 1.626L5.83323 6.26188C5.91574 6.33657 6.0181 6.39652 6.13327 6.43762C6.24844 6.47872 6.37371 6.5 6.50048 6.5C6.62725 6.5 6.75252 6.47872 6.8677 6.43762C6.98287 6.39652 7.08523 6.33657 7.16774 6.26188L12.2868 1.626C12.7753 1.1835 12.3703 0.5 11.6195 0.5H1.37997C0.629216 0.5 0.224175 1.1835 0.71418 1.626Z" }) })] }), _jsx("div", { children: "ANOTHER COLLAPSE" }), expanded && (_jsx("ul", { className: "wallet-adapter-modal-list", children: collapsedWallets.map((wallet) => (_jsx(WalletListItem, { name: wallet.adapter.name, icon: _jsx(WalletIcon, { wallet: wallet }), isInstalled: wallet.readyState === WalletReadyState.Installed, onClick: (event) => handleWalletClick(event, wallet.adapter.name), tabIndex: expanded ? 0 : -1 }, wallet.adapter.name))) }))] })) : null] })) }));
};
