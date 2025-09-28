# How to Add a New Wallet Type

With the new unified wallet system, adding a new wallet type is now as simple as adding an entry to the `WALLET_CONFIGS` array.

## Example: Adding Ethereum Support

### 1. Create the wallet hook (same as before)
```typescript
// src/wallets/chains/useEthereumWalletData.tsx
export function useEthereumWalletData(): [ChainWalletData<EthereumSigner>] {
  // Your implementation here
  return useMemo(() => [{
    chain: { name: 'Ethereum', icon: '/icons/chains/ethereum.svg' },
    wallet: /* wallet data */,
    id: 'ETHEREUM',
    connect: () => { /* connect logic */ },
    disconnect: () => { /* disconnect logic */ },
  }], []);
}
```

### 2. Add to wallet configuration array
```typescript
// src/wallets/config/WalletConfiguration.tsx
import { useEthereumWalletData } from '../chains/useEthereumWalletData';

export const WALLET_CONFIGS: WalletConfig[] = [
  // ... existing wallets
  {
    id: 'ETHEREUM',
    name: 'Ethereum',
    useWalletData: useEthereumWalletData,
    dependencies: [] // or ['BITCOIN'] if it should auto-connect based on Bitcoin
  }
];
```

### 3. That's it! 🎉

Your Ethereum wallet is now:
- ✅ Automatically included in the wallet system
- ✅ Available in the ChainDataContext
- ✅ Rendered with modals if provided
- ✅ Part of the connected wallets cross-reference system

## Benefits

- **No more hardcoded logic** in ChainDataProvider
- **Easy feature flags** - disable wallets by filtering the array
- **Clear dependencies** - specify which wallets depend on others
- **Consistent interface** - all wallets follow the same pattern
- **Auto-scaling** - system handles any number of wallets

## Future Enhancements

You can easily add:
- Feature flags: `enabled: FEConstants.enableEthereum`
- Wrapper components: `wrapper: EthereumWalletWrapper`
- Conditional loading based on environment
- Wallet priorities and ordering