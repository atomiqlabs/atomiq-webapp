import { SolanaWalletWrapper } from './chains/useSolanaWalletData';
import { ChainDataContext } from './context/ChainDataContext';
import { useWalletSystem } from './hooks/useWalletSystem';

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
  const { wallets, modals } = useWalletSystem();

  return (
    <ChainDataContext.Provider value={wallets}>
      {modals}
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
