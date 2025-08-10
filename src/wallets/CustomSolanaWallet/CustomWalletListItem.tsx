import { WalletReadyState } from '@solana/wallet-adapter-base';
import type { FC } from 'react';
import { WalletListItemProps } from '@solana/wallet-adapter-react-ui/lib/types/WalletListItem';
import { WalletIcon } from '@solana/wallet-adapter-react-ui';

export const CustomWalletListItem: FC<WalletListItemProps> = ({
  handleClick,
  tabIndex,
  wallet,
}) => {
  return (
    <li>
      <button onClick={handleClick} tabIndex={tabIndex}>
        <WalletIcon wallet={wallet} />
        {wallet.adapter.name}
        {wallet.readyState === WalletReadyState.Installed && <span>Detected</span>}
      </button>
    </li>
  );
};
