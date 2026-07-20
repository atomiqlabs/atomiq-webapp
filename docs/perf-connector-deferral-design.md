# Wallet-connector deferral — design

> **Superseded (2026-07-13) by `docs/perf-epic-design.md`**, which folds this in. Kept as history.

Date: 2026-07-13. Repo: `atomiq-webapp`. Companion to `docs/perf-tier1-design.md` / `docs/perf-tier1-plan.md`. Approved direction (Marci + Adam, 2026-07-13): keep the existing provider pattern (`ChainsProvider` stays the component that wraps the app and provides `ChainsContext`); contain the lazy-loading inside it; always-defer (no localStorage-connected flag in this pass).

## Why

The chain runtimes (`ethers`/`viem`/`wagmi`, `@solana/web3.js`, `starknet`, and transitive `@noble` crypto) are ~78% of the app's initial JS, and they are imported by **two** eager consumers: the SDK (`SwapperProvider` → `SwapperFactory`) and the wallet connectors (`ChainsProvider` → the per-chain hooks). Rollup keeps a module in the initial chunk if *any* eager importer needs it, so a shared runtime only leaves the critical path when **both** importers are deferred. Tier 1's W1 defers the SDK inside `SwapperProvider`; this design defers the connectors inside `ChainsProvider`. Together they move the shared runtimes off first paint, which is the LCP win.

## Constraint that shapes the design

`ChainsProvider` currently wraps the whole app in the heavy providers: `<SolanaWalletWrapper><EVMWalletWrapper><WrappedChainsProvider>{app}`. Those wrappers (`WalletProvider` from `@solana/wallet-adapter-react`; `WagmiProvider` from `wagmi`) are ancestors of the app, and `WrappedChainsProvider` runs the per-chain hooks that require them. The naive fix ("keep them wrapping `children`, make them `React.lazy`") does not work: when the lazy providers arrive post-paint, `children` moves from the default-context tree into the provider tree and React **remounts the entire app** (state loss, effects re-run, visible flicker). Therefore the heavy wrappers must stop being ancestors of the app. Inside `ChainsProvider` they become a lazily-loaded **bridge subtree** that runs the connector hooks and lifts their results into the same `ChainsContext` the app already reads — the app never remounts.

## Three connector shapes (not uniform)

- **Solana** (`useSolanaChain.tsx`) and **EVM** (`useEVMChains.tsx`) require a React provider wrapper (`SolanaWalletWrapper` = `WalletProvider`; `EVMWalletWrapper` = `WagmiProvider` + `QueryClientProvider`) as an ancestor of their hooks. These wrappers, their `config`/`queryClient`/wallet-adapter singletons, and `wagmi`/`@solana/web3.js` live at module scope in those files.
- **Starknet** (`useStarknetChain.ts`) needs **no** provider wrapper, but has heavy **module-level** imports and side effects: it constructs a `@cartridge/controller` `Controller`, calls `getStarknet()`, and sets `window.starknet_cartridge` at import time. Deferring Starknet means dynamically importing this module (so those imports + side effects run when the bridge loads, not at app start).
- **Bitcoin** (`useBitcoinChain.ts`) and **Lightning** (`useLightningNetwork.ts`) are light (extension wallets / WebLN) and **stay eager** in the shell. Bitcoin consumes the smart-chain wallet *names* (`connectedOtherChainWallets`) to auto-connect multichain wallets — this is a cross-layer seam the shell must feed from the bridge's results.

## Architecture

```
ChainsProvider  (SHELL — always mounted, imports NO chain runtime)
├── holds `scChains` state (populated by the bridge), merges with eager BTC/LN into `chains`
├── provides ChainsContext { chains, connectWallet, disconnectWallet, changeWallet }
├── runs useBitcoinChain + useLightningNetwork EAGERLY (light), fed SC wallet names from scChains
├── renders <ConnectWalletModal/> (reads installedWallets from `chains`)
├── renders {children}  ← the app; paints immediately; never remounts
└── after first paint, mounts:
      <Suspense fallback={null}>
        <ConnectorBridge onScChains={setScChains} />   // dynamic import()
      </Suspense>

ConnectorBridge  (LAZY chunk — the heavy runtime lands here)
└── <SolanaWalletWrapper>
      <EVMWalletWrapper>
        <ConnectorHookRunner onScChains={…}/>   // renders null; runs the SC hooks, lifts results up
      </EVMWalletWrapper>
    </SolanaWalletWrapper>
```

`ConnectorHookRunner` runs `useSolanaChain`, `useCitreaChain`, `useBotanixChain`, `useAlpenChain`, `useGoatChain`, `useStarknetChain`, assembles the `Record<chainId, Chain>` for the smart chains, and calls `onScChains(scChains)` (in an effect keyed on the assembled value) to lift it into the shell. It renders `null` — the wrappers exist only to satisfy the hooks, not to wrap UI.

## Data flow

