import { createContext, useContext } from 'react';
import { StandardChainHookResult } from '../types/ChainHookTypes';
import { ChainIdentifiers } from './ChainDataContext';

/**
 * Global context that stores wallet data for all chains
 * Each chain hook will populate its entry in this dictionary
 */
export interface WalletSystemContextType {
  chains: {
    [chainId in ChainIdentifiers]?: StandardChainHookResult<any>;
  };
}

export const WalletSystemContext = createContext<WalletSystemContextType | undefined>(undefined);

/**
 * Hook to access the wallet system context
 */
export function useWalletSystemContext(): WalletSystemContextType {
  const context = useContext(WalletSystemContext);
  if (!context) {
    throw new Error('useWalletSystemContext must be used within a WalletSystemProvider');
  }
  return context;
}

/**
 * Hook to access a specific chain's wallet data
 */
export function useChainWalletData(chainId: ChainIdentifiers): StandardChainHookResult<any> | undefined {
  const { chains } = useWalletSystemContext();
  return chains[chainId];
}