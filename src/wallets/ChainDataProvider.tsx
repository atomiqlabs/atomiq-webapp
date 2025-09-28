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

  // Balances
  /** Native token balance (e.g., BTC, SOL, STRK). */
  balance?: {
    /** Raw numeric value in base units (e.g., satoshis/lamports/wei equivalents or already in whole units). */
    value: number | string;
    /** Optional human-friendly rendering, e.g. "0.042 BTC". */
    formatted?: string;
    /** Currency symbol, e.g., "BTC", "SOL", "STRK". */
    symbol: string;
    /** How many decimals the value uses (to allow formatting). */
    decimals?: number;
  };

  /** Optional list of token balances (SPL on Solana, ERC-20/STRK tokens on Starknet, etc.). */
  tokenBalances?: Array<{
    /** Token identifier — use `mint` for Solana, `contract` for EVM/Starknet; leave the other undefined. */
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