1. Mount: shell renders `ChainsContext.Provider` with `chains = { BITCOIN, LIGHTNING }` (eager) and `scChains = {}`; the app paints (swap card renders from static token metadata per W1). Any consumer asking for a smart-chain wallet gets `null` — a state the UI already handles (it renders the "connect" affordance).
2. Post-paint: a `useEffect` in the shell schedules the bridge via `requestIdleCallback` (fallback `setTimeout(…, 1)`), flipping a `loadBridge` flag so `<ConnectorBridge>` dynamic-imports and mounts. The chain runtimes download/parse in that async chunk, off the LCP path.
3. Bridge ready: the connector hooks run their existing auto-reconnect logic (Solana `autoConnect`, Starknet `starknet-wallet` localStorage, wagmi persistence). For returning connected users this reconnects a beat later than today (accepted). The runner lifts `scChains` into the shell; `chains` recomputes to include the smart chains; consumers re-render with real wallet state.
4. Connect: `connectWallet(chainId)` opens the modal (unchanged). Because the bridge auto-loads immediately post-paint, by the time a user clicks it is already populated, and the modal's `onWalletClick` calls `chains[chainId]._connectWallet(name)` exactly as today. For the narrow window before the bridge is ready, the shell reports a "connectors initializing" state (disable the connect entry / show a spinner); if a click lands in that window, the intent is queued and executed once `scChains` lifts.

## SwapperProvider composition (Tier 1 W1)

Unchanged from the Tier 1 plan: `SwapperProvider` dynamically imports `Factory` inside `loadSwapper()`, so the SDK forms its own async chunk. It sits below the shell (`<ChainsProvider><SwapperProvider><App/>`), and the hierarchy in `App.tsx` does not change. The two deferrals are independent components that compose: only with both does the shared runtime leave the initial chunk. This design does not modify `SwapperProvider` beyond what Tier 1 Task 5 already specifies.

## Error handling

- Bridge chunk fails to load: catch in an error boundary around the `<Suspense>`; the app keeps working for Bitcoin/Lightning; smart-chain entries report "unavailable" with a retry that re-triggers the dynamic import. No white screen.
- Per-chain connect/disconnect errors: unchanged — the existing `try/catch` in `ConnectWalletModal.onWalletClick` and the per-hook handlers are preserved.
- Starknet module side effects (`window.starknet_cartridge`, `getStarknet()`) now run at bridge-load time; nothing reads them before the bridge, so ordering is safe. Verify no other module assumes `window.starknet_cartridge` exists at startup.

## Testing

- Unit (vitest + RTL): (a) shell renders the app with `chains` containing only BITCOIN/LIGHTNING and no smart chains before the bridge mounts; a smart-chain `useWallet(...)` returns null and the UI shows the connect state, no crash. (b) When `onScChains` is called with a stub map, `ChainsContext.chains` includes those chains and consumers see them. (c) `connectWallet` opens the modal; a click during the not-ready window queues and later fires `_connectWallet`. (d) The eager `useBitcoinChain` receives SC wallet names derived from lifted `scChains`.
- Build assertion: the smart-chain runtimes (`@solana/*`, `starknet`, `@cartridge/*`, wagmi/viem/ethers) and the connector code appear in a **separate async chunk**, not in the `index.html` entry chunk; the initial chunk shrinks materially vs. the W0 baseline.
- Manual smoke (regression-critical): returning connected users still auto-reconnect (Solana, Starknet, EVM, Bitcoin) a beat after load; connect/disconnect/change-wallet works for each chain; a full swap of each type completes; deep-linked pairs still resolve; no console errors on load; the cross-chain BTC auto-connect for multichain wallets (Phantom/Xverse) still fires once the SC wallet connects.

## Risks and open measurement items

- **`@noble` may ride the eager Bitcoin path.** Bitcoin wallets pull `@scure/btc-signer` → `@noble` (2.23 MB raw). If the eager BTC path imports it at module load (vs. only at signing time), that crypto stays on the critical path even after connector deferral. Measure after implementation; if it stays, defer the PSBT/signing bits (BTC *connect* uses extension APIs and may not need `btc-signer` until signing).
- **Starknet side-effect timing** (above) — verify nothing depends on `window.starknet_cartridge` pre-bridge.
- **`useEVMChain` calls hooks after an early `if(config==null) return null`** — a rules-of-hooks smell that currently works because `config` is a stable module constant. Deferral does not change this (config stays a module constant in the lazy chunk); do not "fix" it as a side effect.
- **`QueryClient` singleton** in `useEVMChains` is created at module scope; it moves into the lazy chunk with the rest — fine, but confirm nothing outside references it.
- **autoConnect a beat later** for returning users — accepted by Marci.

## Out of scope (future optimization)

The localStorage-connected-flag ("skip loading connectors entirely for disconnected users, and reconnect eagerly only if a wallet was connected last session") is a further win layered on top of this always-defer restructure. It is deliberately not in this pass; the restructure here is its prerequisite.
