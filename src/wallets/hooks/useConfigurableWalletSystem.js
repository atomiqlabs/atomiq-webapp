import { useMemo } from 'react';
import { useSolanaWalletData } from '../chains/useSolanaWalletData';
import { useStarknetWalletData } from '../chains/useStarknetWalletData';
import { useLightningWalletData } from '../chains/useLightningWalletData';
import { useBitcoinWalletData } from '../chains/useBitcoinWalletData';
const DEFAULT_CONFIG = {
    enableSolana: true,
    enableStarknet: true,
    enableLightning: true,
    enableBitcoin: true,
};
export function useConfigurableWalletSystem(config = DEFAULT_CONFIG) {
    // Call all wallet hooks unconditionally
    const [solanaChain] = useSolanaWalletData();
    const [starknetChain] = useStarknetWalletData();
    const [lightningChain] = useLightningWalletData();
    // Collect connected wallets for Bitcoin dependencies
    const connectedWallets = useMemo(() => ({
        STARKNET: config.enableStarknet ? starknetChain?.wallet?.name : undefined,
        SOLANA: config.enableSolana ? solanaChain?.wallet?.name : undefined,
    }), [
        config.enableStarknet,
        config.enableSolana,
        starknetChain?.wallet?.name,
        solanaChain?.wallet?.name,
    ]);
    const [bitcoinChain, bitcoinModal] = useBitcoinWalletData(connectedWallets);
    return useMemo(() => {
        const wallets = {};
        const modals = [];
        // Add wallets based on configuration
        if (config.enableSolana && solanaChain) {
            wallets.SOLANA = solanaChain;
        }
        if (config.enableStarknet && starknetChain) {
            wallets.STARKNET = starknetChain;
        }
        if (config.enableLightning && lightningChain) {
            wallets.LIGHTNING = lightningChain;
        }
        if (config.enableBitcoin && bitcoinChain) {
            wallets.BITCOIN = bitcoinChain;
        }
        // Add modals for enabled wallets
        if (config.enableBitcoin && bitcoinModal) {
            modals.push(bitcoinModal);
        }
        return { wallets, modals };
    }, [config, solanaChain, starknetChain, lightningChain, bitcoinChain, bitcoinModal]);
}
// Convenience hook with default config
export const useWalletSystem = () => useConfigurableWalletSystem();
