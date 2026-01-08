## Project Overview

**Atomiq Webapp** is a React-based web interface for the Atomiq cross-chain DEX. It enables trustless swaps between Bitcoin/Lightning Network and smart chains using the `@atomiqlabs/sdk`.

---

## Project Structure

```
atomiq-webapp/
├── src/
│   ├── main.tsx              # App entry point
│   ├── App.tsx               # Root component with provider hierarchy & routing
│   ├── FEConstants.ts        # Frontend constants (stats URL, default LP, etc.)
│   ├── providers/            # Context providers
│   │   ├── ChainsProvider.tsx    # Multi-chain wallet management
│   │   ├── SwapperProvider.tsx   # SDK Swapper initialization
│   │   └── chains/               # Per-chain wallet hooks
│   │       ├── useSolanaChain.tsx
│   │       ├── useStarknetChain.ts
│   │       ├── useBitcoinChain.ts
│   │       ├── useLightningNetwork.ts
│   │       └── useEVMChains.tsx   # Citrea, Botanix, Alpen, GOAT
│   ├── pages/                # Route components
│   │   ├── SwapNew.tsx       # Main swap page (17KB - primary UI)
│   │   ├── HistoryPage.tsx   # Swap history
│   │   ├── SwapExplorer.tsx  # Explorer for swaps
│   │   ├── SwapForGas.tsx    # Gas swap functionality
│   │   ├── FAQPage.tsx       # FAQ
│   │   ├── AboutPage.tsx     # About page
│   │   └── quickscan/        # QR scan functionality
│   ├── data/
│   │   └── ChainsConfig.ts   # Chain configuration from env vars
│   ├── wallets/bitcoin/      # Bitcoin wallet adapters
│   │   ├── base/             # Base classes (ExtensionBitcoinWallet, etc.)
│   │   ├── PhantomBitcoinWallet.ts
│   │   ├── XverseBitcoinWallet.ts
│   │   ├── UnisatBitcoinWallet.ts
│   │   ├── OKXBitcoinWallet.ts
│   │   ├── MagicEdenBitcoinWallet.ts
│   │   └── KeplrBitcoinWallet.ts
│   ├── components/           # UI components
│   ├── hooks/                # React hooks
│   ├── context/              # React contexts
│   └── adapters/             # Adapter layer
├── public/                   # Static assets (icons, wallets, manifest)
├── docs/                     # Documentation
│   └── AddNewWallet.md       # Guide for adding wallet types
├── vite.config.ts            # Vite configuration with Node polyfills
├── tailwind.config.js        # Tailwind CSS config
└── package.json              # Dependencies and scripts
```

---

## Key Purpose and Goals

1. **Trustless Cross-Chain Swaps** - Enable swaps between Bitcoin/Lightning and smart chains without centralized custody
2. **Multi-Chain Support** - Support for Solana, Starknet, and EVM L2s (Citrea, Botanix, Alpen, GOAT)
3. **Multi-Wallet Support** - Connect various wallet types per chain
4. **Request for Quote (RFQ) Model** - Interact with Liquidity Provider nodes for swap quotes

---

## Provider Hierarchy

```
ChainsProvider (wallet connections for all chains)
  └── SwapperProvider (SDK initialization)
       └── App routes
```

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `@atomiqlabs/sdk` | Core swap SDK |
| `@atomiqlabs/chain-solana` | Solana integration |
| `@atomiqlabs/chain-starknet` | Starknet integration |
| `@atomiqlabs/chain-evm` | EVM chain integration (Citrea, Botanix, Alpen, GOAT) |
| `@solana/wallet-adapter-*` | Solana wallet adapters |
| `starknet` | Starknet client library |
| `wagmi` / `viem` | EVM wallet connection and interaction |
| `sats-connect` | Bitcoin wallet integration |
| `webln` | Lightning Network WebLN provider |
| `react-router-dom` | Client-side routing |
| `react-bootstrap` | UI components |
| `tailwindcss` | Utility CSS framework |

---

## Important Configuration

- **Build Tool**: Vite (migrated from Create React App)
- **Styling**: Tailwind CSS + SCSS + Bootstrap
- **Node Polyfills**: Required for browser compatibility (crypto, stream, buffer, etc.)
- **Environment**: Uses `VITE_` prefixed env vars for chain RPC URLs and configuration
- **Chains are conditionally enabled** based on whether their RPC URL is configured

---

## Available Commands

```bash
npm start      # Dev server on port 5173
npm run build  # Production build
npm run format # Prettier formatting
npm run typecheck # TypeScript type check
```