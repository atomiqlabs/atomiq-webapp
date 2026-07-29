import { createContext } from 'react';
import type { SingleAddressBitcoinWallet } from '@atomiqlabs/sdk';

export type IntermediateBitcoinWalletBalance = {
  confirmedBalance: bigint;
  unconfirmedBalance: bigint;
};

export type IntermediateBitcoinWalletContextValue = {
  wallet?: SingleAddressBitcoinWallet;
  address?: string;

  confirmedBalance?: bigint;
  unconfirmedBalance?: bigint;
  refreshBalance: () => Promise<IntermediateBitcoinWalletBalance | undefined>;

  backupAcknowledged: boolean;
  openMnemonicBackupModal: () => void;
  openSendBitcoinModal: () => void;

  loading: boolean;
  error?: Error;
};

export const IntermediateBitcoinWalletContext =
  createContext<IntermediateBitcoinWalletContextValue | undefined>(undefined);
