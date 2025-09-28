import type { WalletName } from '@solana/wallet-adapter-base';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import type { Wallet } from '@solana/wallet-adapter-react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { FC, MouseEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useWalletModal, WalletModalProps, WalletIcon } from '@solana/wallet-adapter-react-ui';
import { WalletModal } from '../shared/WalletModal';
import { WalletListItem } from '../shared/WalletListItem';
export const CustomWalletModal: FC<WalletModalProps> = ({ className = '', container = 'body' }) => {
  const { wallets, select } = useWallet();
  const { visible, setVisible } = useWalletModal();
  const [expanded, setExpanded] = useState(false);

  const [listedWallets, collapsedWallets] = useMemo(() => {
    const installed: Wallet[] = [];
    const notInstalled: Wallet[] = [];

    for (const wallet of wallets) {
      if (wallet.readyState === WalletReadyState.Installed) {
        installed.push(wallet);
      } else {
        notInstalled.push(wallet);
      }
    }

    return installed.length ? [installed, notInstalled] : [notInstalled, []];
  }, [wallets]);

  const handleWalletClick = useCallback(
    (event: MouseEvent, walletName: WalletName) => {
      select(walletName);
      setVisible(false);
    },
    [select, setVisible]
  );

  const handleCollapseClick = useCallback(() => setExpanded(!expanded), [expanded]);

  return (
    <WalletModal
      className={className}
      container={container}
      visible={visible}
      onClose={() => setVisible(false)}
      title={listedWallets.length ? "Select a Solana Wallet" : "You'll need a wallet on Solana to continue"}
    >
      {listedWallets.length ? (
        <>
          <ul className="wallet-adapter-modal-list">
            {listedWallets.map((wallet) => (
              <WalletListItem
                key={wallet.adapter.name}
                name={wallet.adapter.name}
                icon={<WalletIcon wallet={wallet} />}
                isInstalled={wallet.readyState === WalletReadyState.Installed}
                onClick={(event) => handleWalletClick(event, wallet.adapter.name)}
              />
            ))}
          </ul>
          <ul className="wallet-adapter-modal-list">
            {collapsedWallets.map((wallet) => (
              <WalletListItem
                key={wallet.adapter.name}
                name={wallet.adapter.name}
                icon={<WalletIcon wallet={wallet} />}
                isInstalled={wallet.readyState === WalletReadyState.Installed}
                onClick={(event) => handleWalletClick(event, wallet.adapter.name)}
                tabIndex={expanded ? 0 : -1}
              />
            ))}
          </ul>
        </>
      ) : (
        <>
          <div className="wallet-adapter-modal-middle">icon</div>
          {collapsedWallets.length ? (
            <>
              <button
                className="wallet-adapter-modal-list-more"
                onClick={handleCollapseClick}
                tabIndex={0}
              >
                <span>{expanded ? 'Hide ' : 'Already have a wallet? View '}options</span>
                <svg
                  width="13"
                  height="7"
                  viewBox="0 0 13 7"
                  xmlns="http://www.w3.org/2000/svg"
                  className={`${
                    expanded ? 'wallet-adapter-modal-list-more-icon-rotate' : ''
                  }`}
                >
                  <path d="M0.71418 1.626L5.83323 6.26188C5.91574 6.33657 6.0181 6.39652 6.13327 6.43762C6.24844 6.47872 6.37371 6.5 6.50048 6.5C6.62725 6.5 6.75252 6.47872 6.8677 6.43762C6.98287 6.39652 7.08523 6.33657 7.16774 6.26188L12.2868 1.626C12.7753 1.1835 12.3703 0.5 11.6195 0.5H1.37997C0.629216 0.5 0.224175 1.1835 0.71418 1.626Z" />
                </svg>
              </button>
              <div>ANOTHER COLLAPSE</div>
              {expanded && (
                <ul className="wallet-adapter-modal-list">
                  {collapsedWallets.map((wallet) => (
                    <WalletListItem
                      key={wallet.adapter.name}
                      name={wallet.adapter.name}
                      icon={<WalletIcon wallet={wallet} />}
                      isInstalled={wallet.readyState === WalletReadyState.Installed}
                      onClick={(event) => handleWalletClick(event, wallet.adapter.name)}
                      tabIndex={expanded ? 0 : -1}
                    />
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </>
      )}
    </WalletModal>
  );
};
