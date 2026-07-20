# Web performance epic — master design

Date: 2026-07-13. Repos: `atomiq-webapp` (+ upstream `@atomiqlabs/*` packages). **This document consolidates and supersedes** `docs/perf-tier1-design.md` and `docs/perf-connector-deferral-design.md`; those remain as history but this is the source of truth.

Decisions folded in (Marci + Adam, 2026-07-13): keep `ChainsProvider`'s provider pattern and contain the lazy-loading inside it; **always-defer** connectors (no connected-flag this pass); render tokens from **build-time-generated static metadata**; replace `instanceof <SwapClass>` with **`ISwap.getType()`** so swap panels tree-shake and need **no** lazy-loading; make `@atomiqlabs/sdk` (+ `@atomiqlabs/btc-mempool`, `@atomiqlabs/messenger-nostr`) tree-shakeable by adding an **ESM build emitted to `dist-esm`** while `dist` stays CommonJS (so existing deep-importers of `dist/` are unaffected); Cloudflare cache rules already configured by the team.

## Goal

Move `app.atomiq.exchange` real-user Core Web Vitals from **Failed → Passing** (LCP ≤ 2.5 s, CLS ≤ 0.1; INP already good) and lift landing-mobile Performance from 76 into the 90s, by getting the ~1.19 MB of eager JS (SDK core + chain runtimes) off the first-paint path and eliminating layout shift — **without** regressing swaps/quoting/wallets and **without** breaking the SDK's CommonJS consumers (`atomiq-lp`, `atomiq-relay`, `server-base`, `atomiq-swaps-be`).

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

## Solution — three layers

The fix is layered, and the ordering matters: **Layer 1 (SDK packaging) is the enabler; Layer 2 only pays off on top of it.** Without Layer 1, the app-side deferral leaves the swap card's `isSCToken` call dragging the whole barrel; without Layer 2, the SDK is tree-shakeable but the app still imports the heavy parts eagerly.

### Layer 1 — SDK packaging (upstream `@atomiqlabs` repos): make the barrels tree-shakeable

