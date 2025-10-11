import { createContext, useContext } from 'react';
export const WalletSystemContext = createContext(undefined);
/**
 * Hook to access the wallet system context
 */
export function useWalletSystemContext() {
    const context = useContext(WalletSystemContext);
    if (!context) {
        throw new Error('useWalletSystemContext must be used within a WalletSystemProvider');
    }
    return context;
}
/**
 * Hook to access a specific chain's wallet data
 */
export function useChainWalletData(chainId) {
    const { chains } = useWalletSystemContext();
    return chains[chainId];
}
