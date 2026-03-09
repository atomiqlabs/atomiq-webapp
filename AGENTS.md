# Repository Guidelines

This guide includes a practical source index so contributors can quickly find where behavior lives.
Primary app code is under `src/`.

Generated artifacts belong in `dist/`, `build/`, or `_build/` and should not be hand-edited.

## App Entry and Core Wiring
- `src/main.tsx`: App bootstrap, global CSS imports, Buffer polyfill, React root mount.
- `src/App.tsx`: Provider hierarchy, route tree, global loading and swapper error overlay.
- `src/FEConstants.ts`: Frontend constants (stats URL, LP defaults, trusted gas swap LP, USD formatter).

## Providers and Chain Wiring
- `src/providers/SwapperProvider.tsx`: Creates and initializes SDK swapper, syncs swaps, exposes swapper context.
- `src/providers/ChainsProvider.tsx`: Composes chain hooks, wallet connect modal flow, provides `ChainsContext`.
- `src/providers/BitcoinWebWalletProvider.tsx`: Manages internal BTC web wallet mnemonic and send-BTC modal.
- `src/providers/chains/useSolanaChain.tsx`: Solana wallet adapter integration and signer mapping.
- `src/providers/chains/useStarknetChain.ts`: Starknet wallet discovery, connect/disconnect, signer setup.
- `src/providers/chains/useEVMChains.tsx`: EVM wallet connector setup and chain-specific wallet wrappers.
- `src/providers/chains/useBitcoinChain.ts`: Bitcoin wallet detection, auto-connect behavior, chain state.
- `src/providers/chains/useLightningNetwork.ts`: WebLN and LNURL pseudo-wallet connection logic.
- `src/providers/chains/evm/ChainSwitchingSigner.ts`: Ethers signer wrapper that auto-switches chains.
- `src/providers/chains/evm/CitreaChainSpec.ts`: Citrea chain metadata (testnet/mainnet selection).
- `src/providers/chains/evm/BotanixChainSpec.ts`: Botanix chain metadata (testnet/mainnet selection).
- `src/providers/chains/evm/AlpenChainSpec.ts`: Alpen testnet chain metadata.
- `src/providers/chains/evm/GoatChainSpec.ts`: GOAT testnet chain metadata.

## Contexts
- `src/context/SwapperContext.ts`: Shared swapper lifecycle state and event bus.
- `src/context/ChainsContext.ts`: Shared chain/wallet map and connect/disconnect API.
- `src/context/BitcoinWebWalletContext.ts`: Internal BTC web wallet recovery and send actions.

## Pages and Routes
- `src/pages/SwapNew.tsx`: Main swap UI orchestration.
- `src/pages/SwapForGas.tsx`: Trusted LN-for-gas flow page.
- `src/pages/SwapExplorer.tsx`: Public explorer with backend filters and pagination.
- `src/pages/HistoryPage.tsx`: Local swap history and actionable swap tracking.
- `src/pages/FAQPage.tsx`: FAQ accordion and tab-deep-link handling.
- `src/pages/AboutPage.tsx`: Product/about content page.
- `src/pages/SwapTopbar.tsx`: Legacy tab-style topbar with actionable count badge.
- `src/pages/NotFound.tsx`: 404 fallback route.
- `src/pages/quickscan/QuickScan.tsx`: Camera/NFC scan entry flow.
- `src/pages/quickscan/QuickScanExecute.tsx`: Parsed scan execution and quote/submit screen.

## Hooks

### Chains, Fees, Navigation, NFC
- `src/hooks/chains/useChain.ts`: Resolves chain object from token or chain ID.
- `src/hooks/fees/useSwapFees.ts`: Fee breakdown, USD fee totals, network fee estimation.
- `src/hooks/navigation/useAnchorNavigate.ts`: Internal link interception for SPA navigation.
- `src/hooks/nfc/useNFCScanner.ts`: NFC reader lifecycle and scan callback bridge.

### Page and Pricing
- `src/hooks/pages/useSwapPage.ts`: Main swap state machine for tokens, addresses, quote, and UI lock/hide.
- `src/hooks/pricing/usePricing.ts`: Async USD conversion for token amounts.

