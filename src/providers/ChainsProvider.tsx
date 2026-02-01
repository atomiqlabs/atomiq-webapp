import {SolanaWalletWrapper, useSolanaChain} from './chains/useSolanaChain';
import { ChainsContext } from '../context/ChainsContext';
import { useCallback, useMemo, useRef, useState } from 'react';
import {useStarknetChain} from './chains/useStarknetChain';
import {useLightningNetwork} from './chains/useLightningNetwork';
import {useBitcoinChain} from './chains/useBitcoinChain';
import {WebLNProvider} from 'webln';
import {SolanaSigner} from '@atomiqlabs/chain-solana';
import {StarknetSigner} from '@atomiqlabs/chain-starknet';
import {ExtensionBitcoinWallet} from '../wallets/bitcoin/base/ExtensionBitcoinWallet';
import {ConnectWalletModal} from '../components/wallets/ConnectWalletModal';
import { EVMSigner } from '@atomiqlabs/chain-evm';
import {EVMWalletWrapper, useAlpenChain, useBotanixChain, useCitreaChain, useGoatChain} from './chains/useEVMChains';
import {ChainsConfig} from '../data/ChainsConfig';
import {Token} from "@atomiqlabs/sdk";

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
  LIGHTNING: WebLNProvider;
  SOLANA: SolanaSigner;
  STARKNET: StarknetSigner;
  CITREA: EVMSigner;
  BOTANIX: EVMSigner;
  ALPEN: EVMSigner;
  GOAT: EVMSigner;
};

export type ChainIdentifiers = keyof WalletTypes;

function WrappedChainsProvider(props: { children: React.ReactNode }) {
  const solanaResult = useSolanaChain(!!ChainsConfig.SOLANA);
  const starknetResult = useStarknetChain(!!ChainsConfig.STARKNET);
  const citreaResult = useCitreaChain(!!ChainsConfig.CITREA);
  const botanixResult = useBotanixChain(!!ChainsConfig.BOTANIX);
  const alpenResult = useAlpenChain(!!ChainsConfig.ALPEN);
  const goatResult = useGoatChain(!!ChainsConfig.GOAT);
  const lightningResult = useLightningNetwork(!!ChainsConfig.LIGHTNING);
  const bitcoinResult = useBitcoinChain(!!ChainsConfig.BITCOIN, {
    STARKNET: starknetResult?.wallet?.name,
    SOLANA: solanaResult?.wallet?.name,
    CITREA: citreaResult?.wallet?.name,
    BOTANIX: botanixResult?.wallet?.name,
    ALPEN: alpenResult?.wallet?.name,
    GOAT: goatResult?.wallet?.name
  });

  const chains = useMemo(() => {
    const chainsData: Record<string, Chain<any>> = {};

    // Add wallets and chain data based on configuration
    if (solanaResult) chainsData.SOLANA = solanaResult;
    if (starknetResult) chainsData.STARKNET = starknetResult;
    if (citreaResult) chainsData.CITREA = citreaResult;
    if (botanixResult) chainsData.BOTANIX = botanixResult;
    if (alpenResult) chainsData.ALPEN = alpenResult;
    if (lightningResult) chainsData.LIGHTNING = lightningResult;
    if (bitcoinResult) chainsData.BITCOIN = bitcoinResult;
    if (goatResult) chainsData.GOAT = goatResult;

    return chainsData;
  }, [
    solanaResult,
    starknetResult,
    citreaResult,
    botanixResult,
    alpenResult,
    lightningResult,
    bitcoinResult
  ]);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalChainId, setModalChainId] = useState<string>();
  const modalSelectedChainData = useMemo(() => chains[modalChainId], [modalChainId]);

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
        onWalletClick={(wallet) => {
          if (modalSelectedChainData == null) return;
          (async () => {
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
          })();
        }}
      />
      {props.children}
    </ChainsContext.Provider>
  );
}

export function ChainsProvider(props: { children: React.ReactNode }) {
  return (
    <SolanaWalletWrapper>
      <EVMWalletWrapper>
        <WrappedChainsProvider>{props.children}</WrappedChainsProvider>
      </EVMWalletWrapper>
    </SolanaWalletWrapper>
  );
}
