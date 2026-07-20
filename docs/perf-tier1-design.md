# Web performance — Tier 1 design

> **Superseded (2026-07-13) by `docs/perf-epic-design.md`**, which consolidates this + the connector-deferral design + the SDK-tree-shaking finding into one master design. Kept as history.

Date: 2026-07-13. Scope: `atomiq-webapp` (serves both `app.atomiq.exchange` — the SPA — and `www.atomiq.exchange` — the statically prerendered SEO landing pages built by `scripts/build-seo.tsx`). Both sit behind a Cloudflare proxy.

## Goal

Lift the loading metrics that Google's Core Web Vitals actually rank on, focusing on the two failing surfaces: the app (mobile Performance 31, desktop 47, real-user CWV assessment **Failed**) and the landing page on mobile (Performance 76). The landing page on desktop (99) is already good and is left alone. Tier 2 (wallet-connector deferral behind a localStorage-connected flag) and node-polyfill trimming are explicitly out of scope for this pass.

## Baseline (PageSpeed / Lighthouse, 2026-07-13, Lighthouse 13.x)

| | Landing Desktop | Landing Mobile | App Desktop | App Mobile |
|---|---|---|---|---|
| Performance | 99 | 76 | 47 | 31 |
| FCP | 0.6s | 3.0s | 1.9s | 10.9s |
| LCP | 0.8s | 4.5s | 2.8s | 14.9s |
| TBT | 0ms | 0ms | 150ms | 60ms |
| CLS | 0.021 | 0 | 0.666 | 1.021 |
| Speed Index | 0.9s | 4.7s | 2.1s | 10.9s |

App real-user field data (CrUX, desktop): Core Web Vitals **Failed** — LCP 3.1s (needs improvement), INP 114ms (good), CLS 0.39 (poor), FCP 3.4s, TTFB 1s. Landing and app-mobile have no CrUX sample yet.

Weight: the app ships 2,841 KiB total, of which 1,884 KiB is script dominated by a single `assets/index-*.js` chunk at 1,571 KiB, with ~1,223 KiB reported unused on first load. The landing page ships 1,265 KiB, almost entirely images (799 KiB) and fonts (395 KiB), and render-blocks on the full app CSS bundle.

## Root causes

The app bundles one monolithic chunk with no code splitting: `SwapperFactory.ts` constructs a module-level singleton that statically imports all six chain initializers (Solana, Starknet, and four EVM L2s), and that chain runtime is pulled onto the critical path both directly (via `SwapperProvider`) and transitively through `utils/Tokens.ts`, which is imported by ~10 UI files. `App.tsx` statically imports every route, so secondary pages and `qr-scanner` also ship in the initial chunk. The app's CLS (0.55–1.0 lab, 0.39 field) is layout shift as content and fonts settle. The landing page's mobile LCP is driven by a render-blocking link to the entire app CSS bundle plus unmanaged font loading.

## Success criteria

- App mobile Performance ≥ 70; app desktop Performance ≥ 85.
- App lab CLS < 0.1.
- App real-user assessment flips to Passing once LCP ≤ 2.5s and CLS ≤ 0.1 hold at p75 (INP is already good). Field data lags ~28 days, so this is verified on the CrUX window after deploy, not immediately.
- Landing mobile Performance ≥ 90; render-blocking time reduced to near zero. Landing desktop stays ~99.
- No functional regression: swaps, quoting, wallet connect, deep-linked `/?tokenIn=&tokenOut=` pairs, and all routes work as before.

## Workstreams

### W0 — Baseline and measurement (brackets the epic; no production code)

Add `rollup-plugin-visualizer` as a dev dependency to capture per-package chunk sizes, and run one clean incognito Lighthouse pass on the app to record the exact LCP element and the specific CLS-contributing DOM nodes. Record before-numbers for all four site × form-factor combinations. This confirms the swap card is the LCP element (which is the premise of the token decision below) and pins the real CLS sources so W2 fixes those rather than guessed ones. Deliverable: a before/after metrics table kept in this repo.

### W1 — App: lazy SDK + build-time-generated token metadata (largest LCP lever, highest risk)

Decouple token *display data* from the chain *runtime* so the swap card can paint before the SDK loads.

