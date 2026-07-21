# Perf epic — Layer 2 implementation plan (app-side runtime decoupling)

Status: DRAFT for Marci's review — do not start coding until approved. Created 2026-07-21. Design source: `docs/perf-epic-design.md` §"Layer 2". Enabler (Layer 1) is DONE on the four `@atomiqlabs` `perf/esm-treeshake` branches (base `bffbbcd` → btc-mempool `1ec1a78` + messenger-nostr `3e14048` → sdk `fa7e2bc`), tree-shakeable and native-ESM-correct.

## Goal

Layer 1 made the SDK tree-shakeable; on its own it changes nothing in the app, because the webapp still imports the heavy parts eagerly. Layer 2 removes those eager pulls so first paint imports only the light SDK helpers (`isSCToken`, `SwapType`, a few predicates — tens of KB) instead of the whole ~1.19 MB chain+SDK payload. Four workstreams: W2 (swap-class `instanceof` → `getType()`), W3a (generated static token metadata), W3b (lazy `Factory`), W4 (connector bridge). The LCP win only fully lands when all four are in.

## Prerequisite — point the webapp at the branch SDK (no publish wait)

- [ ] Branch the webapp: `perf/layer2-app` off `perf/tier1` (keeps the epic docs travelling with the work; `perf/tier1` is doc-only so far).
- [ ] Temporarily install the tree-shakeable SDK from the branch: `npm install atomiqlabs/atomiq-sdk#perf/esm-treeshake` (transitively pulls base/mempool/nostr from their branches — proven working in the 2026-07-20 integration test). This is the "link locally" step; it stays until Adam publishes, at which point the dep flips to a published `^X.Y.Z` in one line before Layer 2 merges to `develop`.
- [ ] Capture a fresh baseline with the branch SDK, Layer-2 changes NOT yet applied: `npm run build`, record initial-chunk gz size and the SDK/chain footprint from the bundle analyzer (this is the number every task below is measured against; expected ≈ the 1,842 → 1,792 KB gz "flat" figure from Layer 1).

## Decision to approve before W2 — the escrow guard at `useCheckAdditionalGas`

The design note says to replace `quote instanceof IEscrowSelfInitSwap` with the SDK's `isIEscrowSelfInitSwapInit()` and to export that guard from the SDK barrel (`index.ts`) with a typedoc. Two concrete problems at that specific call site (`hooks/swaps/helpers/useCheckAdditionalGas.ts:23`, which then calls `quote.hasEnoughForTxFees()` and `quote._getInitiator()`):

1. Type narrowing: `isIEscrowSelfInitSwapInit(obj): obj is IEscrowSelfInitSwapInit<T>` narrows to the **Init data shape** (`{feeRate, signatureData, ...}`), which has none of the instance methods the call site uses — so `quote.hasEnoughForTxFees()` would not type-check after that guard.
2. Runtime: the guard requires `typeof obj.feeRate === "string"`. Serialization emits `feeRate.toString()` (SDK `IEscrowSelfInitSwap.ts:214`), which implies the in-memory `this.feeRate` may not be a `string` — so the guard can return `false` for a live swap instance it should match.

**Recommendation:** use a `getType()`-set instance predicate `isEscrowSelfInitSwap(swap): swap is IEscrowSelfInitSwap` over `{FROM_BTC, FROM_BTCLN, TO_BTC, TO_BTCLN}` (verified: those four concrete classes — `FromBTCSwap`, `FromBTCLNSwap`, `ToBTCSwap`, `ToBTCLNSwap` — are exactly the ones extending `IEscrowSelfInitSwap`; `FromBTCLNAutoSwap` extends `IEscrowSwap` and `SpvFromBTCSwap` extends `ISwap`, so both are correctly excluded). `IEscrowSelfInitSwap` is imported `import type` (erased), so no class weight lands. This is robust on live instances and consistent with the other four sites. Adam's requested barrel-export + typedoc of `isIEscrowSelfInitSwapInit` is then **decoupled** from the app wiring — include it to honor the request (it's harmless and used at the SDK's own init sites), or drop it. **Marci/Adam: confirm the predicate approach + whether to still add the barrel export.**

## W2 — `getType()` instead of `instanceof` (5 sites)

Goal: stop importing the swap **classes** as runtime values, so they become type-only imports (erased at build) and no longer drag their crypto weight onto the eager path. `SwapType` stays a value import (tiny enum, already on the light path). After this, the swap panels need no lazy-loading.

