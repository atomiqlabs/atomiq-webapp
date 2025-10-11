import { ReactNode } from 'react';
import { ChainWalletData } from '../ChainDataProvider';

/**
 * Represents a wallet option that can be installed or is already installed
 */
export interface ChainWalletOption<T = any> {
  name: string;
  icon: string | ReactNode;
  data: T;
}

/**
 * Standardized result from chain wallet hooks
 * All chain hooks should return this interface to ensure consistency
 */
export interface StandardChainHookResult<T> {
  /** Current wallet connection data for the chain */
  chainData: ChainWalletData<T>;

  /** List of wallets that are installed and ready to use */
  installedWallets: ChainWalletOption[];

  /** List of wallets that can be installed */
  installableWallets: ChainWalletOption[];

  /** Function to connect a specific wallet */
  connectWallet: (wallet: ChainWalletOption) => Promise<void>;

  /** Function to open the wallet selection modal */
  openModal: () => void;

  /** Function to close the wallet selection modal */
  closeModal: () => void;

  /** Whether the wallet selection modal is currently open */
  isModalOpen: boolean;
}
