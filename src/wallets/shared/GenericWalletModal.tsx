import type { FC, MouseEvent, ReactNode } from 'react';
import { WalletModal } from './WalletModal';
import { WalletListItem } from './WalletListItem';

export interface WalletOption<T = any> {
  name: string;
  icon: string | ReactNode;
  data: T;
}

export interface GenericWalletModalProps<T = any> {
  visible: boolean;
  onClose: () => void;
  title: string;
  installedWallets: WalletOption<T>[];
  notInstalledWallets?: WalletOption<T>[];
  onWalletClick: (wallet: WalletOption<T>, event: MouseEvent) => void;
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
              onClick={(event) => onWalletClick(wallet, event)}
            />
          ))}
        </ul>
      )}
    </WalletModal>
  );
};