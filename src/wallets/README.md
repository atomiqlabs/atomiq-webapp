# Wallet System Architecture

## Overview

Configuration-driven wallet system with dependency injection. Define each blockchain once, generic hook handles everything else.

### Key Principles

1. **Define once** - Each chain = one config object
2. **Dependency injection** - Custom behavior as functions
3. **Generic hook** - Handles all common logic
4. **Type-safe** - Full TypeScript support

## Quick Example

```typescript
// 1. Define chain config (once)
export const bitcoinConfig: ChainConfig<...> = {
  id: 'BITCOIN',
  detectWallets: async () => { ... },
  connectWallet: async (w) => { ... },
  // ... other functions
};

// 2. Wrapper hook (uses generic implementation)
export function useBitcoinWallet() {
  return useGenericChainWallet(bitcoinConfig);
}

// 3. Use it
const bitcoin = useBitcoinWallet();
```

## Adding New Chain

**3 simple steps:**

1. Create config file: `configs/yourChainConfig.ts`
2. Add to registry: `registry/chainRegistry.ts`
3. Add to system: `hooks/useConfigurableWalletSystem.tsx`

See full example in `docs/AddNewWallet.md`

## Benefits

| Before | After |
|--------|-------|
| ~200 lines per chain | ~80 lines per chain |
| Code duplication | Zero duplication |
| 4-5 files | 2-3 files |

## File Structure

```
src/wallets/
├── configs/           # Chain configurations
├── registry/          # Central registry
├── hooks/             # Generic implementation
└── types/             # Interfaces
```

## Further Reading

- `types/ChainConfig.ts` - Full interface docs
- `configs/` - Real examples
- `docs/AddNewWallet.md` - Complete guide
