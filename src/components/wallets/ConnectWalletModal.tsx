import {FC, MouseEvent, ReactNode, useCallback, useState} from 'react';
import { GenericModal } from '../common/GenericModal';
import { WalletListData } from '../../providers/ChainsProvider';
import {Spinner} from "react-bootstrap";
import * as React from "react";

export const WalletListItem: FC<{
  name: string;
  icon: string | ReactNode;
  isInstalled: boolean | string;
  onClick: (event: MouseEvent) => Promise<void> | void;
  tabIndex?: number;
}> = ({ name, icon, isInstalled, onClick, tabIndex = 0 }) => {
  const [loading, setLoading] = useState<boolean>(false);

  return (
    <li>
      <button className="wallet-modal__item" onClick={(event) => {
        const maybePromise = onClick(event);
        if(maybePromise==null) return;
        setLoading(true);
        (maybePromise as Promise<void>)
          .then(() => setLoading(false))
          .catch((e) => {
            setLoading(false);
            console.error("Connect wallet modal error: ", e);
          })
      }} tabIndex={tabIndex}>
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
        {isInstalled && (
          loading
            ? <Spinner animation="border" size="sm" className="ms-auto" />
            : <div
              className="wallet-modal__item__status">{typeof (isInstalled) === 'string' ? isInstalled : 'Installed'}</div>
        )}
      </button>
    </li>
  );
};

export interface ConnectWalletModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  installedWallets: WalletListData[];
  notInstalledWallets?: WalletListData[];
  onWalletClick: (wallet: WalletListData, event: MouseEvent) => Promise<void>;
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
    <GenericModal
      className={`wallet-modal ${className}`}
      container={container}
      visible={visible}
      onClose={onClose}
      title={title}
      size="sm"
    >
      {installedWallets.length > 0 && (
        <ul className="wallet-adapter-modal-list">
          {installedWallets.map((wallet) => (
            <WalletListItem
              key={wallet.name}
              name={wallet.name}
              icon={wallet.icon}
              isInstalled={wallet.overrideInstalledStatusText ?? true}
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
                window.open(wallet.downloadLink, '_blank', 'noopener,noreferrer');
              }}
            />
          ))}
        </ul>
      )}
    </GenericModal>
  );
};
