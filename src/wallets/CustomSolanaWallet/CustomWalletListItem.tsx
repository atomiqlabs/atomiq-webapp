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
      <button className="wallet-modal__item" onClick={handleClick} tabIndex={tabIndex}>
        <WalletIcon className="wallet-modal__item__icon" wallet={wallet} />
        {wallet.readyState !== WalletReadyState.Installed ? 'Install ' : ''}
        {wallet.adapter.name}
        {wallet.readyState === WalletReadyState.Installed && (
          <div className="wallet-modal__item__status">Installed TODO connect s argumentom</div>
        )}
      </button>
    </li>
  );
};
