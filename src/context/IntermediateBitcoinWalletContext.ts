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

  downloadMnemonicBackup: () => void;
  recoverMnemonicBackup: (file: File) => Promise<void>;
  backupAcknowledged: boolean;
  acknowledgeBackup: () => void;

  loading: boolean;
  error?: Error;
};

export const IntermediateBitcoinWalletContext =
  createContext<IntermediateBitcoinWalletContextValue | undefined>(undefined);
