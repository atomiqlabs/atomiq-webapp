import { SolanaWalletWrapper } from './chains/useSolanaWalletData';
import { ChainDataContext } from './context/ChainDataContext';
import {GenericWalletModal} from "./shared/GenericWalletModal";
import {useChainWalletSystem} from "./hooks/useChainWalletSystem";
import {FEConstants} from "../FEConstants";
import {useCallback, useMemo, useState} from "react";

export type WalletListData = {
  name: string;
  icon: string;
  downloadLink?: string;
}

export type ChainWalletData<T> = {
  chain: {
    name: string;
    icon: string;
  };
  wallet: {
    name: string;
    icon: string;
    address?: string;
    instance: T;
  };
  installedWallets: Array<WalletListData & {isConnected?: boolean}>;
  nonInstalledWallets: Array<WalletListData>;
  chainId: string;
  _disconnect: () => Promise<void> | void;
  _connectWallet: (walletName: string) => Promise<void> | void;
  swapperOptions?: any;
  hasWallets: boolean;
};

function WrappedChainDataProvider(props: { children: React.ReactNode }) {
  const chainsData = useChainWalletSystem(FEConstants.chainsConfiguration);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalChainId, setModalChainId] = useState<string>();
  const modalSelectedChainData = useMemo(() => chainsData[modalChainId], [modalChainId]);

  const connectWallet: (chainIdentifier: string) => void = useCallback((chainIdentifier: string) => {
    setModalOpen(true);
    setModalChainId(chainIdentifier);
  }, [chainsData]);
  const disconnectWallet: (chainIdentifier: string) => Promise<void> = useCallback(async (chainIdentifier: string) => {
    const chain = chainsData[chainIdentifier];
    if(!chain) return;
    await chain._disconnect();
  }, [chainsData]);
  const changeWallet: (chainIdentifier: string) => Promise<void> = useCallback(async (chainIdentifier: string) => {
    const chain = chainsData[chainIdentifier];
    if(!chain || !chain._disconnect) return;
    await chain._disconnect();
    setModalOpen(true);
    setModalChainId(chainIdentifier);
  }, [chainsData]);

  return (
    <ChainDataContext.Provider value={{
      chains: chainsData,
      connectWallet,
      disconnectWallet,
      changeWallet
    }}>
      <GenericWalletModal
          visible={modalOpen}
          onClose={() => setModalOpen(false)}
          title={`Select a ${modalSelectedChainData?.chain.name ?? modalChainId} Wallet`}
          installedWallets={modalSelectedChainData?.installedWallets ?? []}
          notInstalledWallets={modalSelectedChainData?.nonInstalledWallets ?? []}
          onWalletClick={(wallet) => {
            if(modalSelectedChainData==null) return;
            (async() => {
              await modalSelectedChainData._connectWallet(wallet.name);
              setModalOpen(false);
            })()
          }}
      />
      {props.children}
    </ChainDataContext.Provider>
  );
}

export function ChainDataProvider(props: { children: React.ReactNode }) {
  return (
    <SolanaWalletWrapper>
      <WrappedChainDataProvider>{props.children}</WrappedChainDataProvider>
    </SolanaWalletWrapper>
  );
}