### Quoting
- `src/hooks/quoting/useAddressData.ts`: Address/invoice parsing via SDK utils.
- `src/hooks/quoting/useAmountConstraints.ts`: Dynamic input/output min-max limits.
- `src/hooks/quoting/useExistingSwap.ts`: Loads existing swap by `swapId`.
- `src/hooks/quoting/useQuote.ts`: Quote creation wrapper with random-address fallback logic.
- `src/hooks/quoting/useSupportedTokens.ts`: Supported token lists with LP change refresh.

### Swap Flow Hooks
- `src/hooks/swaps/useToBtcQuote.ts`: TO_BTC / TO_BTCLN execution, refund, success-state controls.
- `src/hooks/swaps/useFromBtcLnQuote.ts`: FROM_BTCLN and auto variant execution and settlement UI state.
- `src/hooks/swaps/useFromBtcQuote.ts`: FROM_BTC execution, BTC payment wait, confirmations, settlement.
- `src/hooks/swaps/useSpvVaultFromBtcQuote.tsx`: SPV vault BTC flow with deposit status handling.
- `src/hooks/swaps/useTrustedFromBtcLnQuote.ts`: Trusted LN-for-gas progression state.

### Swap Helpers
- `src/hooks/swaps/helpers/useSwapState.ts`: Unified swap state listener, timers, expiry windows.
- `src/hooks/swaps/helpers/useQuoteAmountsAndAddress.ts`: Derived input/output/address summary for step UI.
- `src/hooks/swaps/helpers/useCheckAdditionalGas.ts`: Detects destination gas shortfall for quote initiator.

### Generic Utility Hooks
- `src/hooks/utils/useAbortSignal.ts`: Dependency-scoped abort signal ref.
- `src/hooks/utils/useAsync.ts`: Imperative async action state wrapper.
- `src/hooks/utils/useBigNumberState.ts`: Stable `BigNumber` state with equality guard.
- `src/hooks/utils/useDecimalNumberState.ts`: Decimal string state normalization.
- `src/hooks/utils/useIsMobile.ts`: Width-based mobile flag.
- `src/hooks/utils/useLocalStorage.ts`: Typed localStorage-backed state hook.
- `src/hooks/utils/useStateRef.ts`: Ref that mirrors latest state value.
- `src/hooks/utils/useStateWithOverride.ts`: Local state with optional forced override.
- `src/hooks/utils/useWithAwait.ts`: Declarative async execution with stale-result protection.

### Wallet Hooks
- `src/hooks/wallets/useWallet.ts`: Resolves wallet data for token/chain and direction.
- `src/hooks/wallets/useSmartChainWallet.ts`: Enforces smart-chain wallet compatibility with swap initiator.
- `src/hooks/wallets/useWalletBalance.ts`: Spendable balance and BTC fee-rate polling.

## Components

### Deprecated
- `src/components/_deprecated/AuditedBy.tsx`: Legacy audited-by footer badge.
- `src/components/_deprecated/ErrorAlert.tsx`: Legacy error alert with stack copy.

### Common and Utility UI
- `src/components/common/BaseButton.tsx`: Project-standard button variants and loading states.
- `src/components/common/GenericModal.tsx`: Portal modal shell with sizing/type options.
- `src/components/common/MultiSelectDropdown.tsx`: Multi-select dropdown used by explorer filters.
- `src/components/common/TextPill.tsx`: Compact status pill (`success`, `warning`, `danger`).
- `src/components/ScrollAnchor.tsx`: Auto-scroll helper for long swap step flows.
- `src/components/TemporaryTooltip.tsx`: Time-limited tooltip for copy actions.
- `src/components/ValidatedInput.tsx`: Reusable input with validation and feedback channels.

### Layout and Navigation
- `src/components/layout/MainNavigation.tsx`: Navbar, route links, settings entry, status indicators.
- `src/components/layout/SocialFooter.tsx`: Social and support links footer.

### Explorer, History, Table, List
- `src/components/explorer/ExplorerTotals.tsx`: Explorer totals card with timeframe and breakdown UI.
- `src/components/history/TransactionEntry.tsx`: Single history/explorer row renderer.
- `src/components/history/TransactionToken.tsx`: Token amount/address block with copy and explorer link.
- `src/components/table/TransactionsTable.tsx`: Table wrapper for swap rows.
- `src/components/list/PaginatedList.tsx`: Infinite-scroll list core.
- `src/components/list/ArrayDataPaginatedList.tsx`: Pagination adapter for in-memory arrays.
- `src/components/list/BackendDataPaginatedList.tsx`: Pagination adapter for backend endpoints.

