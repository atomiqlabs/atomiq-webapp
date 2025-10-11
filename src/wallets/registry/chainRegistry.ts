/**
 * Chain Registry
 *
 * Central registry of all blockchain configurations and hooks.
 * Each chain is defined once here, then used throughout the system.
 */

import { bitcoinConfig } from '../configs/bitcoinConfig';
import { lightningConfig } from '../configs/lightningConfig';
import { starknetConfig } from '../configs/starknetConfig';
import { useGenericChainWallet } from '../hooks/useGenericChainWallet';
import { useSolanaWalletData } from '../chains/useSolanaWalletData';
import { StandardChainHookResult } from '../types/ChainHookTypes';
import { ExtensionBitcoinWallet } from '../chains/bitcoin/base/ExtensionBitcoinWallet';
import { WebLNProvider } from 'webln';
import { StarknetSigner } from '@atomiqlabs/chain-starknet';
import { SolanaSigner } from '@atomiqlabs/chain-solana';
import { StarknetWalletData } from '../configs/starknetConfig';

/**
 * Wrapper hooks for each chain
 * These hooks use either useGenericChainWallet (with config) or custom hook (Solana)
 */

export function useBitcoinWallet(
  connectedWallets?: Record<string, string>
): StandardChainHookResult<ExtensionBitcoinWallet> {
  return useGenericChainWallet(bitcoinConfig, { connectedWallets });
}

export function useLightningWallet(): StandardChainHookResult<WebLNProvider> {
  return useGenericChainWallet(lightningConfig);
}

export function useStarknetWallet(): StandardChainHookResult<StarknetSigner> {
  return useGenericChainWallet(starknetConfig);
}

/**
 * Solana is special - uses @solana/wallet-adapter-react hooks
 * We use the existing custom hook instead of generic one
 */
export function useSolanaWallet(): StandardChainHookResult<SolanaSigner> {
  return useSolanaWalletData();
}

