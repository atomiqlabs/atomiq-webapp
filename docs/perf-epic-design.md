# Web performance epic — master design

Date: 2026-07-13. Repos: `atomiq-webapp` (+ upstream `@atomiqlabs/*` packages). **This document consolidates and supersedes** `docs/perf-tier1-design.md` and `docs/perf-connector-deferral-design.md`; those remain as history but this is the source of truth.

Decisions folded in (Marci + Adam, 2026-07-13): keep `ChainsProvider`'s provider pattern and contain the lazy-loading inside it; **always-defer** connectors (no connected-flag this pass); render tokens from **build-time-generated static metadata**; replace `instanceof <SwapClass>` with **`ISwap.getType()`** so swap panels tree-shake and need **no** lazy-loading; make `@atomiqlabs/sdk` (+ `@atomiqlabs/btc-mempool`, `@atomiqlabs/messenger-nostr`) tree-shakeable by adding an **ESM build emitted to `dist-esm`** while `dist` stays CommonJS (so existing deep-importers of `dist/` are unaffected); Cloudflare cache rules already configured by the team.

## Goal

Get the ~1.19 MB of eager JS (SDK core + chain runtimes) off the app's first-paint path so **LCP** drops well under the 2.5 s bar — the harder, higher-leverage half of the failing Core Web Vitals — **without** regressing swaps/quoting/wallets and **without** breaking the SDK's CommonJS consumers (`atomiq-lp`, `atomiq-relay`, `server-base`, `atomiq-swaps-be`). The **CLS** half of the CWV failure, plus landing-mobile and the other classic front-end fixes, are split into a separate deferred design (`docs/perf-classic-frontend-design.md`); a fully Passing assessment needs both, but this epic is the bundle-weight lever.

## Baseline (measured 2026-07-13)

| | Landing Desktop | Landing Mobile | App Desktop | App Mobile |
|---|---|---|---|---|
| Performance | 99 | 76 | 47 | 31 |
| LCP | 0.8 s | 4.5 s | 2.8 s | 14.9 s |
| CLS | 0.021 | 0 | 0.55–0.67 | 1.02 |

App real-user CrUX (desktop): **Failed** — LCP 3.1 s, INP 114 ms (good), CLS 0.39. App ships 2,841 KiB, of which the initial JS chunk is ~1,842 KiB gzip and ~78% chain-stack. Full baseline + bundle treemap: `docs/perf-tier1-baseline.md`.

## Root cause (empirically validated by the 2026-07-13 spike)

The dominant problem is that **`@atomiqlabs/sdk` is a CommonJS barrel with no `sideEffects` flag**, so importing even a light helper (`isSCToken`, `SwapType`) that the swap card uses pulls the **entire ~539 KB SDK core** plus its deps. The spike proved it: bundling only the light token helpers against the SDK as-is = **318 KB gz**; against an **ESM + `sideEffects:false`** build of the *same source* (a one-line `tsconfig` change, **zero build errors**) = **97 KB gz**, with the SDK's own code dropping from **539 KB (49.5% of the bundle) → 2.8 KB (0.9%)** — a 99.5% cut. All swap wrappers, price providers, and storage classes tree-shook away.

The residual 97 KB is a **second barrel issue**: `@atomiqlabs/sdk`'s `src/index.ts` eagerly re-exports `MempoolApi` (from `@atomiqlabs/btc-mempool`, 144 KB) and `NostrMessenger` (from `@atomiqlabs/messenger-nostr`, ~110 KB), and those packages (plus `@atomiqlabs/base`) are also CJS with no `sideEffects`, so they cannot shake out. Making them ESM+`sideEffects:false` too brings the light-import floor to **tens of KB**.

Two secondary facts the spike/analysis established: (1) importing swap **classes** as runtime values (for `instanceof`) drags their real crypto deps (coinselect2, bip32/bip39, curves, bolt11) — a ~10% floor even under tree-shaking — but there are only **5** such sites, all in hooks, and `ISwap.getType()` replaces them so the classes become type-only (erased); (2) the current bundle carries **duplicate versions of `@noble`** and **`starknet` ×3**, pure dedup waste. `@noble` itself is fully tree-shakeable (`sideEffects:false`), so it is not a concern beyond deduping — the BTC path pulls only ~127 KB of it.

## Solution — two layers (Layer 3 deferred)

The fix is layered, and the ordering matters: **Layer 1 (SDK packaging) is the enabler; Layer 2 only pays off on top of it.** Without Layer 1, the app-side deferral leaves the swap card's `isSCToken` call dragging the whole barrel; without Layer 2, the SDK is tree-shakeable but the app still imports the heavy parts eagerly. The classic front-end perf work (CLS, route-splitting, landing mobile, dedup, cache verify) was originally Layer 3; it is now split into its own deferred design at `docs/perf-classic-frontend-design.md`.

