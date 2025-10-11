# How to Add a New Wallet Type

## Architecture Overview

The wallet system uses a **standardized interface** with a unified modal:
- **`StandardChainHookResult<T>`** - All chain hooks return this standardized interface
- **`WalletSystemContext`** - Global context storing all chain wallet data
- **`UnifiedWalletModal`** - Single modal component that works for all chains
- **`useConfigurableWalletSystem`** - Hook that calls all chain hooks and populates context

**Key Principle:** All chain hooks return the same structure with `installedWallets` and `installableWallets`. The unified modal reads this data from the global context.

## Example: Adding Ethereum Support

### 1. Create the wallet hook

**IMPORTANT:** Your hook must return `StandardChainHookResult<T>` interface.

```typescript
// src/wallets/chains/useEthereumWalletData.ts
import { useState, useMemo, useCallback, useEffect } from 'react';
import { ChainWalletData } from '../ChainDataProvider';
import { StandardChainHookResult, ChainWalletOption } from '../types/ChainHookTypes';

// Define your wallet type
interface EthereumWalletType {
  name: string;
  iconUrl: string;
  detect: () => Promise<boolean>;
  use: () => Promise<EthereumWallet>;
}

export function useEthereumWalletData(): StandardChainHookResult<EthereumSigner> {
  const [wallet, setWallet] = useState<EthereumWallet | undefined>();
  const [usableWallets, setUsableWallets] = useState<EthereumWalletType[]>([]);
  const [installableWallets, setInstallableWallets] = useState<EthereumWalletType[]>([]);
  const [modalOpened, setModalOpened] = useState(false);

  // 1. DETECT WALLETS ON MOUNT
  useEffect(() => {
    detectEthereumWallets()
      .then((resp) => {
        setUsableWallets(resp.installed);
        setInstallableWallets(resp.installable);
      })
      .catch((e) => console.error(e));
  }, []);

  // 2. MODAL CONTROLS
  const openModal = useCallback(() => {
    setModalOpened(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpened(false);
  }, []);

  // 3. CONNECTION LOGIC
  const connectWalletInternal = useCallback(async (walletType: EthereumWalletType) => {
    const connectedWallet = await walletType.use();
    setWallet(connectedWallet);
  }, []);

  const connectWallet = useCallback(
    async (walletOption: ChainWalletOption<EthereumWalletType>) => {
      await connectWalletInternal(walletOption.data);
      closeModal();
    },
    [connectWalletInternal, closeModal]
  );

  const disconnect = useCallback(() => {
    setWallet(undefined);
  }, []);

  const connect = useCallback(() => {
    if (usableWallets.length === 1) {
      connectWalletInternal(usableWallets[0]).catch(console.error);
    } else {
      openModal();
    }
  }, [usableWallets, connectWalletInternal, openModal]);

  // 4. CONVERT TO ChainWalletOption FORMAT
  const installedWalletOptions = useMemo<ChainWalletOption<EthereumWalletType>[]>(
    () => usableWallets.map((w) => ({ name: w.name, icon: w.iconUrl, data: w })),
    [usableWallets]
  );

  const installableWalletOptions = useMemo<ChainWalletOption<EthereumWalletType>[]>(
    () => installableWallets.map((w) => ({ name: w.name, icon: w.iconUrl, data: w })),
    [installableWallets]
  );

  // 5. PREPARE chainData
  const chainData = useMemo<ChainWalletData<EthereumSigner>>(
    () => ({
      chain: {
        name: 'Ethereum',
        icon: '/icons/chains/ethereum.svg',
      },
      wallet: wallet == null ? null : {
        name: wallet.getName(),
        icon: wallet.getIcon(),
        instance: wallet.getSigner(), // Your signer instance
        address: wallet.getAddress(),
      },
      id: 'ETHEREUM',
      connect: usableWallets.length > 0 ? connect : null,
      disconnect: wallet != null ? disconnect : null,
      changeWallet: wallet != null && usableWallets.length > 1 ? connect : null,
    }),
    [wallet, usableWallets, connect, disconnect]
  );

  // 6. RETURN StandardChainHookResult
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
```

**Key Points:**
- ✅ Returns `StandardChainHookResult<T>` (not `[data, modal]`)
- ✅ Provides `installedWallets` and `installableWallets` arrays
- ✅ No manual modal creation - modal is automatically rendered
- ✅ Modal control via `openModal()`, `closeModal()`, `isModalOpen`

### 2. Add to `ChainIdentifiers` type

First, add your chain to the type definition:

```typescript
// src/wallets/context/ChainDataContext.ts
export type ChainIdentifiers =
  | "BITCOIN"
  | "LIGHTNING"
  | "SOLANA"
  | "STARKNET"
  | "ETHEREUM";  // Add this

type WalletTypes = {
  BITCOIN: ExtensionBitcoinWallet;
  LIGHTNING: WebLNProvider;
  SOLANA: SolanaSigner;
  STARKNET: StarknetSigner;
  ETHEREUM: EthereumSigner;  // Add this
};
```

### 3. Add to `useConfigurableWalletSystem`

```typescript
// src/wallets/hooks/useConfigurableWalletSystem.tsx
import { useEthereumWalletData } from '../chains/useEthereumWalletData';

export interface WalletSystemConfig {
  enableSolana: boolean;
  enableStarknet: boolean;
  enableLightning: boolean;
  enableBitcoin: boolean;
  enableEthereum: boolean; // Add this
}

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
  // Call all hooks unconditionally (React Rules of Hooks)
  const solanaResult = useSolanaWalletData();
  const starknetResult = useStarknetWalletData();
  const lightningResult = useLightningWalletData();
  const bitcoinResult = useBitcoinWalletData(connectedWallets);
  const ethereumResult = useEthereumWalletData(); // Add this

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
      walletSystemContext: { chains }
    };
  }, [config, solanaResult, starknetResult, lightningResult, bitcoinResult, ethereumResult]);
}
```

**That's it!** The modal is automatically rendered by `ChainDataProvider`.

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

| Aspect | Old Architecture | New Architecture |
|--------|-----------------|------------------|
| Hook return type | `[ChainWalletData, JSX.Element?]` | `StandardChainHookResult<T>` |
| Modal creation | Manual in each hook | Automatic in `ChainDataProvider` |
| Wallet lists | Hidden in hook internals | Exposed as `installedWallets`/`installableWallets` |
| Modal access | Different for each chain | Unified through context |
| Adding new chain | 3-4 files + modal code | 3 files, no modal code |

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