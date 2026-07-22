# Perf epic — Layer 2 implementation plan (app-side runtime decoupling)

Status: APPROVED by Adam 2026-07-22; W2-W4 DELIVERED 2026-07-22 on branch `perf/layer2-app` (`af2b616..61bd26d`, entry chunk −24% raw / −25% gz); **W5 added 2026-07-22 after post-delivery bundle tracing — open**. Created 2026-07-21. Design source: `docs/perf-epic-design.md` §"Layer 2". Enabler (Layer 1) is DONE on the four `@atomiqlabs` `perf/esm-treeshake` branches (base `bffbbcd` → btc-mempool `1ec1a78` + messenger-nostr `3e14048` → sdk `cdddd3d` incl. the instance guards), tree-shakeable and native-ESM-correct.

## Goal

Layer 1 made the SDK tree-shakeable; on its own it changes nothing in the app, because the webapp still imports the heavy parts eagerly. Layer 2 removes those eager pulls so first paint imports only the light SDK helpers (`isSCToken`, `SwapType`, a few predicates — tens of KB) instead of the whole ~1.19 MB chain+SDK payload. Four workstreams: W2 (swap-class `instanceof` → `getType()`), W3a (generated static token metadata), W3b (lazy `Factory`), W4 (connector bridge). The LCP win only fully lands when all four are in.

## Prerequisite — point the webapp at the branch SDK (no publish wait)

- [ ] Branch the webapp: `perf/layer2-app` off `perf/tier1` (keeps the epic docs travelling with the work; `perf/tier1` is doc-only so far).
- [ ] Temporarily install the tree-shakeable SDK from the branch: `npm install atomiqlabs/atomiq-sdk#perf/esm-treeshake` (transitively pulls base/mempool/nostr from their branches — proven working in the 2026-07-20 integration test). This is the "link locally" step; it stays until Adam publishes, at which point the dep flips to a published `^X.Y.Z` in one line before Layer 2 merges to `develop`.
- [ ] Capture a fresh baseline with the branch SDK, Layer-2 changes NOT yet applied: `npm run build`, record initial-chunk gz size and the SDK/chain footprint from the bundle analyzer (this is the number every task below is measured against; expected ≈ the 1,842 → 1,792 KB gz "flat" figure from Layer 1).

## Resolved approach — add swap instance type guards to the SDK (supersedes the old escrow-guard question)

