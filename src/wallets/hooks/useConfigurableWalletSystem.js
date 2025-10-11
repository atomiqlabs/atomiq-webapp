import { useMemo } from 'react';
import { useSolanaWallet, useStarknetWallet, useLightningWallet, useBitcoinWallet, } from '../registry/chainRegistry';
const DEFAULT_CONFIG = {
    enableSolana: true,
    enableStarknet: true,
    enableLightning: true,
    enableBitcoin: true,
};
export function useConfigurableWalletSystem(config = DEFAULT_CONFIG) {
    // Call all wallet hooks unconditionally using chain registry
    // All hooks now use either useGenericChainWallet (with config) or custom implementation (Solana)
    const solanaResult = useSolanaWallet();
    const starknetResult = useStarknetWallet();
    const lightningResult = useLightningWallet();
    // Collect connected wallets for Bitcoin dependencies
    const connectedWallets = useMemo(() => ({
        STARKNET: config.enableStarknet ? starknetResult?.chainData?.wallet?.name : undefined,
        SOLANA: config.enableSolana ? solanaResult?.chainData?.wallet?.name : undefined,
    }), [
        config.enableStarknet,
        config.enableSolana,
        starknetResult?.chainData?.wallet?.name,
        solanaResult?.chainData?.wallet?.name,
    ]);
    const bitcoinResult = useBitcoinWallet(connectedWallets);
    return useMemo(() => {
        const wallets = {};
        const chains = {};
        // Add wallets and chain data based on configuration
        if (config.enableSolana && solanaResult?.chainData) {
            wallets.SOLANA = solanaResult.chainData;
            chains.SOLANA = solanaResult;
        }
        if (config.enableStarknet && starknetResult?.chainData) {
            wallets.STARKNET = starknetResult.chainData;
            chains.STARKNET = starknetResult;
        }
        if (config.enableLightning && lightningResult?.chainData) {
            wallets.LIGHTNING = lightningResult.chainData;
            chains.LIGHTNING = lightningResult;
        }
        if (config.enableBitcoin && bitcoinResult?.chainData) {
            wallets.BITCOIN = bitcoinResult.chainData;
            chains.BITCOIN = bitcoinResult;
        }
        return {
            wallets,
            walletSystemContext: { chains },
        };
    }, [config, solanaResult, starknetResult, lightningResult, bitcoinResult]);
}
// Convenience hook with default config
export const useWalletSystem = () => useConfigurableWalletSystem();
