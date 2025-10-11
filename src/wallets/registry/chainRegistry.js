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
/**
 * Wrapper hooks for each chain
 * These hooks use either useGenericChainWallet (with config) or custom hook (Solana)
 */
export function useBitcoinWallet(connectedWallets) {
    return useGenericChainWallet(bitcoinConfig, { connectedWallets });
}
export function useLightningWallet() {
    return useGenericChainWallet(lightningConfig);
}
export function useStarknetWallet() {
    return useGenericChainWallet(starknetConfig);
}
/**
 * Solana is special - uses @solana/wallet-adapter-react hooks
 * We use the existing custom hook instead of generic one
 */
export function useSolanaWallet() {
    return useSolanaWalletData();
}
