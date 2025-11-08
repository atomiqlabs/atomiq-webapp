# How to Add a New Wallet Type

## Architecture Overview

The wallet system uses a **configuration-driven** approach with **dependency injection**:

- **`ChainConfig<TWallet, TSigner>`** - Configuration object defining chain behavior
- **`useGenericChainWallet(config)`** - Generic hook that works with any config
- **`Chain Registry`** - Central place where all chains are defined
- **`UnifiedWalletModal`** - Single modal component that works for all chains

**Key Principle:** Define each chain once in a config object with injected functions. The generic hook handles all common logic (state, modal, listeners, etc.).

## Example: Adding Ethereum Support

### 1. Create Chain Configuration

Create `src/wallets/configs/ethereumConfig.ts`:

```typescript
import { ChainConfig } from '../types/ChainConfig';

// Define your wallet types
interface EthereumWalletType {
  name: string;
  iconUrl: string;
  detect: () => Promise<boolean>;
  connect: () => Promise<EthereumWallet>;
}

interface EthereumWallet {
  name: string;
  icon: string;
  address: string;
  signTransaction: (tx: any) => Promise<any>;
}

/**
 * Ethereum chain configuration
 *
 * All chain-specific logic is defined here as injected functions.
 * The generic hook (useGenericChainWallet) handles everything else.
 */
export const ethereumConfig: ChainConfig<EthereumWallet, EthereumSigner, EthereumWalletType> = {
  // ========== Metadata ==========
  id: 'ETHEREUM',
  name: 'Ethereum',
  icon: '/icons/chains/ethereum.svg',

  // ========== Wallet Detection ==========
  detectWallets: async () => {
    const installed: EthereumWalletType[] = [];
    const installable: EthereumWalletType[] = [];

    // Check for MetaMask
    if (window.ethereum?.isMetaMask) {
      installed.push({
        name: 'MetaMask',
        iconUrl: '/wallets/metamask.svg',
        detect: async () => true,
        connect: async () => {
          const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts',
          });
          return {
            name: 'MetaMask',
            icon: '/wallets/metamask.svg',
            address: accounts[0],
            signTransaction: (tx) =>
              window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [tx],
              }),
          };
        },
      });
    } else {
      installable.push({
        name: 'MetaMask',
        iconUrl: '/wallets/metamask.svg',
        detect: async () => false,
        connect: async () => {
          throw new Error('Not installed');
        },
      });
    }

    // Add more wallets...

    return {
      installed: installed.map((w) => ({
        name: w.name,
        icon: w.iconUrl,
        data: w,
      })),
      installable: installable.map((w) => ({
        name: w.name,
        icon: w.iconUrl,
        data: w,
      })),
    };
  },

  // ========== Connection Lifecycle ==========
  connectWallet: async (descriptor) => {
    return await descriptor.data.connect();
  },

  disconnectWallet: async (wallet) => {
    // Ethereum doesn't have explicit disconnect
    // Just clear local state (handled by generic hook)
  },

  // ========== Wallet Info ==========
  createSigner: (wallet) => {
    return new EthereumSigner(wallet);
  },

  getWalletInfo: (wallet) => {
    return {
      name: wallet.name,
      icon: wallet.icon,
      address: wallet.address,
    };
  },

  // ========== Optional: Auto-Connect ==========
  loadAutoConnect: async () => {
    const savedAddress = localStorage.getItem('ethereum-wallet-address');
    if (!savedAddress) return null;

    // Try to reconnect silently
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts', // Get accounts without prompt
        });

        if (accounts.includes(savedAddress)) {
          return {
            name: 'MetaMask',
            icon: '/wallets/metamask.svg',
            address: savedAddress,
            signTransaction: (tx) =>
              window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [tx],
              }),
          };
        }
      }
    } catch (error) {
      console.error('[Ethereum] Auto-connect failed:', error);
    }

    return null;
  },

  saveAutoConnect: (wallet) => {
    localStorage.setItem('ethereum-wallet-address', wallet.address);
  },

  clearAutoConnect: () => {
    localStorage.removeItem('ethereum-wallet-address');
  },

  // ========== Optional: Event Listeners ==========
  setupListeners: (wallet, onChange) => {
    if (!window.ethereum) return () => {};

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        onChange(null);
      } else if (accounts[0] !== wallet.address) {
        // User switched account
        onChange({
          ...wallet,
          address: accounts[0],
        });
      }
    };

    const handleChainChanged = () => {
      // Chain changed - reload or update
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  },
};
```

**Key Points:**

- ✅ All chain-specific logic in **one config object**
- ✅ Functions are **injected** (dependency injection pattern)
- ✅ **~80-100 lines** instead of ~200 lines for manual hook
- ✅ No state management, no modal code - generic hook handles it
- ✅ Clear separation: config = what, generic hook = how

### 2. Add to Chain Registry

Add wrapper hook to `src/wallets/registry/chainRegistry.ts`:

```typescript
import { ethereumConfig } from '../configs/ethereumConfig';
import { useGenericChainWallet } from '../hooks/useGenericChainWallet';

// Add wrapper hook
export function useEthereumWallet(): StandardChainHookResult<EthereumSigner> {
  return useGenericChainWallet(ethereumConfig);
}
```

### 3. Add to Type Definitions

Update `src/wallets/context/ChainDataContext.ts`:

```typescript
export type ChainIdentifiers = 'BITCOIN' | 'LIGHTNING' | 'SOLANA' | 'STARKNET' | 'ETHEREUM'; // Add this

type WalletTypes = {
  BITCOIN: ExtensionBitcoinWallet;
  LIGHTNING: WebLNProvider;
  SOLANA: SolanaSigner;
  STARKNET: StarknetSigner;
  ETHEREUM: EthereumSigner; // Add this
};
```

