import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SolanaWalletWrapper } from './chains/useSolanaWalletData';
import { ChainDataContext } from './context/ChainDataContext';
import { WalletSystemContext } from './context/WalletSystemContext';
import { useWalletSystem } from './hooks/useWalletSystem';
import { UnifiedWalletModal } from './shared/UnifiedWalletModal';
function WrappedChainDataProvider(props) {
    const { wallets, walletSystemContext } = useWalletSystem();
    return (_jsx(WalletSystemContext.Provider, { value: walletSystemContext, children: _jsxs(ChainDataContext.Provider, { value: wallets, children: [Object.keys(walletSystemContext.chains).map((chainId) => {
                    const chain = walletSystemContext.chains[chainId];
                    if (!chain)
                        return null;
                    return (_jsx(UnifiedWalletModal, { chainId: chainId, visible: chain.isModalOpen, onClose: chain.closeModal }, chainId));
                }), props.children] }) }));
}
export function ChainDataProvider(props) {
    return (_jsx(SolanaWalletWrapper, { children: _jsx(WrappedChainDataProvider, { children: props.children }) }));
}
