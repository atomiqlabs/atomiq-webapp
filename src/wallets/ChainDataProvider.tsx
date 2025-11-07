import { SolanaWalletWrapper } from './chains/useSolanaWalletData';
import { ChainDataContext } from './context/ChainDataContext';
import { GenericWalletModal } from './shared/GenericWalletModal';
import { useChainWalletSystem } from './hooks/useChainWalletSystem';
import { FEConstants } from '../FEConstants';
import {useCallback, useMemo, useRef, useState} from 'react';

export type WalletListData = {
  name: string;
  icon: string;
  downloadLink?: string;
};

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
  installedWallets: Array<WalletListData & { isConnected?: boolean }>;
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

  const connectWalletPromiseCbk = useRef<(success: boolean) => void>();

  const connectWallet: (chainIdentifier: string) => Promise<boolean> = useCallback(
    (chainIdentifier: string) => {
      setModalOpen(true);
      setModalChainId(chainIdentifier);
      if(connectWalletPromiseCbk.current) connectWalletPromiseCbk.current(false);
      return new Promise<boolean>((resolve) => {
          connectWalletPromiseCbk.current = resolve;
      });
    },
    [chainsData]
  );
  const disconnectWallet: (chainIdentifier: string) => Promise<void> = useCallback(
    async (chainIdentifier: string) => {
      const chain = chainsData[chainIdentifier];
      if (!chain) return;
      await chain._disconnect();
    },
    [chainsData]
  );
  const changeWallet: (chainIdentifier: string) => Promise<void> = useCallback(
    async (chainIdentifier: string) => {
      const chain = chainsData[chainIdentifier];
      if (!chain || !chain._disconnect) return;
      await chain._disconnect();
      setModalOpen(true);
      setModalChainId(chainIdentifier);
    },
    [chainsData]
  );

  return (
    <ChainDataContext.Provider
      value={{
        chains: chainsData,
        connectWallet,
        disconnectWallet,
        changeWallet,
      }}
    >
      <GenericWalletModal
        visible={modalOpen}
        onClose={() => {
            setModalOpen(false);
            if(connectWalletPromiseCbk.current) {
                connectWalletPromiseCbk.current(false);
                connectWalletPromiseCbk.current = null;
            }
        }}
        title={`Select a ${modalSelectedChainData?.chain.name ?? modalChainId} Wallet`}
        installedWallets={modalSelectedChainData?.installedWallets ?? []}
        notInstalledWallets={modalSelectedChainData?.nonInstalledWallets ?? []}
        onWalletClick={(wallet) => {
          if (modalSelectedChainData == null) return;
          (async () => {
            try {
              await modalSelectedChainData._connectWallet(wallet.name);
              setModalOpen(false);
                if(connectWalletPromiseCbk.current) {
                    connectWalletPromiseCbk.current(true);
                    connectWalletPromiseCbk.current = null;
                }
            } catch (e) {
              alert(
                `Failed to connect to ${wallet.name}. This wallet may not be available or compatible with the ${modalSelectedChainData.chain.name} network.`
              );
            }
          })();
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
