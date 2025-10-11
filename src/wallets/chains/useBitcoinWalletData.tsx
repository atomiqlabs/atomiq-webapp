import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as React from 'react';
import { useLocalStorage } from '../../utils/hooks/useLocalStorage';
import { useStateRef } from '../../utils/hooks/useStateRef';
import { ChainWalletData } from '../ChainDataProvider';
import { ExtensionBitcoinWallet } from './bitcoin/base/ExtensionBitcoinWallet';
import { BitcoinWalletType, getInstalledBitcoinWallets } from './bitcoin/utils/BitcoinWalletUtils';
import { StandardChainHookResult, ChainWalletOption } from '../types/ChainHookTypes';

export function useBitcoinWalletData(connectedOtherChainWallets: {
  [chainName: string]: string;
}): StandardChainHookResult<ExtensionBitcoinWallet> {
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

  const [modalOpened, setModalOpened] = useState<boolean>(false);

  const openModal = useCallback(() => {
    setModalOpened(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpened(false);
  }, []);

  const connect = useCallback(() => {
    if (usableWallets.length === 1) {
      connectWallet(usableWallets[0]).catch((e) => {
        console.error(e);
      });
      return;
    } else {
      openModal();
    }
  }, [usableWallets, connectWallet, openModal]);

  // Convert BitcoinWalletType to ChainWalletOption
  const installedWalletOptions = useMemo<ChainWalletOption<BitcoinWalletType>[]>(
    () => usableWallets.map((wallet) => ({ name: wallet.name, icon: wallet.iconUrl, data: wallet })),
    [usableWallets]
  );

  const installableWalletOptions = useMemo<ChainWalletOption<BitcoinWalletType>[]>(
    () => installableWallets.map((wallet) => ({ name: wallet.name, icon: wallet.iconUrl, data: wallet })),
    [installableWallets]
  );

  const connectWalletOption = useCallback(
    async (wallet: ChainWalletOption<BitcoinWalletType>) => {
      await connectWallet(wallet.data);
      closeModal();
    },
    [connectWallet, closeModal]
  );

  console.log(bitcoinWallet);

  const chainData = useMemo<ChainWalletData<ExtensionBitcoinWallet>>(
    () => ({
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
    }),
    [bitcoinWallet, usableWallets, installableWallets, connect, disconnect]
  );

  return useMemo(
    () => ({
      chainData,
      installedWallets: installedWalletOptions,
      installableWallets: installableWalletOptions,
      connectWallet: connectWalletOption,
      openModal,
      closeModal,
      isModalOpen: modalOpened,
    }),
    [chainData, installedWalletOptions, installableWalletOptions, connectWalletOption, openModal, closeModal, modalOpened]
  );
}
