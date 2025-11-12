import type {FC, MouseEvent, ReactNode} from 'react';
import { WalletModal } from './WalletModal';
import { WalletListData } from '../../providers/ChainsProvider';

export const WalletListItem: FC<{
  name: string;
  icon: string | ReactNode;
  isInstalled: boolean;
  onClick: (event: MouseEvent) => void;
  tabIndex?: number;
}> = ({
  name,
  icon,
  isInstalled,
  onClick,
  tabIndex = 0,
}) => {
  return (
    <li>
      <button className="wallet-modal__item" onClick={onClick} tabIndex={tabIndex}>
        {typeof icon === 'string' ? (
          <img
            width={20}
            height={20}
            src={icon}
            className="wallet-modal__item__icon"
            alt={`${name} icon`}
          />
        ) : (
          <div className="wallet-modal__item__icon">{icon}</div>
        )}
        {!isInstalled && 'Install '}
        {name}
        {isInstalled && <div className="wallet-modal__item__status">Installed</div>}
      </button>
    </li>
  );
};

export interface ConnectWalletModalProps<T = any> {
  visible: boolean;
  onClose: () => void;
  title: string;
  installedWallets: WalletListData[];
  notInstalledWallets?: WalletListData[];
  onWalletClick: (wallet: WalletListData, event: MouseEvent) => void;
  className?: string;
  container?: string;
}

export const ConnectWalletModal: FC<ConnectWalletModalProps> = ({
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