### Fees, Alerts, Progress, Steps
- `src/components/fees/FeeSummaryScreen.tsx`: Detailed fee and amount summary panel.
- `src/components/fees/GenericFeePanel.tsx`: Shared fee panel layout with quote timer.
- `src/components/fees/PlaceholderFeePanel.tsx`: Placeholder fee panel before real quote is ready.
- `src/components/fees/SwapFeePanel.tsx`: Quote-bound fee panel wrapper.
- `src/components/swaps/SwapStepAlert.tsx`: Unified alert card for swap states and actions.
- `src/components/swaps/SwapForGasAlert.tsx`: Not-enough-gas warning and gas-swap call-to-action.
- `src/components/swaps/SwapExpiryProgressBar.tsx`: Linear expiry timer/progress UI.
- `src/components/swaps/SwapExpiryProgressCircle.tsx`: Compact circular expiry progress and retry.
- `src/components/swaps/SwapConfirmations.tsx`: BTC confirmation progress block with explorer link.
- `src/components/swaps/StepByStep.tsx`: Input/output wallet summary and swap-step timeline.
- `src/components/swaps/ImportantNoticeModal.tsx`: Confirmation modal with "do not show again" toggle.
- `src/components/swaps/ConnectedWalletPayButtons.tsx`: Payment controls for connected wallet mode.
- `src/components/swaps/DisconnectedWalletQrAndAddress.tsx`: QR/address payment controls for disconnected mode.

### Token and Wallet UI
- `src/components/tokens/TokenIcon.tsx`: Token icon resolver (chain-specific overrides supported).
- `src/components/tokens/ChainIcon.tsx`: Token icon with chain badge overlay.
- `src/components/tokens/TokensDropdown.tsx`: Chain-grouped token selection dropdown.
- `src/components/wallets/ButtonWithWallet.tsx`: Button that gates actions behind wallet connection.
- `src/components/wallets/ConnectWalletModal.tsx`: Wallet selection modal (installed vs installable).
- `src/components/wallets/WalletConnector.tsx`: Top-nav multi-chain wallet connection manager.
- `src/components/wallets/WalletInfoBadge.tsx`: Inline wallet status badge with quick actions.

### QR, NFC, and Swap Panels
- `src/components/qrscanner/QRScanner.tsx`: Camera QR scanner integration.
- `src/components/qrscanner/QRScannerModal.tsx`: Modal wrapper around scanner lifecycle.
- `src/components/nfc/NFCSwitch.tsx`: Navbar NFC enable/disable toggle.
- `src/components/swappanels/SwapPanel.tsx`: Quote type router to correct swap panel component.
- `src/components/swappanels/tobtc/ToBTCSwapPanel.tsx`: TO_BTC / TO_BTCLN swap UI states.
- `src/components/swappanels/frombtc/lightning/FromBTCLNSwapPanel.tsx`: BTC-LN to smart-chain flow panel.
- `src/components/swappanels/frombtc/onchain/FromBTCSwapPanel.tsx`: BTC on-chain to smart-chain flow panel.
- `src/components/swappanels/frombtc/onchain-spvvault/SpvVaultFromBTCSwapPanel.tsx`: SPV vault BTC flow panel.
- `src/components/swappanels/frombtc/trusted/TrustedFromBTCLNSwapPanel.tsx`: Trusted gas-swap panel.

### Settings and Recovery Modals
- `src/components/modals/SettingsModal.tsx`: Settings hub (logs, recovery, history actions).
- `src/components/modals/ClearSwapHistoryModal.tsx`: Local history wipe confirmation.
- `src/components/modals/RecoverSwapDataModal.tsx`: On-chain historical swap recovery flow.
- `src/components/modals/RecoverMnemonicModal.tsx`: Import/download BTC web wallet recovery file.
- `src/components/modals/SendBitcoinToAddressModal.tsx`: Internal web wallet BTC send dialog.

