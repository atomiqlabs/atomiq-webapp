# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Atomiq Webapp is the React-based web interface for the Atomiq cross-chain DEX. It enables trustless swaps between Bitcoin/Lightning Network and smart chains (Solana, Starknet, and EVM L2s like Citrea, Botanix, Alpen, GOAT) using the `@atomiqlabs/sdk`.

## Common Commands

```bash
# Install dependencies (use --force if there are peer dependency conflicts)
npm install
npm install --force

# Development server (runs on port 5173)
npm start

# Production build
npm run build

# Preview production build
npm preview

# Format code with Prettier
npm run format

# Type checking without emitting files
npm run typecheck
```

## Environment Configuration

Copy one of the example env files to `.env` before running:
- `.env.mainnet` - Mainnet configuration
- `.env.testnet` - Testnet configuration (Bitcoin Testnet, Solana Devnet, Starknet Sepolia)

Key environment variables use `VITE_` prefix:
- `VITE_BITCOIN_NETWORK` - MAINNET, TESTNET, or TESTNET4
- `VITE_SOLANA_RPC_URL`, `VITE_STARKNET_RPC_URL`, `VITE_CITREA_RPC_URL`, etc. - RPC endpoints
- `VITE_DEFAULT_LP` - Comma-separated list of LP node URLs
- Chains without RPC URLs configured are automatically disabled

## Architecture

### Provider Hierarchy

The app uses nested React context providers:
```
ChainsProvider (wallet connections for all chains)
  └── SwapperProvider (SDK initialization)
       └── App routes
```

### Key Source Structure

```
src/
├── providers/           # Context providers
│   ├── ChainsProvider.tsx    # Multi-chain wallet management
│   ├── SwapperProvider.tsx   # SDK Swapper initialization
│   └── chains/               # Per-chain wallet hooks
│       ├── useSolanaChain.tsx
│       ├── useStarknetChain.tsx
│       ├── useBitcoinChain.ts
│       ├── useLightningNetwork.ts
│       └── useEVMChains.tsx  # Citrea, Botanix, Alpen, GOAT
├── hooks/
│   ├── pages/useSwapPage.ts  # Main swap page logic
│   ├── quoting/              # Quote-related hooks
│   ├── swaps/                # Swap type-specific hooks
│   └── wallets/              # Wallet interaction hooks
├── components/
│   ├── swappanels/           # Swap UI panels by type
│   │   ├── tobtc/            # To Bitcoin swaps
│   │   └── frombtc/          # From Bitcoin swaps (LN, onchain, SPV vault)
│   ├── wallets/              # Wallet connection UI
│   └── fees/                 # Fee display components
├── wallets/
│   └── bitcoin/              # Bitcoin wallet adapters (Phantom, Xverse, Unisat, etc.)
├── data/
│   └── ChainsConfig.ts       # Chain configuration from env vars
└── pages/                    # Route components
```

### Supported Chains

Chains are configured in `src/data/ChainsConfig.ts` based on environment variables:
- **Bitcoin** - Always enabled (via Mempool API)
- **Lightning** - Always enabled (via WebLN)
- **Solana** - Requires `VITE_SOLANA_RPC_URL`
- **Starknet** - Requires `VITE_STARKNET_RPC_URL`
- **EVM L2s** (Citrea, Botanix, Alpen, GOAT) - Each requires its respective RPC URL

### Swap Types

The SDK supports multiple swap types handled by different panel components:
- `ToBTCSwapPanel` - Smart chain → Bitcoin (onchain or Lightning)
- `FromBTCSwapPanel` - Bitcoin onchain → Smart chain
- `FromBTCLNSwapPanel` - Lightning → Smart chain
- `SpvVaultFromBTCSwapPanel` - SPV vault swaps
- `TrustedFromBTCLNSwapPanel` - Trusted Lightning swaps (for gas)

### Wallet Integration

Bitcoin wallets use adapter pattern in `src/wallets/bitcoin/`:
- Base classes: `ExtensionBitcoinWallet`, `SatsConnectBitcoinWallet`, `UnisatLikeBitcoinWallet`
- Implementations: Phantom, Xverse, Unisat, OKX, MagicEden, Keplr

See `docs/AddNewWallet.md` for adding new wallet types.

## SDK Dependencies

The app uses Atomiq's internal packages from GitHub:
- `@atomiqlabs/sdk` - Core swap SDK
- `@atomiqlabs/chain-solana` - Solana integration
- `@atomiqlabs/chain-starknet` - Starknet integration
- `@atomiqlabs/chain-evm` - EVM chain integration

## Build Configuration

- **Vite** with React plugin
- **Node polyfills** for browser compatibility (crypto, stream, buffer, etc.)
- **Tailwind CSS** with custom theme colors in `tailwind.config.js`
- **SCSS** for component styling
