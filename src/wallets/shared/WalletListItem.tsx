import type { FC, MouseEvent, ReactNode } from 'react';

export interface WalletListItemProps {
  name: string;
  icon: string | ReactNode;
  isInstalled: boolean;
  onClick: (event: MouseEvent) => void;
  tabIndex?: number;
}

export const WalletListItem: FC<WalletListItemProps> = ({
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
