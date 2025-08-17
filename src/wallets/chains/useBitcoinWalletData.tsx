import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ListGroup, Modal } from 'react-bootstrap';
import * as React from 'react';
import { useLocalStorage } from '../../utils/hooks/useLocalStorage';
import { useStateRef } from '../../utils/hooks/useStateRef';
import { ChainWalletData } from '../ChainDataProvider';
import { ExtensionBitcoinWallet } from './bitcoin/base/ExtensionBitcoinWallet';
import { BitcoinWalletType, getInstalledBitcoinWallets } from './bitcoin/utils/BitcoinWalletUtils';

function BitcoinWalletModal(props: {
  modalOpened: boolean;
  setModalOpened: (opened: boolean) => void;
  connectWallet: (wallet?: BitcoinWalletType) => void;
  usableWallets: BitcoinWalletType[];
  installableWallets: BitcoinWalletType[];
}) {
  return (
    <Modal
      contentClassName="wallet-adapter-modal-wrapper"
      size="sm"
      centered
      show={props.modalOpened}
      onHide={() => props.setModalOpened(false)}
      dialogClassName="wallet-modal"
      backdrop={false}
    >
      <Modal.Body>
        <button
          onClick={() => props.setModalOpened(false)}
          className="wallet-adapter-modal-button-close"
        >
          <svg width="14" height="14">
            <path d="M14 12.461 8.3 6.772l5.234-5.233L12.006 0 6.772 5.234 1.54 0 0 1.539l5.234 5.233L0 12.006l1.539 1.528L6.772 8.3l5.69 5.7L14 12.461z" />
          </svg>
        </button>
        <h1 className="wallet-adapter-modal-title">Select a Bitcoin Wallet</h1>
        <ul className="wallet-adapter-modal-list">
          {props.usableWallets.map((e) => (
            <li>
              <button
                className="wallet-modal__item"
                onClick={() => props.connectWallet(e)}
                key={e.name}
              >
                <img width={20} height={20} src={e.iconUrl} className="wallet-modal__item__icon" />
                {e.name}
                <div className="wallet-modal__item__status">Installed</div>
              </button>
            </li>
          ))}
        </ul>
        <ul className="wallet-adapter-modal-list">
          {props.installableWallets.map((e) => (
            <li>
              <button
                className="wallet-modal__item"
                onClick={() => props.connectWallet(e)}
                key={e.name}
              >
                <img width={20} height={20} src={e.iconUrl} className="wallet-modal__item__icon" />
                Install {e.name}
              </button>
            </li>
          ))}
        </ul>
      </Modal.Body>
    </Modal>
  );
}

