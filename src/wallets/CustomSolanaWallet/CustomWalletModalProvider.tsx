import type { FC, ReactNode } from 'react';
import { useState } from 'react';
import { WalletModalContext, WalletModalProviderProps } from '@solana/wallet-adapter-react-ui';
import { SolanaWalletModal } from './SolanaWalletModal';

export const CustomWalletModalProvider: FC<WalletModalProviderProps> = ({ children, ...props }) => {
  const [visible, setVisible] = useState(false);

  return (
    <WalletModalContext.Provider
      value={{
        visible,
        setVisible,
      }}
    >
      {children}
      {visible && <SolanaWalletModal {...props} />}
    </WalletModalContext.Provider>
  );
};