- New generator `scripts/genTokens.ts` (run via `tsx`) imports `Factory.Tokens` and emits `src/data/tokenMeta.generated.ts` — plain data only (`ticker`, `name`, `decimals`, `chainId`, `address`) with zero SDK imports. Token icons already live as static data in `TokenIcons` (`utils/Tokens.ts`) and stay there.
- A small Vite plugin runs the generator on the `buildStart` hook so it executes automatically for both `npm start` (dev) and `npm run build`. The generated file is committed so typecheck and CI run without a pre-step; the plugin keeps it fresh.
- Refactor `utils/Tokens.ts` so `smartChainTokenArray`, `supportedSmartChainTokenIdentifiers`, and the display helpers source from `tokenMeta.generated` and no longer import from `SwapperFactory` at module top. SDK-backed logic (`fromTokenIdentifier` via `TokenResolver`, and real-swap `SCToken` operations) moves behind the lazily-loaded swapper.
- `providers/SwapperProvider.tsx`: replace the top-level `import {Factory}` with `const {Factory} = await import('../utils/SwapperFactory')` inside `loadSwapper()`. Rollup then splits all `@atomiqlabs/chain-*` packages into an async chunk loaded after first paint.
- Re-route the other static `SwapperFactory` importers (`adapters/transactionAdapters.ts`, `hooks/pages/useSwapPage.ts`, `seo/tokens.ts`, `pages/quickscan/QuickScanExecute.tsx`) to use generated metadata for display and the lazy swapper for logic, so none of them re-anchor the runtime onto the critical path.
- Data flow: first paint renders the swap card and the (possibly deep-linked) token pair from `tokenMeta.generated`, so LCP fires early; the SDK chunk arrives a beat later and activates quoting and swap construction, covered by the existing `swapperLoading` state.
- Testing: a drift test regenerates `tokenMeta.generated` and diffs it against `Factory.Tokens`, failing CI if they diverge; a build assertion that the main chunk shrinks and a separate chain runtime chunk exists; typecheck; a smoke test of a deep-linked pair.

### W2 — App: CLS fixes (cheap; half of the failing CWV)

Fix the specific sources W0 identifies. Expected set: the swap card reflowing as content arrives (largely removed by W1 rendering tokens synchronously; reserve stable dimensions for any remaining async regions); web-font reflow (add `font-display: swap` and a fallback `size-adjust` so swapping the font does not shift layout); the conditional loading/error overlay in `App.tsx` (currently rendered inline around lines 29–43) stabilized so it does not push page content; and explicit `width`/`height` on any images lacking them. Target: lab CLS < 0.1.

### W3 — App: route-level code splitting (free win)

In `App.tsx`, convert the non-index routes (`history`, `gas`, `faq`, `about`, `explorer`, the `scan` subtree, and `NotFound`) to `React.lazy` under a `<Suspense>` boundary, keeping the index route `SwapNew` eager. This pulls `qr-scanner` (used only under `/scan`) and all secondary pages out of the initial chunk. Testing: per-route chunks appear in the build output; navigation smoke test across routes.

### W4 — Landing mobile: remove render-blocking, fix fonts and images

In `scripts/build-seo.tsx`'s `htmlDocument()`, stop render-blocking on the whole app CSS bundle: inline a small critical CSS for the static landing markup and load the full stylesheet non-blocking (`preload` then swap to `stylesheet`). Add a `preload` for the above-the-fold font with `font-display: swap`, and subset the font if practical. Give the hero images explicit dimensions (also helps CLS), serve WebP/AVIF at responsive sizes (the 799 KiB of images is the bulk of mobile weight), and lazy-load below-the-fold images. Target: mobile render-blocking near zero, landing mobile Performance ≥ 90.

### W5 — Cache-Control headers (done externally; verify only)

The long-lived immutable caching of hashed static assets is being handled by Cloudflare cache rules, already configured by the team. This workstream reduces to verification: confirm that a hashed asset (`assets/*.js`, `*.css`, fonts) responds with a long `max-age` / `immutable`, and that HTML responds with a short or no-cache policy.

## Sequencing

W0 first. Then the cheap, low-risk items early: verify W5, do W3 (route splitting) and W2 (CLS). Then W1, the largest and highest-risk change, which lands together with the remaining W2 work since rendering tokens synchronously removes the biggest layout shift. W4 (landing) last, independent of the app work. Each workstream is a separate, independently reviewable change.

## Risks

W1 is the main risk: it touches the token data flow across ~10 files and the swapper bootstrap. Mitigations: land it as its own change behind the W0 measurement, keep the generated-vs-SDK drift test green, and verify deep-linked pairs and every swap type manually before merge. If the visualizer in W0 shows the token metadata is already tree-shakeable away from the runtime, W1 simplifies to just the `SwapperProvider` dynamic import; the design does not depend on that being true.