### 4. Add to Wallet System

Update `src/wallets/hooks/useConfigurableWalletSystem.tsx`:

```typescript
import { useEthereumWallet } from '../registry/chainRegistry';

// Add to config interface
export interface WalletSystemConfig {
  enableSolana: boolean;
  enableStarknet: boolean;
  enableLightning: boolean;
  enableBitcoin: boolean;
  enableEthereum: boolean; // Add this
}

// Add to default config
const DEFAULT_CONFIG: WalletSystemConfig = {
  enableSolana: true,
  enableStarknet: true,
  enableLightning: true,
  enableBitcoin: true,
  enableEthereum: true, // Add this
};

export function useConfigurableWalletSystem(
  config: WalletSystemConfig = DEFAULT_CONFIG
): WalletSystemResult {
  // Call wrapper hook
  const ethereumResult = useEthereumWallet(); // Add this

  // ... other hooks

  return useMemo(() => {
    const wallets: Record<string, ChainWalletData<any>> = {};
    const chains: Record<string, StandardChainHookResult<any>> = {};

    // ... existing chains

    // Add Ethereum
    if (config.enableEthereum && ethereumResult?.chainData) {
      wallets.ETHEREUM = ethereumResult.chainData;
      chains.ETHEREUM = ethereumResult;
    }

    return {
      wallets,
      walletSystemContext: { chains },
    };
  }, [config, solanaResult, starknetResult, lightningResult, bitcoinResult, ethereumResult]);
}
```

**That's it!** The modal is automatically rendered, all functionality works.

---

## Summary: What You Need to Do

To add a new chain, you need to:

1. ✅ Create a hook file: `src/wallets/chains/useYourChainWalletData.ts`
   - Return `StandardChainHookResult<T>`
   - Provide `installedWallets` and `installableWallets`

2. ✅ Add to `ChainIdentifiers`: `src/wallets/context/ChainDataContext.ts`

3. ✅ Add to `useConfigurableWalletSystem`: `src/wallets/hooks/useConfigurableWalletSystem.tsx`
   - Add `enableYourChain` to config
   - Call your hook
   - Add result to `wallets` and `chains`

That's all! **No manual modal creation needed.**

---

## Key Components

### StandardChainHookResult Interface

All wallet hooks must return this interface:

```typescript
interface StandardChainHookResult<T> {
  chainData: ChainWalletData<T>;
  installedWallets: ChainWalletOption[];
  installableWallets: ChainWalletOption[];
  connectWallet: (wallet: ChainWalletOption) => Promise<void>;
  openModal: () => void;
  closeModal: () => void;
  isModalOpen: boolean;
}
```

### UnifiedWalletModal

Single modal component that works for all chains:

- Located at: `src/wallets/shared/UnifiedWalletModal.tsx`
- Reads wallet data from `WalletSystemContext` based on `chainId`
- Automatically rendered by `ChainDataProvider` for each chain
- You never need to render it manually

### WalletSystemContext

Global context storing all chain data:

```typescript
{
  chains: {
    BITCOIN: StandardChainHookResult<...>,
    SOLANA: StandardChainHookResult<...>,
    ...
  }
}
```

## Benefits

✅ **Standardized Interface** - All chains use the same hook structure
✅ **Unified Modal** - One modal component works for all chains
✅ **Global Context** - Centralized wallet data accessible anywhere
✅ **Type-safe** - Full TypeScript support throughout
✅ **Consistent UX** - Same wallet selection experience across chains
✅ **Easy to extend** - Adding new chains is straightforward
✅ **Separation of concerns** - UI (modal) separated from logic (hooks)
✅ **Feature flags** - Enable/disable chains via config
✅ **No modal duplication** - Modal automatically rendered for each chain

## How It Works (Behind the Scenes)

1. **Hook initialization**: Each chain hook is called in `useConfigurableWalletSystem`
2. **Wallet detection**: Hooks detect installed wallets and populate arrays
3. **Context population**: All hook results stored in `WalletSystemContext`
4. **Modal rendering**: `ChainDataProvider` renders `UnifiedWalletModal` for each chain
5. **User interaction**: When user clicks connect, modal opens and shows wallets
6. **Wallet connection**: User selects wallet, `connectWallet()` is called

## Comparison: Old vs New

| Aspect           | Old Architecture                  | New Architecture                                   |
| ---------------- | --------------------------------- | -------------------------------------------------- |
| Hook return type | `[ChainWalletData, JSX.Element?]` | `StandardChainHookResult<T>`                       |
| Modal creation   | Manual in each hook               | Automatic in `ChainDataProvider`                   |
| Wallet lists     | Hidden in hook internals          | Exposed as `installedWallets`/`installableWallets` |
| Modal access     | Different for each chain          | Unified through context                            |
| Adding new chain | 3-4 files + modal code            | 3 files, no modal code                             |

## Architecture Notes

### Chain-Specific Implementations

- **Bitcoin & Solana**: Use `UnifiedWalletModal` with wallet detection
  - Bitcoin: Detects extensions (Phantom, Xverse, Unisat, etc.)
  - Solana: Uses Solana Wallet Adapter's wallet list

- **Starknet & Lightning**: Use external modals
  - Starknet: Uses get-starknet's modal (returns empty wallet arrays)
  - Lightning: Uses WebLN's modal (returns empty wallet arrays)

### React Rules of Hooks

Due to React's Rules of Hooks:

- All hooks must be called unconditionally in `useConfigurableWalletSystem`
- Config flags control which results are included in the final output
- You cannot dynamically call hooks in loops

## Further Reading

For complete documentation, see: `src/wallets/README.md`