The original design note (replace `instanceof IEscrowSelfInitSwap` with `isIEscrowSelfInitSwapInit()`, export it from the barrel) does not fit the `useCheckAdditionalGas.ts:23` call site, which then calls `quote.hasEnoughForTxFees()` / `quote._getInitiator()`: `isIEscrowSelfInitSwapInit(obj): obj is IEscrowSelfInitSwapInit<T>` narrows to the **Init data shape** (no instance methods → those calls don't type-check), and its runtime check wants `typeof obj.feeRate === "string"` while serialization produces the string via `feeRate.toString()` (SDK `IEscrowSelfInitSwap.ts:214`) — so it can return `false` on a live instance it should match. Root cause: the SDK has **no instance-level type guards for swaps** — only `isXInit()` guards for serialized init objects, plus token guards (`isSCToken`, `isBtcToken`), but nothing that narrows an `ISwap` to a subclass. The clean fix is to add them (W2a), which puts the type→class mapping in the SDK (single source of truth, Adam-owned), narrows to the **class** (instance methods available), checks via `getType()` (robust on live instances), and stays tree-shakeable (light free functions; the classes stay type-only in consumers). `isIEscrowSelfInitSwapInit` is left as-is — it is correct for its own purpose (validating serialized init objects), just not for narrowing instances.

## W2 — add swap instance guards to the SDK, consume them in the app (replaces the 5 `instanceof` sites)

Goal: stop importing swap **classes** as runtime values in the app, so they erase to type-only imports and drop off the eager path — and put the type→class mapping in the SDK where it belongs, not in a webapp-local file. `SwapType` stays a value import (tiny enum, already on the light path). After this the swap panels need no lazy-loading.

Verified enum + class mapping (SDK `enums/SwapType.ts` + each class's `TYPE`): `FROM_BTC=0`(`FromBTCSwap`), `FROM_BTCLN=1`(`FromBTCLNSwap`), `TO_BTC=2`(`ToBTCSwap`), `TO_BTCLN=3`(`ToBTCLNSwap`), `TRUSTED_FROM_BTC=4`(`OnchainForGasSwap`), `TRUSTED_FROM_BTCLN=5`(`LnForGasSwap`), `SPV_VAULT_FROM_BTC=6`(`SpvFromBTCSwap`), `FROM_BTCLN_AUTO=7`(`FromBTCLNAutoSwap`). Families: `IToBTCSwap`={TO_BTC, TO_BTCLN}; `IFromBTCSelfInitSwap`={FROM_BTC, FROM_BTCLN}; `IEscrowSelfInitSwap`=their union {FROM_BTC, FROM_BTCLN, TO_BTC, TO_BTCLN}.

### W2a — SDK branch (`sdk#perf/esm-treeshake`): add instance type guards — draft spec for Adam

Free functions co-located with each class / family (matches the existing `isSCToken` free-function convention), barrel-exported from `index.ts` with a typedoc line each. Concrete guards are a single `getType()` compare; **family guards use an exhaustive `switch` with a `never` default**, so adding a future `SwapType` fails the SDK build until it is classified — this structurally removes the mapping-drift risk. Free functions (not static `Class.is()` methods) are required: a static method would force importing the class to call it, defeating the tree-shaking goal.

Needed by the app now (the 5 sites):

| guard | narrows to | `getType()` match | file (co-locate) |
|---|---|---|---|
| `isFromBTCSwap` | `FromBTCSwap` | `FROM_BTC` | `swaps/escrow_swaps/frombtc/onchain/FromBTCSwap.ts` |
| `isFromBTCLNSwap` | `FromBTCLNSwap` | `FROM_BTCLN` | `swaps/escrow_swaps/frombtc/ln/FromBTCLNSwap.ts` |
| `isSpvFromBTCSwap` | `SpvFromBTCSwap` | `SPV_VAULT_FROM_BTC` | `swaps/spv_swaps/SpvFromBTCSwap.ts` |
| `isIToBTCSwap` | `IToBTCSwap` | `{TO_BTC, TO_BTCLN}` | `swaps/escrow_swaps/tobtc/IToBTCSwap.ts` |
| `isIEscrowSelfInitSwap` | `IEscrowSelfInitSwap` | `{FROM_BTC, FROM_BTCLN, TO_BTC, TO_BTCLN}` | `swaps/escrow_swaps/IEscrowSelfInitSwap.ts` |

Recommended to complete the set (same pattern, cheap, keeps the API symmetric — Adam's call): `isToBTCSwap` (TO_BTC), `isToBTCLNSwap` (TO_BTCLN), `isOnchainForGasSwap` (TRUSTED_FROM_BTC), `isLnForGasSwap` (TRUSTED_FROM_BTCLN), `isFromBTCLNAutoSwap` (FROM_BTCLN_AUTO), `isIFromBTCSelfInitSwap` ({FROM_BTC, FROM_BTCLN}).

Patterns:

```ts
// concrete — in the class's own file, next to its TYPE definition
export function isFromBTCSwap<T extends ChainType = ChainType>(swap: ISwap<T>): swap is FromBTCSwap<T> {
    return swap.getType() === SwapType.FROM_BTC;
}

// family — exhaustive; the never default forces classifying any new SwapType
export function isIEscrowSelfInitSwap<T extends ChainType = ChainType>(swap: ISwap<T>): swap is IEscrowSelfInitSwap<T> {
    switch (swap.getType()) {
        case SwapType.FROM_BTC: case SwapType.FROM_BTCLN:
        case SwapType.TO_BTC:   case SwapType.TO_BTCLN:   return true;
        case SwapType.TRUSTED_FROM_BTC: case SwapType.TRUSTED_FROM_BTCLN:
        case SwapType.SPV_VAULT_FROM_BTC: case SwapType.FROM_BTCLN_AUTO: return false;
        default: { const _exhaustive: never = swap.getType(); return false; }
    }
}
```

- [ ] Add the guards (thread each class's exact generics — some carry extra type params with defaults; Adam owns the precise signatures).
- [ ] Barrel-export all from `src/index.ts` with a typedoc line each.
- [ ] SDK unit test: assert every guard's truth set across all 8 `SwapType` values (the `never` default is the compile-time half of this).
- [ ] Commit to `sdk#perf/esm-treeshake`; flag the new API for Adam's review (additive, backwards-compatible); re-`npm install` the branch in the webapp.

### W2b — webapp: consume the SDK guards at the 5 sites

- [ ] `hooks/fees/useSwapFees.ts:65` — `swap instanceof FromBTCSwap` → `isFromBTCSwap(swap)` (watchtower/claimer-bounty fee; FROM_BTC only).
- [ ] `hooks/fees/useSwapFees.ts:87` — `swap instanceof IToBTCSwap` → `isIToBTCSwap(swap)`.
- [ ] `hooks/fees/useSwapFees.ts:90` — `swap instanceof FromBTCLNSwap` → `isFromBTCLNSwap(swap)`.
- [ ] `hooks/fees/useSwapFees.ts:93` — `swap instanceof FromBTCSwap || swap instanceof SpvFromBTCSwap` → `isFromBTCSwap(swap) || isSpvFromBTCSwap(swap)`.
- [ ] `hooks/swaps/helpers/useCheckAdditionalGas.ts:23` — `quote instanceof IEscrowSelfInitSwap` → `isIEscrowSelfInitSwap(quote)` (narrows to the class, so `.hasEnoughForTxFees()` / `._getInitiator()` stay callable).
- [ ] Replace the value imports of the swap classes with the guard imports; if any class name is still referenced purely as a type, keep it `import type`. No webapp-local `swapTypeGuards.ts` — the SDK is the source of truth.
- [ ] Verify: `npm run typecheck` clean; bundle analyzer shows the swap classes no longer in the eager chunk.

## W3a — generated static token metadata

Goal: `utils/Tokens.ts` currently imports `{TokenResolver, Tokens}` from `utils/SwapperFactory` (`Tokens.ts:11`), which instantiates the module-level `Factory = new SwapperFactory([...6 chain initializers])` — dragging every chain runtime onto first paint. Replace the SDK-sourced token data with a build-time-generated plain-data module that has zero SDK imports.

- [ ] `scripts/genTokens.ts` (tsx/Node): import `Factory` from `src/utils/SwapperFactory`, read `Factory.Tokens` + `Factory.TokenResolver`, emit `src/data/tokenMeta.generated.ts` — plain objects `{chainId, ticker, name, decimals, displayDecimals?, address, chain, lightning?}` for every token, plus a flat address→meta lookup to replace `TokenResolver[chainId].getToken(address)`. No SDK types in the output (structural shapes only).
- [ ] Tiny Vite plugin (in `vite.config.ts`, `buildStart` hook) that runs `genTokens` on **both** `npm start` and `npm run build`, so the generated file can never silently go stale.
- [ ] Refactor `utils/Tokens.ts`: build `smartChainTokenArray`, `TokenIcons` typing, `fromTokenIdentifier`, and `getChainIdentifierForCurrency` from `tokenMeta.generated` instead of `Tokens`/`TokenResolver`; drop the `import ... from "./SwapperFactory"`. Keep the `ChainsConfig`-gated inclusion logic. Preserve `toTokenIdentifier` string format (`chainId:address` / `BITCOIN` / `LIGHTNING`) exactly — other modules depend on it.
- [ ] Grep for every other importer of `utils/SwapperFactory`'s `Tokens`/`TokenResolver` (besides `Tokens.ts`) and repoint them at the generated metadata or at `Tokens.ts` re-exports; the only remaining `SwapperFactory` importer after this should be `SwapperProvider` (W3b), which loads it lazily.
- [ ] Drift test (CI): regenerate into a temp path and diff against the committed `tokenMeta.generated.ts`; fail if they differ (catches an un-regenerated commit).
- [ ] Verify: analyzer shows no chain-initializer packages in the eager chunk via the `Tokens.ts` path; swap card renders token list with the SDK not yet loaded.

## W3b — lazy `Factory` in `SwapperProvider`

Goal: `SwapperProvider` imports `{Factory}` at module top (`SwapperProvider.tsx:9`) and logs it at load (`:11`), so the chain-initializer packages (`@atomiqlabs/chain-solana/starknet/evm` → `@solana/web3.js`, `starknet`, `ethers`/`viem`) load eagerly. Defer to the first `loadSwapper()` call (which already runs in an effect, off the paint path).

- [ ] Remove the top-level `import {Factory} from "../utils/SwapperFactory"` and the module-level `console.log('Factory: ', Factory)`.
- [ ] Inside `loadSwapper()`, before `Factory.newSwapper(...)`: `const {Factory} = await import("../utils/SwapperFactory");`. The chain runtimes become a post-paint async chunk.
- [ ] Change `import {Swapper}` to `import type {Swapper}` (used only as a type here).
- [ ] Verify: analyzer shows a separate chain-runtime async chunk and a smaller entry chunk; swap still loads and initializes; `noSwapperPaths` (`/about`, `/faq`, `/explorer`) still skip loading.

## W4 — connector bridge inside `ChainsProvider` (always-defer, provider pattern kept)

Goal (biggest/riskiest): `ChainsProvider` wraps `WrappedChainsProvider` in `SolanaWalletWrapper` + `EVMWalletWrapper` and runs all seven chain hooks (Solana, Starknet, 4×EVM, Lightning, Bitcoin) eagerly — pulling every wallet-adapter lib and, via `useBitcoinChain`/`BitcoinWalletUtils`, all 7 BTC wallet adapters + `@scure/btc-signer` + the SDK's bitcoin-wallet classes (~0.5 MB+). Move the whole connector layer behind a lazily-mounted bridge that lifts its result into the same `ChainsContext` the app already reads, so nothing remounts.

- [ ] Turn `ChainsProvider` into a shell that owns `const [chains, setChains] = useState<Record<string, Chain<any>>>({})` and the modal/connect machinery (`connectWallet`, `disconnectWallet`, `changeWallet`, `ConnectWalletModal`), and provides `ChainsContext` immediately with the (initially empty) `chains` + callbacks. It renders `props.children` right away — first paint shows the swap card with no wallet yet (a state the UI already handles).
- [ ] After first paint (an effect), lazy-import and mount `<ConnectorBridge onChains={setChains} />` — a new `providers/ConnectorBridge.tsx` that contains `SolanaWalletWrapper` + `EVMWalletWrapper` wrapping a null-rendering hook-runner which runs **all** chain hooks — Solana, Starknet, the 4 EVM, Lightning, **and Bitcoin + Lightning** — computes the `chains` map (the current `useMemo` in `WrappedChainsProvider`), and lifts it up via `useEffect(() => onChains(chains), [chains])`. Because all hooks run together in the bridge, the `useBitcoinChain` cross-chain-name seam (`ChainsProvider.tsx:67-74`) stays internal — no shell→bridge handoff.
- [ ] Keep the connect flow working against lifted state: the modal + `connectWalletPromiseCbk` ref live in the shell; `_connectWallet`/`_disconnect` come from the `chains` map once the bridge populates. Handle the connect-during-load window (user clicks Connect before the bridge mounts) and an error boundary per `perf-epic-design.md` §Layer 2 (folds in the old `perf-connector-deferral-design.md` behavior). With always-defer the connector layer populates a beat after paint, before any realistic Connect click.
- [ ] Confirm no other module imports `WalletTypes`/`Chain`/`ChainIdentifiers` types from `ChainsProvider` in a way that breaks when the hooks move (these are type exports — should be fine, but grep).
- [ ] Verify: analyzer shows the wallet-adapter + BTC-wallet + `@scure/btc-signer` weight in a post-paint async chunk, not the entry chunk; manual smoke — fresh load (no wallet), connect each chain, disconnect, reconnect, and returning-user autoConnect (a beat later, accepted).

## W5 — decouple `ChainsConfig` runtime construction + finish the eager-path burn-down (added 2026-07-22)

**Why (found by tracing `stats.json` after W2-W4 landed):** the entry chunk still carries `@noble/curves` (~383 KB gz module weight), `ethers` (~238), `starknet` (~150), `@solana/spl-token` (~122), all three `@atomiqlabs/chain-*` runtimes, ~106 KB of SDK, and `@scure/btc-signer` (~79) — because **`src/data/ChainsConfig.ts` is a second eager anchor the original design never identified**. It constructs, at module level: `new MempoolApi` + `new MempoolBitcoinRpc` (SDK/btc-mempool), `new Connection` (`@solana/web3.js`) + `new SolanaFees` (chain-solana), `new RpcProviderWithRetries`/`WebSocketChannelWithRetries` (chain-starknet → `starknet`), and `JsonRpcProviderWithRetries`/`WebSocketProviderWithRetries` per EVM chain (chain-evm → `ethers`), plus it imports `constants` from `starknet` for chain ids. `ChainsConfig` is imported eagerly by `Tokens.ts`, `SwapperProvider.tsx`, `useCheckAdditionalGas.ts` and others, so Rollup hoists every module it shares with the lazy chunks back into the entry. Separately, `useQuote.ts` and the bitcoin wallet base classes keep `@scure/btc-signer` + heavy SDK bitcoin classes eager. W2-W4 severed the connector/Factory paths (proven: `ConnectorBridge` async chunk exists); W5 severs the config/quote paths — this is where the promised "entry = light SDK + app UI" actually lands, and the lever for the mobile Lighthouse score.

### W5a — split `ChainsConfig` into eager data + lazy runtime

- [ ] `src/data/ChainsConfig.ts` becomes **data-only** (keeps the export name, module path, and nested per-chain shape for the fields eager consumers use): enabled-ness (per-chain presence), `blockExplorer`, `network`, `assetBalances`, `chainId`, `chainType`, `evmConfig`, mempool URL lists. NO heavy imports: replace `constants.StarknetChainId.SN_MAIN/SN_SEPOLIA` with the literal chain-id strings (type-only import if a type is wanted); `BitcoinNetwork` (SDK enum) is a light tree-shakeable import and may stay; drop/inline `WalletAdapterNetwork` if `@solana/wallet-adapter-base` proves non-light. Acceptance: `ChainsConfig.ts` imports nothing that transitively reaches `starknet`, `ethers`, `@solana/web3.js`, `chain-*`, or SDK runtime classes.
- [ ] New `src/data/ChainsRuntime.ts` (imported ONLY from lazy graphs): exports a **memoized** `getChainsRuntime()` that builds the full old-shape object — data fields + constructed `mempoolApi`, `rpc` (MempoolBitcoinRpc), Solana `Connection`+`SolanaFees` (+ `fetchWithTimeout`, which moves here), Starknet `RpcProviderWithRetries`/`WebSocketChannelWithRetries`, EVM providers. Memoization matters: `SwapperProvider` (via its existing dynamic import) and the bridge's chain hooks must share the SAME provider/connection instances, as they implicitly do today.
- [ ] Repoint consumers by the rule: eager modules (`Tokens.ts`, `useCheckAdditionalGas.ts`, any UI reading explorer links/balances/flags) touch only data fields from `ChainsConfig`; runtime objects are reachable only via `getChainsRuntime()` from lazy graphs (`SwapperProvider`'s `loadSwapper()` dynamic import; the chain hooks inside `ConnectorBridge`). Map every current `ChainsConfig` consumer and classify before editing.

### W5b — defer the remaining bitcoin-stack eager path

- [ ] Trace and break the static chains keeping `@scure/btc-signer` + SDK bitcoin wallet classes in the entry: `src/hooks/quoting/useQuote.ts` and the `src/wallets/bitcoin/base/*` value-imports reachable from eager hooks (e.g. `useFromBtcQuote`, `useSpvVaultFromBtcQuote`). Convert type-position imports to `import type`; where runtime use is real (PSBT building, address parsing), move it behind a dynamic import or into the bridge-loaded graph so it lands in a lazy chunk. Behavior byte-identical; only load timing changes.

### W5c — entry-audit burn-down + measurement

- [ ] Rebuild with `npm run analyze`; from `stats.json`, assert the entry chunk contains NO modules from: `starknet`, `ethers`, `@solana/web3.js`, `@solana/spl-token`, `@coral-xyz/anchor`, `@atomiqlabs/chain-*`, `@scure/btc-signer`; and that SDK-in-entry collapses toward the light helpers. Chase any survivor by its import chain (same tracing as above) until the list is clean or each survivor has a documented reason.
- [ ] Target: entry chunk ≈ app src + React/UI + polyfills + light SDK — order ~500 KB gz (from 1,305). Record before/after in the progress ledger.
- [ ] Verify: `npm run typecheck` + `npm test` (unchanged known failures only) + `npm run build`; Playwright smoke vs `vite preview` (first paint renders, no console errors); Lighthouse re-run against a **compressed** static serve (`npx serve -s build`), mobile + desktop, recorded alongside the pre-W5 run (mobile 28 uncompressed / see 2026-07-22 measurements).

Risks: instance-sharing (Factory vs hooks must reuse the same providers — the memoized getter is load-bearing); `as const` typing shape drift for `ChainsConfig` consumers (keep field names/types identical for the data fields); a data-module import that silently reaches a heavy package via re-exports (the stats.json audit is the gate, not eyeballing imports).

## Sequencing

W2 → W3a → W3b → W4, in that order (independent enough to land as separate commits, but the eager-import audit is cleanest bottom-up: kill the class imports, then the token path, then the Factory, then the connectors). Re-measure the entry-chunk gz after each so the win is attributable. The full LCP win only shows once all four are in.

## Testing & acceptance

- [ ] Per-task analyzer assertion (above) — each workstream removes an identifiable eager chunk.
- [ ] SDK guard unit test (W2a) — every guard's truth set across all 8 `SwapType` values; the family guards' `never` default is the compile-time half.
- [ ] `tokenMeta.generated` drift test (W3a).
- [ ] Manual smoke of every swap type + deep-linked token pairs + wallet connect/disconnect/reconnect (W4).
- [ ] Final: real `npm run build`, entry-chunk gz materially below the W0/branch baseline; a swap completes end-to-end on the ESM webapp; `npm run typecheck` clean.

## Measurement target

Entry chunk should drop from ~1.79 MB gz toward the light-SDK path (tens of KB of SDK) + the app's own React/UI weight, with the chain runtimes, wallet adapters, and BTC signer all moved to post-paint async chunks. Exact target set from the branch baseline captured in the prerequisite step. CLS and the other classic-perf items (needed for a fully Passing CWV assessment) are Layer 3, deferred to `docs/perf-classic-frontend-design.md`.

## Risks

- Family-guard mapping (W2a) — the abstract-base sets (`IToBTCSwap`, `IEscrowSelfInitSwap`) must enumerate exactly; the SDK guards' exhaustive `switch` + `never` default makes a mis-mapping a compile error, and the unit test covers the runtime side. Now an SDK change (Adam-owned API) rather than app-local, so it stays correct for every consumer.
- `ConnectorBridge` state-lift loops (W4) — the hooks return fresh objects each render; memoize the `chains` map and lift via a single effect, as the current `WrappedChainsProvider` already does.
- Connect-during-load window + returning-user autoConnect a beat later (W4) — accepted; needs the error boundary + a pending-connect handoff.
- Publish coordination — the SDK dep stays on the git branch through development; flip to published semver only at merge. If Adam adds the barrel export, re-install the branch.

## Out of scope

The wallet localStorage-connected-flag (skip connectors entirely for disconnected users); node-polyfill trimming; any change to the SDK's `dist` (CJS); Layer 3 (CLS, route-split, landing mobile, dedup, cache verify).