## Wallet Adapters (Bitcoin)
- `src/wallets/bitcoin/InternalBitcoinWebwallet.ts`: In-browser mnemonic-derived single-address wallet.
- `src/wallets/bitcoin/PhantomBitcoinWallet.ts`: Phantom Bitcoin adapter implementation.
- `src/wallets/bitcoin/XverseBitcoinWallet.ts`: Xverse adapter built on sats-connect base.
- `src/wallets/bitcoin/UnisatBitcoinWallet.ts`: UniSat adapter implementation.
- `src/wallets/bitcoin/KeplrBitcoinWallet.ts`: Keplr Bitcoin adapter implementation.
- `src/wallets/bitcoin/MagicEdenBitcoinWallet.ts`: Magic Eden adapter implementation.
- `src/wallets/bitcoin/OKXBitcoinWallet.ts`: OKX Bitcoin adapter implementation.
- `src/wallets/bitcoin/base/INamedBitcoinWallet.ts`: Wallet naming/icon interface contract.
- `src/wallets/bitcoin/base/ExtensionBitcoinWallet.ts`: Base extension wallet with fee/PSBT helpers.
- `src/wallets/bitcoin/base/BitcoinWalletNonSeparated.ts`: Base wallet that filters token-bearing UTXOs.
- `src/wallets/bitcoin/base/SatsConnectBitcoinWallet.ts`: Shared sats-connect wallet base implementation.
- `src/wallets/bitcoin/base/UnisatLikeBitcoinWallet.ts`: Shared UniSat-like provider wallet base.
- `src/wallets/bitcoin/utils/BitcoinWalletUtils.ts`: Wallet registry, detection, and active wallet restoration.
- `src/wallets/bitcoin/utils/UnisatTokensApi.ts`: UniSat UTXO API helper for token-free UTXO filtering.

## Data, Adapters, Utilities, and Types
- `src/data/ChainsConfig.ts`: Chain RPC, network, balances, and explorer configuration from env.
- `src/data/FAQContent.tsx`: Structured FAQ source data and rich answers.
- `src/adapters/transactionAdapters.ts`: Mapping from SDK/explorer swap objects into transaction row props.
- `src/utils/Tokens.ts`: Token arrays, icon maps, token/chain identifier helpers, amount converters.
- `src/utils/Utils.ts`: Time formatting, string helpers, retries, generic utility helpers.
- `src/utils/NFCReader.ts`: Low-level Web NFC adapter and start/stop lifecycle.
- `src/types/swaps/TxDataType.ts`: Shared transaction confirmation shape for swap UI.

## Build, Test, and Development Commands
- `npm start`: run the Vite dev server (default `http://localhost:5173`).
- `npm run build`: create a production bundle in `dist/`.
- `npm run preview`: serve the built bundle locally for verification.
- `npm run typecheck`: run TypeScript checks (`tsc --noEmit`).
- `npm run format`: apply Prettier formatting across the repo.

Run `npm install` before first local run.

## Coding Style & Naming Conventions
- Formatting is enforced by Prettier (`.prettierrc`): 2-space indent, semicolons, single quotes, max width 100, trailing commas `es5`.
- Use TypeScript and functional React components.
- Naming conventions:
  - Components/pages/providers: `PascalCase` file names (for example `WalletConnector.tsx`).
  - Hooks: `useCamelCase` (for example `useWalletBalance.ts`).

## Testing Guidelines
There is no committed automated unit/integration test suite yet.

- Always run `npm run typecheck` before opening a PR.
- In PRs, list which swap paths/chains were tested and which failure paths were exercised.

## Commit & Pull Request Guidelines
Follow the repository's existing commit style: short, imperative subject lines (for example, `Fix page not loading when tokenOut or tokenIn are specified`).

- Keep commits focused on one logical change.
- Reference issue/PR IDs when relevant (example: `(#50)`).
- PRs should include:
  - concise change summary and risk areas,
  - environment/config updates,

## Security & Configuration Tips
- Runtime configuration uses `VITE_` environment variables.
- Use `.env.testnet` / `.env.mainnet` as templates, and keep secrets out of committed `.env` files.
- Validate RPC endpoints and wallet-network alignment before mainnet testing.


## Contribution Note
When adding or moving files in these folders, update this index in the same PR so new contributors can navigate quickly.
