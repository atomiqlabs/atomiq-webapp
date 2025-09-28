import { useBitcoinWalletData } from '../chains/useBitcoinWalletData';
import { useSolanaWalletData } from '../chains/useSolanaWalletData';
import { useStarknetWalletData } from '../chains/useStarknetWalletData';
import { useLightningWalletData } from '../chains/useLightningWalletData';
import { ChainWalletData } from '../ChainDataProvider';
import { ReactNode } from 'react';

export interface WalletConfig<T = any> {
  id: string;
  name: string;
  useWalletData: (connectedWallets?: Record<string, string>) => [ChainWalletData<T>, ReactNode?];
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;
  dependencies?: string[]; // Other wallet IDs this wallet depends on
}

// Centralized wallet configuration
export const WALLET_CONFIGS: WalletConfig[] = [
  {
    id: 'SOLANA',
    name: 'Solana',
    useWalletData: useSolanaWalletData,
    dependencies: [],
  },
  {
    id: 'STARKNET',
    name: 'Starknet',
    useWalletData: useStarknetWalletData,
    dependencies: [],
  },
  {
    id: 'LIGHTNING',
    name: 'Lightning',
    useWalletData: useLightningWalletData,
    dependencies: [],
  },
  {
    id: 'BITCOIN',
    name: 'Bitcoin',
    useWalletData: useBitcoinWalletData,
    dependencies: ['STARKNET', 'SOLANA'], // Bitcoin wallet can auto-connect based on other chains
  },
];

// Helper to get wallet config by ID
export const getWalletConfig = (id: string): WalletConfig | undefined => {
  return WALLET_CONFIGS.find((config) => config.id === id);
};

// Helper to get all enabled wallet configs (you can add feature flags here)
export const getEnabledWalletConfigs = (): WalletConfig[] => {
  // You can add feature flag logic here later
  return WALLET_CONFIGS;
};

// NOTE: Due to React's Rules of Hooks, we cannot dynamically call hooks in loops.
// For now, we use a configurable system in useConfigurableWalletSystem.tsx
// To add new wallets:
// 1. Add the wallet hook to useConfigurableWalletSystem.tsx
// 2. Add a config flag in WalletSystemConfig
// 3. Update the logic to conditionally include the wallet
//
// Future: Consider using React Context or other patterns for true dynamic wallet loading
