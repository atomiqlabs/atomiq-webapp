import { useMemo } from 'react';
import { ChainWalletData } from '../ChainDataProvider';
import { useSolanaWalletData } from '../chains/useSolanaWalletData';
import { useStarknetWalletData } from '../chains/useStarknetWalletData';
import { useLightningWalletData } from '../chains/useLightningWalletData';
import { useBitcoinWalletData } from '../chains/useBitcoinWalletData';

// Configuration that can be easily modified to enable/disable wallets
export interface WalletSystemConfig {
  enableSolana: boolean;
  enableStarknet: boolean;
  enableLightning: boolean;
  enableBitcoin: boolean;
}

const DEFAULT_CONFIG: WalletSystemConfig = {
  enableSolana: true,
  enableStarknet: true,
  enableLightning: true,
  enableBitcoin: true,
};

export function useChainWalletSystem(
  config: WalletSystemConfig = DEFAULT_CONFIG
): Record<string, ChainWalletData<any>> {
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
    const chainsData: Record<string, ChainWalletData<any>> = {};

    // Add wallets and chain data based on configuration
    if (config.enableSolana && solanaResult) chainsData.SOLANA = solanaResult;
    if (config.enableStarknet && starknetResult) chainsData.STARKNET = starknetResult;
    if (config.enableLightning && lightningResult) chainsData.LIGHTNING = lightningResult;
    if (config.enableBitcoin && bitcoinResult) chainsData.BITCOIN = bitcoinResult;

    return chainsData;
  }, [config, solanaResult, starknetResult, lightningResult, bitcoinResult]);
}
