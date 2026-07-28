import { createContext } from 'react';
import {Chain, ChainIdentifiers, WalletTypes} from '../providers/ChainsProvider';

export const ChainsContext: React.Context<{
  loadError?: Error,
  chains: {
    [chain in ChainIdentifiers]?: Chain<WalletTypes[chain]>;
  };
  connectWallet: (chainIdentifier: string) => Promise<boolean>;
  disconnectWallet: (chainIdentifier: string) => Promise<void>;
  changeWallet: (chainIdentifier: string) => Promise<void>;
}> = createContext(undefined);
