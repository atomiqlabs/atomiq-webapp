import { useContext } from 'react';
import { IntermediateBitcoinWalletContext } from '../../context/IntermediateBitcoinWalletContext';

export function useIntermediateBitcoinWallet() {
  const value = useContext(IntermediateBitcoinWalletContext);
  if (value == null) {
    throw new Error(
      'useIntermediateBitcoinWallet must be used within IntermediateBitcoinWalletProvider'
    );
  }
  return value;
}
