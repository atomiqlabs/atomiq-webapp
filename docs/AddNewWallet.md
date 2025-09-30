# How to Add a New Wallet Type

## Architecture Overview

The wallet system uses a configurable architecture with shared components:
- **`GenericWalletModal`** - Shared modal component for all wallet types
- **`WalletConfiguration.tsx`** - Configuration registry for wallet types
- **`useConfigurableWalletSystem.tsx`** - Hook that composes all wallet hooks

## Example: Adding Ethereum Support

### 1. Create the wallet hook (example)

```typescript
// src/wallets/chains/useEthereumWalletData.tsx
import { useState, useMemo, useCallback } from 'react';
import { ChainWalletData } from '../ChainDataProvider';
import { GenericWalletModal, WalletOption } from '../shared/GenericWalletModal';

export function useEthereumWalletData(connectedOtherChainWallets: {
  [chainName: string]: string;
}): [ChainWalletData<EthereumSigner>, JSX.Element] {
  const [wallet, setWallet] = useState<EthereumWallet | undefined>();
  const [installedWallets, setInstalledWallets] = useState<EthereumWalletType[]>([]);
  const [notInstalledWallets, setNotInstalledWallets] = useState<EthereumWalletType[]>([]);
  const [modalOpened, setModalOpened] = useState(false);

  // Wallet detection, connection logic, etc.
  const connectWallet = useCallback(async (walletType: EthereumWalletType) => {
    const wallet = await walletType.use();
    setWallet(wallet);
    setModalOpened(false);
  }, []);

  const disconnect = useCallback(() => {
    setWallet(undefined);
  }, []);

  const connect = useCallback(() => {
    if (installedWallets.length === 1) {
      connectWallet(installedWallets[0]).catch(console.error);
    } else {
      setModalOpened(true);
    }
  }, [installedWallets]);

  // Create modal using GenericWalletModal
  const modal = useMemo(
    () => (
      <GenericWalletModal
        visible={modalOpened}
        onClose={() => setModalOpened(false)}
        title="Select an Ethereum Wallet"
        installedWallets={installedWallets.map((e) => ({
          name: e.name,
          icon: e.iconUrl,
          data: e
        }))}
        notInstalledWallets={notInstalledWallets.map((e) => ({
          name: e.name,
          icon: e.iconUrl,
          data: e
        }))}
        onWalletClick={(wallet: WalletOption<EthereumWalletType>) => {
          connectWallet(wallet.data).catch(console.error);
        }}
      />
    ),
    [modalOpened, installedWallets, notInstalledWallets, connectWallet]
  );

  return useMemo(
    () => [
      {
        chain: {
          name: 'Ethereum',
          icon: '/icons/chains/ethereum.svg',
        },
        wallet: wallet == null ? null : {
          name: wallet.getName(),
          icon: wallet.getIcon(),
          instance: wallet,
          address: wallet.getAddress(),
        },
        id: 'ETHEREUM',
        connect: installedWallets.length > 0 ? connect : null,
        disconnect: wallet != null ? disconnect : null,
        changeWallet: wallet != null && installedWallets.length > 1 ? connect : null,
      },
      modal,
    ],
    [wallet, installedWallets, connect, disconnect, modal]
  );
}
```

### 2. Add to `useConfigurableWalletSystem`

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

export function useConfigurableWalletSystem(config: WalletSystemConfig = DEFAULT_CONFIG): WalletSystemResult {
  // ... existing hooks
  const [ethereumChain, ethereumModal] = useEthereumWalletData(connectedWallets);

  return useMemo(() => {
    const wallets: Record<string, ChainWalletData<any>> = {};
    const modals: ReactNode[] = [];

    // ... existing wallet additions

    if (config.enableEthereum && ethereumChain) {
      wallets.ETHEREUM = ethereumChain;
    }

    // ... existing modal additions

    if (config.enableEthereum && ethereumModal) {
      modals.push(ethereumModal);
    }

    return { wallets, modals };
  }, [
    config,
    // ... existing dependencies
    ethereumChain,
    ethereumModal
  ]);
}
```

### 3. Add to `WALLET_CONFIGS` (for reference)

```typescript
// src/wallets/config/WalletConfiguration.tsx
export const WALLET_CONFIGS: WalletConfig[] = [
  // ... existing wallets
  {
    id: 'ETHEREUM',
    name: 'Ethereum',
    useWalletData: useEthereumWalletData,
    dependencies: [],
  }
];
```

## Key Components

### GenericWalletModal
The shared modal component handles wallet selection for all chains:
- Located at: `src/wallets/shared/GenericWalletModal.tsx`
- Props: `visible`, `onClose`, `title`, `installedWallets`, `notInstalledWallets`, `onWalletClick`
- Automatically renders installed and not-installed wallet lists

### Hook Return Signature
All wallet hooks should return: `[ChainWalletData<T>, JSX.Element?]`
- First element: Wallet data (chain info, wallet instance, connect/disconnect functions)
- Second element (optional): Modal JSX for wallet selection

### Dependencies
Wallets can depend on other wallets for auto-connect behavior:
- Specify in `dependencies` array in `WALLET_CONFIGS`
- Pass `connectedOtherChainWallets` to wallet hooks
- Used for multichain wallet detection (e.g., if user connects Phantom on Solana, auto-connect Phantom on Bitcoin)

## Benefits

- **Shared modal component** - No need to create custom modals
- **Consistent UX** - All wallets use the same selection interface
- **Type-safe** - Generic types ensure correct wallet data structure
- **Easy feature flags** - Enable/disable wallets via config
- **Clear dependencies** - Specify wallet relationships explicitly

## Current Limitations

Due to React's Rules of Hooks, we cannot dynamically call hooks in loops. Therefore:
1. Each wallet hook must be explicitly called in `useConfigurableWalletSystem`
2. Config flags determine which wallets are included in the final result
3. All hooks are always called (React requirement), but results can be filtered

## Architecture Notes

- **Solana** uses `@solana/wallet-adapter-react` with built-in modal system
- **Bitcoin** uses custom wallet detection with `GenericWalletModal`
- **Other chains** can follow either pattern depending on library availability