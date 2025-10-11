import { useCallback, useMemo, useState } from "react";
import { requestProvider, WebLNProvider } from "webln";
import { ChainWalletData } from "../ChainDataProvider";
import { StandardChainHookResult, ChainWalletOption } from '../types/ChainHookTypes';

export function useLightningWalletData(): StandardChainHookResult<WebLNProvider> {
  const isWebLNInstalled = (window as any)?.webln != null;
  const [wallet, setWallet] = useState<WebLNProvider>();
  const [modalOpened, setModalOpened] = useState<boolean>(false);

  const openModal = useCallback(() => {
    setModalOpened(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpened(false);
  }, []);

  const connect = useCallback(async () => {
    setWallet(await requestProvider());
  }, []);

  const disconnect = useCallback(() => {
    setWallet(null);
  }, []);

  // Lightning uses WebLN's built-in modal, so we return empty arrays
  const installedWalletOptions = useMemo<ChainWalletOption[]>(() => [], []);
  const installableWalletOptions = useMemo<ChainWalletOption[]>(() => [], []);

  const connectWallet = useCallback(async (_wallet: ChainWalletOption) => {
    // Not used for Lightning - uses WebLN modal
  }, []);

  const chainData = useMemo<ChainWalletData<WebLNProvider>>(() => ({
    chain: {
      name: "Lightning",
      icon: "/icons/chains/LIGHTNING.svg",
    },
    wallet:
      wallet == null
        ? null
        : {
            name: "WebLN",
            icon: "/wallets/WebLN.png",
            instance: wallet,
          },
    id: "LIGHTNING",
    connect: isWebLNInstalled ? connect : null,
    disconnect: wallet != null ? disconnect : null,
  }), [wallet, isWebLNInstalled, connect, disconnect]);

  return useMemo(
    () => ({
      chainData,
      installedWallets: installedWalletOptions,
      installableWallets: installableWalletOptions,
      connectWallet,
      openModal,
      closeModal,
      isModalOpen: modalOpened,
    }),
    [chainData, installedWalletOptions, installableWalletOptions, connectWallet, openModal, closeModal, modalOpened]
  );
}
