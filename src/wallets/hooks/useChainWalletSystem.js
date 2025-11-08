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
export function useChainWalletSystem(config = DEFAULT_CONFIG) {
    // Call all wallet hooks unconditionally using chain registry
    // All hooks now use either useGenericChainWallet (with config) or custom implementation (Solana)
    const solanaResult = useSolanaWalletData(config.enableSolana);
    const starknetResult = useStarknetWalletData(config.enableStarknet);
    const lightningResult = useLightningWalletData(config.enableLightning);
    const bitcoinResult = useBitcoinWalletData(config.enableBitcoin, {
        STARKNET: starknetResult?.wallet?.name,
        SOLANA: solanaResult?.wallet?.name,
    });
    return useMemo(() => {
        const chainsData = {};
        // Add wallets and chain data based on configuration
        if (config.enableSolana && solanaResult)
            chainsData.SOLANA = solanaResult;
        if (config.enableStarknet && starknetResult)
            chainsData.STARKNET = starknetResult;
        if (config.enableLightning && lightningResult)
            chainsData.LIGHTNING = lightningResult;
        if (config.enableBitcoin && bitcoinResult)
            chainsData.BITCOIN = bitcoinResult;
        return chainsData;
    }, [config, solanaResult, starknetResult, lightningResult, bitcoinResult]);
}