Verified enum + class mapping (from SDK `enums/SwapType.ts` and each class's `TYPE`): `FROM_BTC=0`(`FromBTCSwap`), `FROM_BTCLN=1`(`FromBTCLNSwap`), `TO_BTC=2`(`ToBTCSwap`), `TO_BTCLN=3`(`ToBTCLNSwap`), `TRUSTED_FROM_BTC=4`, `TRUSTED_FROM_BTCLN=5`, `SPV_VAULT_FROM_BTC=6`(`SpvFromBTCSwap`), `FROM_BTCLN_AUTO=7`. `IToBTCSwap` = `{TO_BTC, TO_BTCLN}`; `IEscrowSelfInitSwap` = `{FROM_BTC, FROM_BTCLN, TO_BTC, TO_BTCLN}`.

- [ ] Create `src/utils/swapTypeGuards.ts` centralizing the predicates as typed type-guards, classes imported `import type` and only `SwapType` imported as a value: `isFromBTCSwap` (`=== FROM_BTC`), `isFromBTCLNSwap` (`=== FROM_BTCLN`), `isToBTCSwap` (`=== TO_BTC || === TO_BTCLN`), `isSpvFromBTCSwap` (`=== SPV_VAULT_FROM_BTC`), `isEscrowSelfInitSwap` (the four-value set above). One home for the mapping keeps it unit-testable and prevents drift.
- [ ] `hooks/fees/useSwapFees.ts:65` — `swap instanceof FromBTCSwap` → `isFromBTCSwap(swap)` (watchtower/claimer-bounty fee; FROM_BTC only).
- [ ] `hooks/fees/useSwapFees.ts:87` — `swap instanceof IToBTCSwap` → `isToBTCSwap(swap)`.
- [ ] `hooks/fees/useSwapFees.ts:90` — `swap instanceof FromBTCLNSwap` → `isFromBTCLNSwap(swap)`.
- [ ] `hooks/fees/useSwapFees.ts:93` — `swap instanceof FromBTCSwap || swap instanceof SpvFromBTCSwap` → `isFromBTCSwap(swap) || isSpvFromBTCSwap(swap)`.
- [ ] `hooks/swaps/helpers/useCheckAdditionalGas.ts:23` — `quote instanceof IEscrowSelfInitSwap` → `isEscrowSelfInitSwap(quote)` (see decision above).
- [ ] Change the swap-class imports in both files to `import type` (drop `FromBTCSwap`, `FromBTCLNSwap`, `IToBTCSwap`, `SpvFromBTCSwap`, `IEscrowSelfInitSwap` from the value-import lists). Keep `SwapType`, `isSCToken`, and the genuinely-runtime helpers as value imports.
- [ ] (Optional, per decision) SDK branch: add `isIEscrowSelfInitSwapInit` to `src/index.ts` barrel (currently `index.ts:99` exports only `{IEscrowSelfInitSwap}`) + a typedoc comment on the function. One line + a comment; commit to `sdk#perf/esm-treeshake`, then re-`npm install` the branch in the webapp.
- [ ] Unit test `swapTypeGuards.test.ts`: assert each predicate's truth set across all 8 `SwapType` values (locks the abstract-base mappings against the old `instanceof` behavior — the design's flagged risk).
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

## Sequencing

W2 → W3a → W3b → W4, in that order (independent enough to land as separate commits, but the eager-import audit is cleanest bottom-up: kill the class imports, then the token path, then the Factory, then the connectors). Re-measure the entry-chunk gz after each so the win is attributable. The full LCP win only shows once all four are in.

## Testing & acceptance

- [ ] Per-task analyzer assertion (above) — each workstream removes an identifiable eager chunk.
- [ ] `swapTypeGuards.test.ts` (W2) — predicates match old `instanceof` across all 8 `SwapType` values.
- [ ] `tokenMeta.generated` drift test (W3a).
- [ ] Manual smoke of every swap type + deep-linked token pairs + wallet connect/disconnect/reconnect (W4).
- [ ] Final: real `npm run build`, entry-chunk gz materially below the W0/branch baseline; a swap completes end-to-end on the ESM webapp; `npm run typecheck` clean.

## Measurement target

Entry chunk should drop from ~1.79 MB gz toward the light-SDK path (tens of KB of SDK) + the app's own React/UI weight, with the chain runtimes, wallet adapters, and BTC signer all moved to post-paint async chunks. Exact target set from the branch baseline captured in the prerequisite step. CLS and the other classic-perf items (needed for a fully Passing CWV assessment) are Layer 3, deferred to `docs/perf-classic-frontend-design.md`.

## Risks

- Abstract-base `getType()` mapping (W2) — unit-tested against every enum value; the `IEscrowSelfInitSwap` set is the subtle one (see decision).
- `ConnectorBridge` state-lift loops (W4) — the hooks return fresh objects each render; memoize the `chains` map and lift via a single effect, as the current `WrappedChainsProvider` already does.
- Connect-during-load window + returning-user autoConnect a beat later (W4) — accepted; needs the error boundary + a pending-connect handoff.
- Publish coordination — the SDK dep stays on the git branch through development; flip to published semver only at merge. If Adam adds the barrel export, re-install the branch.

## Out of scope

The wallet localStorage-connected-flag (skip connectors entirely for disconnected users); node-polyfill trimming; any change to the SDK's `dist` (CJS); Layer 3 (CLS, route-split, landing mobile, dedup, cache verify).
