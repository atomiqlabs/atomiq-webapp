import { ChainsContext } from '../context/ChainsContext';
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as React from 'react';
import type {WebLNProvider} from 'webln';
import type {SolanaSigner} from '@atomiqlabs/chain-solana';
import type {StarknetSigner} from '@atomiqlabs/chain-starknet';
import type {ExtensionBitcoinWallet} from '../wallets/bitcoin/base/ExtensionBitcoinWallet';
import {ConnectWalletModal} from '../components/wallets/ConnectWalletModal';
import {ErrorBoundary} from '../components/ErrorBoundary';
import type { EVMSigner } from '@atomiqlabs/chain-evm';
import type {LNURLWithdraw, Token} from "@atomiqlabs/sdk";
import {tryWithRetries} from "../utils/Utils";

export type WalletListData = {
  name: string;
  icon: string;
  downloadLink?: string;
  overrideInstalledStatusText?: string;
};

export type Chain<T> = {
  chain: {
    name: string;
    icon: string;
  };
  wallet: {
    name: string;
    icon: string;
    address?: string;
    getSwapLimits?: (input: boolean, token: Token) => {min?: bigint, max?: bigint};
    onlyInput?: boolean;
    instance: T;
    additionalWalletActions?: {icon: JSX.Element | string, text: string, onClick: () => void}[]
  };
  installedWallets: Array<WalletListData & { isConnected?: boolean }>;
  nonInstalledWallets: Array<WalletListData>;
  chainId: string;
  _disconnect: () => Promise<void> | void;
  _connectWallet: (walletName: string, ...data: any[]) => Promise<void> | void;
  hasWallets: boolean;
};

export type WalletTypes = {
  BITCOIN: ExtensionBitcoinWallet;
  LIGHTNING: WebLNProvider | {_lnurl: LNURLWithdraw};
  SOLANA: SolanaSigner;
  STARKNET: StarknetSigner;
  CITREA: EVMSigner;
  BOTANIX: EVMSigner;
  ALPEN: EVMSigner;
  GOAT: EVMSigner;
};

export type ChainIdentifiers = keyof WalletTypes;

const LazyConnectorBridge = lazy(
  () => tryWithRetries(() => import('./ConnectorBridge'), {maxRetries: 3, delay: 500, exponential: true})
);

export function ChainsProvider(props: { children: React.ReactNode }) {
  const [chains, setChains] = useState<Record<string, Chain<any>>>({});
  const [error, setError] = useState<Error | null>(null);

  const [mountBridge, setMountBridge] = useState<boolean>(false);
  useEffect(() => setMountBridge(true), []);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalChainId, setModalChainId] = useState<string>();
  const modalSelectedChainData = useMemo(() => chains[modalChainId], [modalChainId, chains[modalChainId]]);

  const connectWalletPromiseCbk = useRef<(success: boolean) => void>();

  const connectWallet: (chainIdentifier: string) => Promise<boolean> = useCallback(
    (chainIdentifier: string) => {
      setModalOpen(true);
      setModalChainId(chainIdentifier);
      if (connectWalletPromiseCbk.current) connectWalletPromiseCbk.current(false);
      return new Promise<boolean>((resolve) => {
        connectWalletPromiseCbk.current = resolve;
      });
    },
    [chains]
  );
  const disconnectWallet: (chainIdentifier: string) => Promise<void> = useCallback(
    async (chainIdentifier: string) => {
      const chain = chains[chainIdentifier];
      if (!chain) return;
      await chain._disconnect();
    },
    [chains]
  );
  const changeWallet: (chainIdentifier: string) => Promise<void> = useCallback(
    async (chainIdentifier: string) => {
      const chain = chains[chainIdentifier];
      if (!chain || !chain._disconnect) return;
      await chain._disconnect();
      setModalOpen(true);
      setModalChainId(chainIdentifier);
    },
    [chains]
  );

  return (
    <ChainsContext.Provider
      value={{
        loadError: error,
        chains,
        connectWallet,
        disconnectWallet,
        changeWallet,
      }}
    >
      <ConnectWalletModal
        visible={modalOpen}
        onClose={() => {
          setModalOpen(false);
          if (connectWalletPromiseCbk.current) {
            connectWalletPromiseCbk.current(false);
            connectWalletPromiseCbk.current = null;
          }
        }}
        title={`Select a ${modalSelectedChainData?.chain.name ?? modalChainId} Wallet`}
        installedWallets={modalSelectedChainData?.installedWallets ?? []}
        notInstalledWallets={modalSelectedChainData?.nonInstalledWallets ?? []}
        onWalletClick={async (wallet) => {
          if (modalSelectedChainData == null) return;
          try {
            await modalSelectedChainData._connectWallet(wallet.name);
            setModalOpen(false);
            if (connectWalletPromiseCbk.current) {
              connectWalletPromiseCbk.current(true);
              connectWalletPromiseCbk.current = null;
            }
          } catch (e) {
            console.error(e);
            // alert(
            //   `Failed to connect to ${wallet.name}. This wallet may not be available or compatible with the ${modalSelectedChainData.chain.name} network.`
            // );
          }
        }}
      />
      {mountBridge && (
        <ErrorBoundary onError={(error, errorInfo) => {
          console.error('ConnectorBridge failed to load or crashed', error, errorInfo);
          setError(error);
        }}>
          <Suspense fallback={null}>
            <LazyConnectorBridge onChains={setChains} />
          </Suspense>
        </ErrorBoundary>
      )}
      {props.children}
    </ChainsContext.Provider>
  );
}