export function useBitcoinWalletData(connectedOtherChainWallets: {
  [chainName: string]: string;
}): [ChainWalletData<ExtensionBitcoinWallet>, JSX.Element] {
  const [bitcoinWallet, setBitcoinWallet] = React.useState<ExtensionBitcoinWallet>(undefined);
  const [usableWallets, setUsableWallets] = useState<BitcoinWalletType[]>([]);
  const [installableWallets, setInstallableWallets] = useState<BitcoinWalletType[]>([]);

  const [autoConnect, setAutoConnect] = useLocalStorage<boolean>('btc-wallet-autoconnect', true);
  const bitcoinWalletRef = useStateRef(bitcoinWallet);

  const prevConnectedWalletRef = useRef<{ [chainName: string]: string }>({});

  useEffect(() => {
    for (let chainName in connectedOtherChainWallets) {
      const oldWalletName = prevConnectedWalletRef.current[chainName];
      const newWalletName = connectedOtherChainWallets[chainName];
      if (prevConnectedWalletRef.current[chainName] == connectedOtherChainWallets[chainName])
        continue;
      const activeWallet = ExtensionBitcoinWallet.loadState();
      if (oldWalletName != null && newWalletName == null && activeWallet?.name === oldWalletName) {
        setAutoConnect(true);
        if (bitcoinWalletRef.current != null && bitcoinWalletRef.current.wasAutomaticallyInitiated)
          disconnect(true);
      }
      prevConnectedWalletRef.current[chainName] = newWalletName;
      if (newWalletName == null) continue;
      if (!autoConnect) continue;
      if (usableWallets == null) continue;
      if (activeWallet == null) {
        const bitcoinWalletType = usableWallets.find(
          (walletType) => walletType.name === newWalletName
        );
        console.log(
          'useBitcoinWalletData(): useEffect(autoconnect): found matching bitcoin wallet: ',
          bitcoinWalletType
        );
        if (bitcoinWalletType != null)
          bitcoinWalletType
            .use({ multichainConnected: true })
            .then((wallet) => setBitcoinWallet(wallet))
            .catch((e) => {
              console.error(e);
            });
        return;
      }
    }
  }, [connectedOtherChainWallets, usableWallets]);

  useEffect(() => {
    getInstalledBitcoinWallets()
      .then((resp) => {
        setUsableWallets(resp.installed);
        setInstallableWallets(resp.installable);
        if (resp.active != null && bitcoinWallet == null) {
          resp
            .active()
            .then((wallet) => setBitcoinWallet(wallet))
            .catch((e) => {
              console.error(e);
            });
        }
      })
      .catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    if (bitcoinWallet == null) return;
    let listener: (newWallet: ExtensionBitcoinWallet) => void;
    bitcoinWallet.onWalletChanged(
      (listener = (newWallet: ExtensionBitcoinWallet) => {
        console.log(
          'useBitcoinWalletData(): useEffect(walletChangeListener): New bitcoin wallet set: ',
          newWallet
        );
        if (newWallet == null) {
          ExtensionBitcoinWallet.clearState();
          setBitcoinWallet(undefined);
          return;
        }
        if (bitcoinWallet.getReceiveAddress() === newWallet.getReceiveAddress()) return;
        setBitcoinWallet(newWallet);
      })
    );
    return () => {
      bitcoinWallet.offWalletChanged(listener);
    };
  }, [bitcoinWallet]);

  const connectWallet: (bitcoinWalletType: BitcoinWalletType) => Promise<void> = useCallback(
    async (bitcoinWalletType: BitcoinWalletType) => {
      const wallet = await bitcoinWalletType.use();
      return setBitcoinWallet(wallet);
    },
    []
  );

  const disconnect: (skipToggleAutoConnect?: boolean) => void = useCallback(
    (skipToggleAutoConnect?: boolean) => {
      if (
        skipToggleAutoConnect !== true &&
        bitcoinWalletRef.current != null &&
        bitcoinWalletRef.current.wasAutomaticallyInitiated
      )
        setAutoConnect(false);
      ExtensionBitcoinWallet.clearState();
      setBitcoinWallet(undefined);
    },
    []
  );

  const connect = useCallback(() => {
    if (usableWallets.length === 1) {
      connectWallet(usableWallets[0]).catch((e) => {
        console.error(e);
      });
      return;
    } else {
      setModalOpened(true);
    }
  }, [usableWallets]);

  const [modalOpened, setModalOpened] = useState<boolean>(false);
  const modal = useMemo(
    () => (
      <BitcoinWalletModal
        modalOpened={modalOpened}
        setModalOpened={setModalOpened}
        connectWallet={(wallet) => {
          connectWallet(wallet)
            .then(() => setModalOpened(false))
            .catch((err) => console.error(err));
        }}
        usableWallets={usableWallets}
        installableWallets={installableWallets}
      />
    ),
    [modalOpened, connectWallet, usableWallets, installableWallets]
  );

  return useMemo(
    () => [
      {
        chain: {
          name: 'Bitcoin',
          icon: '/icons/chains/BITCOIN.svg',
        },
        wallet:
          bitcoinWallet == null
            ? null
            : {
                name: bitcoinWallet.getName(),
                icon: bitcoinWallet.getIcon(),
                instance: bitcoinWallet,
                address: bitcoinWallet.getReceiveAddress(),
              },
        id: 'BITCOIN',
        connect: usableWallets.length > 0 || installableWallets.length > 0 ? connect : null,
        disconnect: bitcoinWallet != null ? disconnect : null,
        changeWallet: bitcoinWallet != null && usableWallets.length > 1 ? connect : null,
      },
      modal,
    ],
    [bitcoinWallet, usableWallets, installableWallets, connect, disconnect, modal]
  );
}