### Layer 1 — SDK packaging (upstream `@atomiqlabs` repos): make the barrels tree-shakeable

Apply the same recipe to **`@atomiqlabs/sdk`, `@atomiqlabs/btc-mempool`, `@atomiqlabs/messenger-nostr`, and `@atomiqlabs/base`** (all four are CJS/non-`sideEffects` and in the residual chain; the light path won't fully shake to tens of KB until all four are done):

- Add a **second build to `dist-esm`** (ESM). Keep `dist` exactly as-is (CommonJS) so any consumer doing `require('@atomiqlabs/sdk/dist/x')` is unaffected. Concretely: a `tsconfig.esm.json` with `"module": "es2022"`, `"outDir": "./dist-esm"`; the `build` script runs the existing CJS `tsc` **and** the ESM one; a post-step writes `dist-esm/package.json` = `{"type":"module"}` so Node treats `dist-esm/*.js` as ESM (bundlers rely on the `exports`/`module` fields regardless). The spike confirmed the ESM compile is clean from just the `module` change — no interop fixes needed.
- `package.json`:
  ```jsonc
  {
    "main": "./dist/index.js",          // unchanged — CJS consumers land here
    "module": "./dist-esm/index.js",    // bundlers prefer this
    "sideEffects": false,               // unlocks tree-shaking
    "exports": {
      ".": { "types": "./dist/index.d.ts", "import": "./dist-esm/index.js", "require": "./dist/index.js" },
      "./package.json": "./package.json",
      "./dist/*": "./dist/*"            // keep existing deep CJS imports resolvable
    },
    "files": ["/dist", "/dist-esm", "/src", "/api"]
  }
  ```
- **`sideEffects: false` audit** (the one real risk): confirm no module runs meaningful code at import time (global registration, prototype patching, polyfill install). If any do, use an allowlist (`"sideEffects": ["./dist-esm/thatModule.js"]`). `@atomiqlabs/messenger-nostr`'s Nostr setup and `@atomiqlabs/btc-mempool` are the first to check.
- **Backwards compatibility:** the four in-house CJS consumers `require()` → resolve the `require`/`main` condition → get `dist/index.js`, byte-for-byte unchanged. Vite (webapp) resolves `import` → `dist-esm` → tree-shakes. No dual-package hazard here (webapp is all-ESM, servers all-CJS, nothing mixes formats in one process). Before shipping, grep the four consumers for deep `dist/` imports; the `"./dist/*"` export keeps them working.
- **Version + publish:** bump each package, publish, bump the webapp's dependency. All packages are in-house, so no external coordination.

### Layer 2 — App-side runtime decoupling (so first paint imports only light SDK)

- **`getType()` instead of `instanceof`** (5 sites: `hooks/fees/useSwapFees.ts:65,87,90,93`, `hooks/swaps/helpers/useCheckAdditionalGas.ts:23`). Replace `swap instanceof FromBTCSwap` with `swap.getType() === SwapType.FROM_BTC`, etc. The two abstract-base checks map to a **group** of `SwapType` values, not one: `instanceof IToBTCSwap` → `{TO_BTC, TO_BTCLN}`; `instanceof IEscrowSelfInitSwap` → the escrow-family set — use already existing `isIEscrowSelfInitSwapInit()` from the SDK package (add an export for it in index.ts and also add a typedoc comment to it as it is exported now!). After this, the swap **classes** are imported only as TypeScript types (erased at build), so they no longer pull their crypto weight onto the eager path — **and the swap panels need no lazy-loading.**
- **Generated static token metadata.** A `scripts/genTokens.ts` (Node/tsx) reads `Factory.Tokens` and emits `src/data/tokenMeta.generated.ts` (plain `{chainId, ticker, name, decimals, displayDecimals?, address, chain, lightning?}`, zero SDK imports). A tiny Vite plugin (`buildStart` hook) regenerates it on **both `npm start` and `npm run build`**. `utils/Tokens.ts` is refactored to source its display array from this metadata and to stop importing `SwapperFactory`; a drift test fails CI if the generated file diverges from `Factory.Tokens`. (Detail unchanged from the Tier 1 plan, Tasks 2–4.)
- **Lazy `Factory` in `SwapperProvider`.** Replace the top-level `import {Factory}` with `const {Factory} = await import('../utils/SwapperFactory')` inside `loadSwapper()`, so the chain-*initializer* packages (`@atomiqlabs/chain-solana/starknet/evm` → `@solana/web3.js`, `starknet`, `ethers`/`viem`) form a post-paint async chunk. (Tier 1 plan Task 5.)
- **Connector deferral inside `ChainsProvider` (always-defer, provider pattern kept).** `ChainsProvider` stays the shell that provides `ChainsContext`; after first paint it mounts a lazily-imported `ConnectorBridge` that runs **all** chain hooks — Solana, EVM, Starknet, **and Bitcoin + Lightning** — inside their wrappers (a null-rendering hook-runner), computes the full `Chain` map, and lifts it into the same context the app already reads (so the app never remounts). **Bitcoin/Lightning are deferred too** (Adam, 2026-07-20): `BitcoinWalletUtils` eagerly imports all 7 BTC wallet adapters, which statically pull `@scure/btc-signer` + the SDK's bitcoin-wallet classes (~0.5 MB+), so keeping them eager would anchor that weight on first paint. Moving them into the bridge is straightforward and also **removes the cross-chain seam** — the BTC↔SC wallet-name wiring becomes internal to the bridge instead of a shell→bridge handoff. Starknet's module-level `Controller`/`getStarknet` load with the bridge chunk. The connect-during-load window and the error boundary are as specified in `perf-connector-deferral-design.md` (folded here; its earlier "BTC/LN stay eager" note is superseded by this). With always-defer the connect flow is essentially unchanged — the whole connector layer is populated a beat after paint, before any user clicks Connect; first paint shows the swap card with no wallet yet (a state the UI already handles).

### Layer 3 — Classic performance — **deferred**

Moved to its own design: `docs/perf-classic-frontend-design.md` (CLS, route-splitting, landing mobile, starknet/`@noble` dedup, cache verify). These are independent of the SDK/bundle story and can be scheduled separately. Note: **CLS lives there**, so this epic (Layers 1–2) fixes LCP but a fully Passing CWV assessment also needs the CLS work from the deferred doc.

## Workstreams & sequencing

- **W0 — Baseline & analyzer.** Done (`8bf2ca3`, branch `perf/tier1`).
- **W1 — SDK packaging (Layer 1).** ESM+`sideEffects` via `dist-esm` for `sdk` + `btc-mempool` + `messenger-nostr` (+ `base`), `sideEffects` audit, exports, deep-import grep, publish, bump webapp. **The enabler — do first.**
- **W2 — `getType()` refactor** (5 sites). Small; unblocks panels-without-lazy.
- **W3 — Generated token metadata + lazy `Factory`** (Tier 1 Tasks 2–5).
- **W4 — Connector bridge** (always-defer, inside `ChainsProvider`).
- **Layer 3 (classic perf) — deferred** to `docs/perf-classic-frontend-design.md` (CLS, route-split, landing mobile, dedup, cache verify). Not sequenced here.

The LCP win only fully lands once **W1 + W2 + W3 + W4** are all in: SDK tree-shakeable (W1) + swap classes type-only (W2) + tokens from metadata + Factory lazy (W3) + connectors deferred (W4) ⇒ first paint pulls only the light SDK helpers (~tens of KB) instead of ~1.19 MB.

## Testing

- **Layer 1:** after each package's ESM build, typecheck + build the four CJS consumers and the webapp; smoke a swap on one CJS server and on the ESM webapp; assert (via the webapp bundle analyzer) that the light-import SDK footprint collapses vs the W0 baseline.
- **Layer 2:** drift test for `tokenMeta.generated`; unit test that the swap-type predicates match the old `instanceof` behavior for each `SwapType`; build assertion that a separate chain-runtime async chunk exists and the entry chunk shrinks; manual smoke of every swap type + deep-linked pairs + wallet connect/disconnect/reconnect (returning users reconnect a beat later).
- **Layer 3:** covered in the deferred `docs/perf-classic-frontend-design.md`.

## Risks

- **`sideEffects:false` correctness** (Layer 1): a wrong call silently drops code. Audit each package; allowlist genuine side-effect modules (Nostr setup is the prime suspect).
- **Abstract-base `getType()` mapping** (Layer 2): `IToBTCSwap`/`IEscrowSelfInitSwap` map to *sets* of `SwapType`; the local predicates must enumerate them exactly. Unit-test against each enum value.
- **Publish/version coordination:** four in-house packages get bumped; lockfiles across five repos must update together.
- **Connector autoConnect a beat later** for returning users — accepted.

## Out of scope

The wallet localStorage-connected-flag (skip loading connectors entirely for disconnected users); node-polyfill trimming; any change to `dist` (CJS) beyond leaving it untouched.
