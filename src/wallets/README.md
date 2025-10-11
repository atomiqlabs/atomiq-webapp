# Wallet System Architecture

## Overview

This wallet system provides a **standardized interface** for managing multi-chain wallet connections across Bitcoin, Solana, Starknet, and Lightning networks. The architecture is designed to:

1. **Unify wallet management** - All chain hooks follow the same interface
2. **Centralize wallet data** - Global context stores all wallet information
3. **Single modal component** - One `UnifiedWalletModal` works for all chains

## Architecture

### Key Components

#### 1. Standardized Hook Interface (`StandardChainHookResult`)

All chain hooks return this interface:

```typescript
interface StandardChainHookResult<T> {
  chainData: ChainWalletData<T>;          // Current wallet connection state
  installedWallets: ChainWalletOption[];  // Wallets installed in browser
  installableWallets: ChainWalletOption[]; // Wallets that can be installed
  connectWallet: (wallet: ChainWalletOption) => Promise<void>; // Connect to specific wallet
  openModal: () => void;                   // Open wallet selection modal
  closeModal: () => void;                  // Close wallet selection modal
  isModalOpen: boolean;                    // Modal visibility state
}
```

#### 2. Global Wallet Context (`WalletSystemContext`)

Stores all chain wallet data in a centralized dictionary:

```typescript
interface WalletSystemContextType {
  chains: {
    [chainId in ChainIdentifiers]?: StandardChainHookResult<any>;
  };
}
```

Access it using:
- `useWalletSystemContext()` - Get all chains
- `useChainWalletData(chainId)` - Get specific chain data

#### 3. Unified Wallet Modal (`UnifiedWalletModal`)

Single modal component that:
- Takes a `chainId` prop
- Reads wallet data from global context
- Displays installed/installable wallets for that chain
- Handles wallet connection

#### 4. Chain Hooks

Each chain has a hook implementing `StandardChainHookResult`:

- `useBitcoinWalletData()` - Bitcoin wallets (Phantom, Xverse, Unisat, etc.)
- `useSolanaWalletData()` - Solana wallets (leverages Solana wallet adapter)
- `useStarknetWalletData()` - Starknet wallets (uses get-starknet)
- `useLightningWalletData()` - Lightning wallets (uses WebLN)

## How It Works

### Data Flow

1. **Hook Initialization**
   - Each chain hook is called in `useConfigurableWalletSystem`
   - Hooks detect installed wallets
   - Hooks return `StandardChainHookResult`

2. **Context Population**
   - `useConfigurableWalletSystem` collects all hook results
   - Populates `WalletSystemContext` with all chain data
   - Also maintains backward-compatible `ChainDataContext`

3. **Modal Rendering**
   - `ChainDataProvider` renders `UnifiedWalletModal` for each chain
   - Each modal listens to its chain's `isModalOpen` state
   - When `connect()` is called on a chain, it opens the modal

4. **Wallet Connection**
   - User clicks a wallet in the modal
   - Modal calls `connectWallet(wallet)`
   - Hook handles connection logic
   - Modal closes automatically

### Example Usage

#### Opening a wallet modal

```typescript
import { useChainWalletData } from '@/wallets/context/WalletSystemContext';

function MyComponent() {
  const bitcoinChain = useChainWalletData('BITCOIN');

  const handleConnect = () => {
    // This will open the Bitcoin wallet selection modal
    bitcoinChain?.chainData?.connect();

    // Or directly open modal:
    // bitcoinChain?.openModal();
  };

  return (
    <button onClick={handleConnect}>
      Connect Bitcoin Wallet
    </button>
  );
}
```

#### Accessing connected wallet

```typescript
import { useContext } from 'react';
import { ChainDataContext } from '@/wallets/context/ChainDataContext';

function MyComponent() {
  const chains = useContext(ChainDataContext);
  const bitcoin = chains.BITCOIN;

  if (bitcoin?.wallet) {
    console.log('Bitcoin wallet:', bitcoin.wallet.name);
    console.log('Bitcoin address:', bitcoin.wallet.address);
  }

  return <div>Wallet: {bitcoin?.wallet?.name || 'Not connected'}</div>;
}
```

#### Listing available wallets

```typescript
import { useChainWalletData } from '@/wallets/context/WalletSystemContext';

function WalletList() {
  const bitcoinChain = useChainWalletData('BITCOIN');

  return (
    <div>
      <h3>Installed Wallets</h3>
      {bitcoinChain?.installedWallets.map(wallet => (
        <div key={wallet.name}>{wallet.name}</div>
      ))}

      <h3>Available to Install</h3>
      {bitcoinChain?.installableWallets.map(wallet => (
        <div key={wallet.name}>{wallet.name}</div>
      ))}
    </div>
  );
}
```

## Chain-Specific Details

### Bitcoin
- Detects multiple wallet extensions (Phantom, Xverse, Unisat, Keplr, MagicEden)
- Supports auto-connect based on Solana/Starknet wallet connections
- Provides full list of installed and installable wallets

### Solana
- Uses Solana Wallet Adapter under the hood
- Extracts wallet list from adapter's `wallets` array
- Categorizes by `readyState` (Installed, NotDetected, Loadable)

### Starknet
- Uses get-starknet library
- Modal is handled by get-starknet (external)
- Returns empty wallet lists (delegates to get-starknet)

### Lightning
- Uses WebLN standard
- Modal is handled by WebLN provider (external)
- Returns empty wallet lists (delegates to WebLN)

## Adding a New Chain

To add support for a new blockchain:

1. **Create chain hook** (`src/wallets/chains/useYourChainWalletData.ts`):
```typescript
export function useYourChainWalletData(): StandardChainHookResult<YourChainSigner> {
  // 1. Detect installed wallets
  const installedWallets = useMemo(() => {
    // Return list of ChainWalletOption
  }, []);

  // 2. Detect installable wallets
  const installableWallets = useMemo(() => {
    // Return list of ChainWalletOption
  }, []);

  // 3. Implement connect function
  const connectWallet = useCallback(async (wallet: ChainWalletOption) => {
    // Connection logic
  }, []);

  // 4. Implement modal state
  const [isModalOpen, setModalOpen] = useState(false);
  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  // 5. Return chainData + wallet lists + modal controls
  return {
    chainData,
    installedWallets,
    installableWallets,
    connectWallet,
    openModal,
    closeModal,
    isModalOpen,
  };
}
```

2. **Add to `ChainIdentifiers`** (`src/wallets/context/ChainDataContext.ts`):
```typescript
export type ChainIdentifiers = "BITCOIN" | "LIGHTNING" | "SOLANA" | "STARKNET" | "YOUR_CHAIN";
```

3. **Add to `useConfigurableWalletSystem`** (`src/wallets/hooks/useConfigurableWalletSystem.tsx`):
```typescript
const yourChainResult = useYourChainWalletData();

// Add to config interface
export interface WalletSystemConfig {
  // ... existing chains
  enableYourChain: boolean;
}

// Add to result logic
if (config.enableYourChain && yourChainResult?.chainData) {
  wallets.YOUR_CHAIN = yourChainResult.chainData;
  chains.YOUR_CHAIN = yourChainResult;
}
```

4. **Update `WalletTypes`** in `ChainDataContext.ts`:
```typescript
type WalletTypes = {
  // ... existing chains
  YOUR_CHAIN: YourChainSigner;
};
```