import { jsx as _jsx } from "react/jsx-runtime";
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useMemo } from 'react';
import { useWalletModal, WalletIcon } from '@solana/wallet-adapter-react-ui';
import { GenericWalletModal } from '../shared/GenericWalletModal';
export const SolanaWalletModal = ({ className = '', container = 'body' }) => {
    const { wallets, select } = useWallet();
    const { visible, setVisible } = useWalletModal();
    const [installedWallets, notInstalledWallets] = useMemo(() => {
        const installed = [];
        const notInstalled = [];
        for (const wallet of wallets) {
            const option = {
                name: wallet.adapter.name,
                icon: _jsx(WalletIcon, { wallet: wallet }),
                data: wallet,
            };
            if (wallet.readyState === WalletReadyState.Installed) {
                installed.push(option);
            }
            else {
                notInstalled.push(option);
            }
        }
        return [installed, notInstalled];
    }, [wallets]);
    const handleWalletClick = useCallback((wallet) => {
        select(wallet.data.adapter.name);
        setVisible(false);
    }, [select, setVisible]);
    return (_jsx(GenericWalletModal, { className: className, container: container, visible: visible, onClose: () => setVisible(false), title: installedWallets.length
            ? 'Select a Solana Wallet'
            : "You'll need a wallet on Solana to continue", installedWallets: installedWallets, notInstalledWallets: notInstalledWallets, onWalletClick: handleWalletClick }));
};
