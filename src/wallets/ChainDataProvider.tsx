import { SolanaWalletWrapper } from './chains/useSolanaWalletData';
import { ChainDataContext } from './context/ChainDataContext';
import { WalletSystemContext } from './context/WalletSystemContext';
import { useWalletSystem } from './hooks/useWalletSystem';
import { UnifiedWalletModal } from './shared/UnifiedWalletModal';
import { ChainIdentifiers } from './context/ChainDataContext';

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
  wallets?: Array<{
    name: string;
    icon: string;
    isInstalled: boolean;
    isConnected: boolean;
  }>;
  id: string;
  disconnect: () => Promise<void> | void;
  connect: () => Promise<void> | void;
  connectWallet?: () => Promise<void> | void; // maybe todo
  changeWallet?: () => Promise<void> | void;
  swapperOptions?: any;
  balance?: {
    value: number | string;
    formatted?: string;
    symbol: string;
    decimals?: number;
  };
  tokenBalances?: Array<{
    mint?: string;
    contract?: string;
    symbol: string;
    value: number | string;
    formatted?: string;
    decimals?: number;
  }>;

  /** Optional callback your hooks can expose to force-refresh balances. */
  refreshBalance?: () => Promise<void> | void;
};

function WrappedChainDataProvider(props: { children: React.ReactNode }) {
  const { wallets, walletSystemContext } = useWalletSystem();

  return (
    <WalletSystemContext.Provider value={walletSystemContext}>
      <ChainDataContext.Provider value={wallets}>
        {/* Render unified modals for chains that have wallets to display */}
        {Object.keys(walletSystemContext.chains).map((chainId) => {
          const chain = walletSystemContext.chains[chainId as ChainIdentifiers];
          if (!chain) return null;

          return (
            <UnifiedWalletModal
              key={chainId}
              chainId={chainId as ChainIdentifiers}
              visible={chain.isModalOpen}
              onClose={chain.closeModal}
            />
          );
        })}
        {props.children}
      </ChainDataContext.Provider>
    </WalletSystemContext.Provider>
  );
}

export function ChainDataProvider(props: { children: React.ReactNode }) {
  return (
    <SolanaWalletWrapper>
      <WrappedChainDataProvider>{props.children}</WrappedChainDataProvider>
    </SolanaWalletWrapper>
  );
}
