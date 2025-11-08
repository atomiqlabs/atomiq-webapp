import type { FC, MouseEvent } from 'react';
import { WalletModal } from './WalletModal';
import { WalletListItem } from './WalletListItem';
import { WalletListData } from '../ChainDataProvider';

export interface GenericWalletModalProps<T = any> {
  visible: boolean;
  onClose: () => void;
  title: string;
  installedWallets: WalletListData[];
  notInstalledWallets?: WalletListData[];
  onWalletClick: (wallet: WalletListData, event: MouseEvent) => void;
  className?: string;
  container?: string;
}

export const GenericWalletModal: FC<GenericWalletModalProps> = ({
  visible,
  onClose,
  title,
  installedWallets,
  notInstalledWallets = [],
  onWalletClick,
  className = '',
  container = 'body',
}) => {
  return (
    <WalletModal
      className={className}
      container={container}
      visible={visible}
      onClose={onClose}
      title={title}
    >
      {installedWallets.length > 0 && (
        <ul className="wallet-adapter-modal-list">
          {installedWallets.map((wallet) => (
            <WalletListItem
              key={wallet.name}
              name={wallet.name}
              icon={wallet.icon}
              isInstalled={true}
              onClick={(event) => onWalletClick(wallet, event)}
            />
          ))}
        </ul>
      )}
      {notInstalledWallets.length > 0 && (
        <ul className="wallet-adapter-modal-list">
          {notInstalledWallets.map((wallet) => (
            <WalletListItem
              key={wallet.name}
              name={wallet.name}
              icon={wallet.icon}
              isInstalled={false}
              onClick={() => {
                window.location.href = wallet.downloadLink;
              }}
            />
          ))}
        </ul>
      )}
    </WalletModal>
  );
};