Apply the same recipe to **`@atomiqlabs/sdk`, `@atomiqlabs/btc-mempool`, `@atomiqlabs/messenger-nostr`** (and `@atomiqlabs/base` — see risk note; it is in the residual chain and the light path won't fully shake without it):

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

- **`getType()` instead of `instanceof`** (5 sites: `hooks/fees/useSwapFees.ts:65,87,90,93`, `hooks/swaps/helpers/useCheckAdditionalGas.ts:23`). Replace `swap instanceof FromBTCSwap` with `swap.getType() === SwapType.FROM_BTC`, etc. The two abstract-base checks map to a **group** of `SwapType` values, not one: `instanceof IToBTCSwap` → `{TO_BTC, TO_BTCLN}`; `instanceof IEscrowSelfInitSwap` → the escrow-family set — introduce a small local predicate (`isToBtc(type)`, `isEscrowSelfInit(type)`) using the `SwapType` enum. After this, the swap **classes** are imported only as TypeScript types (erased at build), so they no longer pull their crypto weight onto the eager path — **and the swap panels need no lazy-loading.**
- **Generated static token metadata.** A `scripts/genTokens.ts` (Node/tsx) reads `Factory.Tokens` and emits `src/data/tokenMeta.generated.ts` (plain `{chainId, ticker, name, decimals, displayDecimals?, address, chain, lightning?}`, zero SDK imports). A tiny Vite plugin (`buildStart` hook) regenerates it on **both `npm start` and `npm run build`**. `utils/Tokens.ts` is refactored to source its display array from this metadata and to stop importing `SwapperFactory`; a drift test fails CI if the generated file diverges from `Factory.Tokens`. (Detail unchanged from the Tier 1 plan, Tasks 2–4.)
- **Lazy `Factory` in `SwapperProvider`.** Replace the top-level `import {Factory}` with `const {Factory} = await import('../utils/SwapperFactory')` inside `loadSwapper()`, so the chain-*initializer* packages (`@atomiqlabs/chain-solana/starknet/evm` → `@solana/web3.js`, `starknet`, `ethers`/`viem`) form a post-paint async chunk. (Tier 1 plan Task 5.)
- **Connector deferral inside `ChainsProvider` (always-defer, provider pattern kept).** `ChainsProvider` stays the shell that provides `ChainsContext`; after first paint it mounts a lazily-imported `ConnectorBridge` that wraps `SolanaWalletWrapper`/`EVMWalletWrapper` around a null-rendering hook-runner, computes the smart-chain `Chain` map, and lifts it into the same context the app already reads (so the app never remounts). Bitcoin/Lightning stay eager (light) and are fed the SC wallet names from the bridge. Starknet's module-level `Controller`/`getStarknet` load with the bridge chunk. The three shapes, the connect-during-load window, the bitcoin seam, and the error boundary are as specified in `perf-connector-deferral-design.md` (now folded here). With always-defer the connect flow is essentially unchanged — the bridge is populated a beat after paint, before any user clicks Connect.

### Layer 3 — Classic performance (independent of the SDK story)

- **App CLS < 0.1.** `font-display: swap` on all `@font-face` (`assets/fonts/{WorkSans,scandia}/**/style.css`); stabilize the conditional loading/error overlay in `App.tsx:29-43` so it doesn't push content; reserve dimensions for the swap-card region and any dimensionless images. The static-token render (Layer 2) already removes the biggest shift. Exact shifting nodes to be confirmed by a fresh Incognito Lighthouse trace (the manual W0 step).
- **App route-splitting.** `React.lazy` the non-index routes (`history`, `gas`, `faq`, `about`, `explorer`, `scan/*`, `NotFound`) under `<Suspense>`, keeping `SwapNew` eager. Pulls `qr-scanner` off the landing path. (Tier 1 plan Task 6.)
- **Landing mobile.** In `scripts/build-seo.tsx`'s `htmlDocument()`, stop render-blocking on the full app CSS (inline critical CSS or load it non-blocking); add font `preload` + `font-display: swap`; give hero images explicit dimensions and serve WebP/AVIF responsive sizes; lazy-load below-fold images. **Note:** the `www` marketing homepage is a *separate build folder* in the repo (not the tracked `src/` — exact path pending from Marci); the `/swap/*` SEO pages are the in-`src/` ones. (Tier 1 plan Task 9.)
- **Dedup.** Collapse the triple-bundled `starknet` and the duplicate `@noble` versions (Vite `resolve.dedupe` / a single resolved version). Pure byte deletion, independent of everything else.
- **Cache headers — verify only.** Confirm hashed assets return `max-age … immutable` and HTML is short/no-cache (team already configured the Cloudflare rules).

## Workstreams & sequencing

- **W0 — Baseline & analyzer.** Done (`8bf2ca3`, branch `perf/tier1`).
- **W1 — SDK packaging (Layer 1).** ESM+`sideEffects` via `dist-esm` for `sdk` + `btc-mempool` + `messenger-nostr` (+ `base`), `sideEffects` audit, exports, deep-import grep, publish, bump webapp. **The enabler — do first.**
- **W2 — `getType()` refactor** (5 sites). Small; unblocks panels-without-lazy.
- **W3 — Generated token metadata + lazy `Factory`** (Tier 1 Tasks 2–5).
- **W4 — Connector bridge** (always-defer, inside `ChainsProvider`).
- **W5 — CLS**, **W6 — route-split**, **W7 — landing mobile**, **W8 — dedup**, **W9 — cache verify**. Layer 3, largely independent; W5/W6/W8/W9 can run anytime; W7 waits on the marketing-folder path.

The LCP win only fully lands once **W1 + W2 + W3 + W4** are all in: SDK tree-shakeable (W1) + swap classes type-only (W2) + tokens from metadata + Factory lazy (W3) + connectors deferred (W4) ⇒ first paint pulls only the light SDK helpers (~tens of KB) instead of ~1.19 MB.

## Testing

- **Layer 1:** after each package's ESM build, typecheck + build the four CJS consumers and the webapp; smoke a swap on one CJS server and on the ESM webapp; assert (via the webapp bundle analyzer) that the light-import SDK footprint collapses vs the W0 baseline.
- **Layer 2:** drift test for `tokenMeta.generated`; unit test that the swap-type predicates match the old `instanceof` behavior for each `SwapType`; build assertion that a separate chain-runtime async chunk exists and the entry chunk shrinks; manual smoke of every swap type + deep-linked pairs + wallet connect/disconnect/reconnect (returning users reconnect a beat later).
- **Layer 3:** Lighthouse CLS < 0.1; per-route chunks present; landing-mobile render-block ≈ 0; `curl -I` cache headers.

## Risks

- **`sideEffects:false` correctness** (Layer 1): a wrong call silently drops code. Audit each package; allowlist genuine side-effect modules (Nostr setup is the prime suspect).
- **`@atomiqlabs/base` scope:** Marci named `btc-mempool` + `messenger-nostr`; `base` is also in the residual chain, so the light path won't fully reach "tens of KB" until `base` gets the same treatment. Same recipe, smaller package — recommend including it; flagged for Marci's call.
- **Abstract-base `getType()` mapping** (Layer 2): `IToBTCSwap`/`IEscrowSelfInitSwap` map to *sets* of `SwapType`; the local predicates must enumerate them exactly. Unit-test against each enum value.
- **Publish/version coordination:** four in-house packages get bumped; lockfiles across five repos must update together.
- **Connector autoConnect a beat later** for returning users — accepted.

## Out of scope

The wallet localStorage-connected-flag (skip loading connectors entirely for disconnected users); node-polyfill trimming; any change to `dist` (CJS) beyond leaving it untouched.
