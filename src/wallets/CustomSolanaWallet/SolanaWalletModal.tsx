import { WalletReadyState } from '@solana/wallet-adapter-base';
import type { Wallet } from '@solana/wallet-adapter-react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { FC } from 'react';
import { useCallback, useMemo } from 'react';
import { useWalletModal, WalletModalProps, WalletIcon } from '@solana/wallet-adapter-react-ui';
import { GenericWalletModal, WalletOption } from '../shared/GenericWalletModal';

export const SolanaWalletModal: FC<WalletModalProps> = ({ className = '', container = 'body' }) => {
  const { wallets, select } = useWallet();
  const { visible, setVisible } = useWalletModal();

  const [installedWallets, notInstalledWallets] = useMemo(() => {
    const installed: WalletOption<Wallet>[] = [];
    const notInstalled: WalletOption<Wallet>[] = [];

    for (const wallet of wallets) {
      const option: WalletOption<Wallet> = {
        name: wallet.adapter.name,
        icon: <WalletIcon wallet={wallet} />,
        data: wallet,
      };

      if (wallet.readyState === WalletReadyState.Installed) {
        installed.push(option);
      } else {
        notInstalled.push(option);
      }
    }

    return [installed, notInstalled];
  }, [wallets]);

  const handleWalletClick = useCallback(
    (wallet: WalletOption<Wallet>) => {
      select(wallet.data.adapter.name);
      setVisible(false);
    },
    [select, setVisible]
  );

  return (
    <GenericWalletModal
      className={className}
      container={container}
      visible={visible}
      onClose={() => setVisible(false)}
      title={
        installedWallets.length
          ? 'Select a Solana Wallet'
          : "You'll need a wallet on Solana to continue"
      }
      installedWallets={installedWallets}
      notInstalledWallets={notInstalledWallets}
      onWalletClick={handleWalletClick}
    />
  );
};
