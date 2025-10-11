import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { GenericWalletModal } from './GenericWalletModal';
import { useChainWalletData } from '../context/WalletSystemContext';
/**
 * Unified wallet modal that works for all chains
 * Reads wallet data from the global context based on chainId
 */
export const UnifiedWalletModal = ({ chainId, visible, onClose }) => {
    const chainWalletData = useChainWalletData(chainId);
    const title = useMemo(() => {
        const chainName = chainWalletData?.chainData?.chain?.name || chainId;
        return `Select a ${chainName} Wallet`;
    }, [chainWalletData, chainId]);
    if (!chainWalletData) {
        return null;
    }
    const { installedWallets, installableWallets, connectWallet } = chainWalletData;
    // If there are no wallets to show, don't render the modal
    if (installedWallets.length === 0 && installableWallets.length === 0) {
        return null;
    }
    return (_jsx(GenericWalletModal, { visible: visible, onClose: onClose, title: title, installedWallets: installedWallets, notInstalledWallets: installableWallets, onWalletClick: (wallet) => {
            connectWallet(wallet).catch((err) => {
                console.error(`Failed to connect wallet for ${chainId}:`, err);
            });
        } }));
};
