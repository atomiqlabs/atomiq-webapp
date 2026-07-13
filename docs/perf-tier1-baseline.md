# Web performance — Tier 1 baseline (W0)

Date: 2026-07-13. Scope: `atomiq-webapp`, serving both `app.atomiq.exchange` (the SPA) and `www.atomiq.exchange` (the statically prerendered SEO landing pages built by `scripts/build-seo.tsx`). Both sit behind a Cloudflare proxy.

This doc is the W0 deliverable: it wires an opt-in bundle analyzer (`npm run analyze`, normal builds are unaffected) and records what currently fills the JS bundle, plus the four-combo Lighthouse baseline the rest of the Tier 1 plan is measured against. It contains no production runtime changes.

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

The app bundles one monolithic chunk with no code splitting: `SwapperFactory.ts` constructs a module-level singleton that statically imports all six chain initializers (Solana, Starknet, and four EVM L2s), and that chain runtime is pulled onto the critical path both directly (via `SwapperProvider`) and transitively through `utils/Tokens.ts`, which is imported by ~10 UI files. `App.tsx` statically imports every route, so secondary pages and `qr-scanner` also ship in the initial chunk. The app's CLS (0.55-1.0 lab, 0.39 field) is layout shift as content and fonts settle. The landing page's mobile LCP is driven by a render-blocking link to the entire app CSS bundle plus unmanaged font loading.

## Bundle analysis (Step 4)

### How this was captured

- Added `rollup-plugin-visualizer` (^7.0.1) as a dev dependency and wired it opt-in in `vite.config.ts`: it only activates when `ANALYZE=1` (via `npm run analyze`), so `npm run build` / `npm start` are unchanged.
- Two visualizer outputs are emitted: `stats.html` (treemap, for interactive viewing) and `stats.json` (`template: 'raw-data'`, machine-readable — added beyond the brief's Step 2 snippet so bundle composition could be confirmed programmatically without opening a browser). Both write to the repo root (not `build/`) and are git-ignored (`.gitignore` updated); they are build artifacts, not committed.
- Ran `npm run analyze` (`ANALYZE=1 vite build`) once; it succeeded on the first attempt, no `npm install --force` retry needed. Build time ~41s.

### Per-chunk output (as printed by `vite build`, gzip is Vite's own post-minify measurement)

| Chunk | Raw | Gzip |
|---|---|---|
| `assets/index-Cx2dLZ_e.js` (main entry chunk) | 6,594.37 kB | 1,842.13 kB |
| `assets/core-DoFMxDHB.js` | 611.32 kB | 180.03 kB |
| `assets/index-2DuhItLx.js` | 487.85 kB | 148.35 kB |
| `assets/index-DOpoFTYK.js` | 209.92 kB | 65.31 kB |
| `assets/solanaEmbed.esm-vN6FQHc2.js` | 183.54 kB | 60.94 kB |
| `assets/w3m-modal-SHhucy3D.js` | 165.86 kB | 34.65 kB |
| `assets/basic-CeLWcR6m.js` | 106.34 kB | 27.87 kB |
| `assets/index-B_xfixBq.js` | 97.24 kB | 26.73 kB |
| `assets/qr-scanner-worker.min-D85Z9gVD.js` | 43.95 kB | 10.46 kB |
| `assets/TransportWebHID-CmTH5lL6.js` | 35.52 kB | 12.04 kB |
| `assets/index-hs6ArL9t.js` | 34.24 kB | 7.80 kB |
| `assets/index-BJwxD0Mw.js` | 17.57 kB | 5.49 kB |
| `assets/property-CnFDNXw5.js` | 17.20 kB | 6.41 kB |
| `assets/PhSealCheck-*.js` | 12.10 kB | 4.02 kB |
| `assets/features-*.js` | 5.87 kB | 2.31 kB |
| ~55 more `Ph*.js` icon chunks | 1.9-5.7 kB each | ~1-2 kB each |

Vite's own warning: "Some chunks are larger than 500 kB after minification." `ls -la build/assets/*.js` confirms these on-disk sizes (main chunk is 6,594,365 bytes = 6,594.37 KiB, matches exactly). Total JS shipped ≈ 8.45 MB raw / ~2.4 MB gzip across all chunks combined, with the single main chunk alone accounting for ~78% of that.

**Note on drift from the metrics-table number above:** the metrics table (captured via PageSpeed against the live `app.atomiq.exchange` deploy) records the main chunk at 1,571 KiB gzip, vs. 1,842.13 KiB gzip measured here from a fresh local `npm run analyze` build on `perf/tier1` (based on `develop`). The ~17% difference is most likely explained by the local branch/build not being bit-identical to whatever commit is currently live in production (dependency patch drift, `@atomiqlabs/*` package versions, or minifier settings) rather than a regression introduced by this task, which touches no runtime code. Worth reconciling before/after comparisons in later workstreams against a build from the same commit that was Lighthouse-tested.

### Top packages by size (from `stats.json`)

`rollup-plugin-visualizer`'s per-module `renderedLength`/`gzipLength` are measured **before** Vite's minification pass (Terser/esbuild), so they run roughly 2x the final on-disk bytes and per-module gzip figures do not sum linearly (gzip doesn't compose additively across concatenated modules). They are used here only for **relative ranking** of which packages dominate, not as an absolute byte count — the authoritative absolute sizes are the per-chunk table above.

Top 15 packages by raw (`renderedLength`) size, restricted to modules that land in the main chunk (`assets/index-Cx2dLZ_e.js`), grouped by `node_modules/<package>`:

| # | Package | Raw size (pre-minify) | Module count |
|---|---|---|---|
| 1 | `@noble/curves` | 1,506.0 kB | 143 |
| 2 | `ethers` | 1,438.3 kB | 294 |
| 3 | `@atomiqlabs/sdk` | 1,166.5 kB | 221 |
| 4 | `starknet` | 1,145.5 kB | 3 |
| 5 | `bn.js` | 639.5 kB | 15 |
| 6 | `@noble/hashes` | 614.0 kB | 227 |
| 7 | `@solana/spl-token` | 456.0 kB | 250 |
| 8 | `@atomiqlabs/chain-evm` | 423.3 kB | 119 |
| 9 | `@atomiqlabs/chain-starknet` | 393.9 kB | 97 |
| 10 | `@scure/btc-signer` | 365.6 kB | 34 |
| 11 | `pako` | 315.9 kB | 25 |
| 12 | `@atomiqlabs/chain-solana` | 315.4 kB | 74 |
| 13 | `@solana/web3.js` | 278.6 kB | 2 |
| 14 | `@cartridge/controller` | 196.5 kB | 2 |
| 15 | `readable-stream` | 170.5 kB | 37 |

Top 15 together account for ~69% of the main chunk's pre-minify bytes; 204 distinct `node_modules` packages contribute to the main chunk in total.

Grouped by the families the design doc calls out:

| Group | Combined raw size (main chunk) |
|---|---|
| `@atomiqlabs/*` (sdk + chain-solana + chain-starknet + chain-evm) | 2,441.3 kB |
| `@noble/*` (crypto primitives, transitive dep of the above) | 2,226.9 kB |
| `starknet` + `@starknet-io/get-starknet*` + `@cartridge/controller` | 1,515.6 kB |
| `ethers` | 1,438.3 kB |
| `@solana/*` | 1,221.0 kB |
| `wagmi` / `@wagmi/*` / `@reown/*` / `@walletconnect/*` (EVM wallet-connect stack) | 84.7 kB (mostly lands in the secondary `core-*`/`w3m-modal-*`/`basic-*` chunks, not the main chunk) |
| `viem` | 43.0 kB in the main chunk (bulk of `viem`'s 441 kB total footprint is in the secondary wallet-connector chunks above, not the main chunk) |

This confirms the design doc's premise: the main chunk is dominated by `@atomiqlabs/chain-*` + their transitive crypto deps (`@noble/*`, `bn.js`, `@scure/btc-signer`), `starknet`, `ethers`, and `@solana/*` — exactly the packages W1 (lazy SDK loading) targets moving off the critical path.

**Bonus finding, worth a follow-up ticket (not in scope for this task):** `starknet` ships as three separate bundled copies — `starknet/dist/index.js` (top-level dep), `starknet/dist/index.mjs` (same package, ESM entry pulled in by a different import path), and `@cartridge/controller/node_modules/starknet/dist/index.mjs` (a nested, independently-resolved copy vendored by `@cartridge/controller`). Combined these are ~1.15 MB raw / ~217 kB gzip-equivalent. Deduping or aligning `@cartridge/controller`'s `starknet` version with the top-level one (via `overrides` in `package.json`, similar to the existing `@walletconnect/logger` → `pino` override) could shave real bytes without any code-splitting work. Flagging for Marci to decide whether this becomes its own workstream.

## LCP element / CLS nodes

LCP element / CLS nodes: TODO — capture via a fresh Incognito Lighthouse run (Marci).

## Files changed in this task

- `vite.config.ts` — opt-in `rollup-plugin-visualizer` (only when `ANALYZE=1`), emitting `stats.html` (treemap) and `stats.json` (raw-data).
- `package.json` — added `rollup-plugin-visualizer` devDependency and an `"analyze": "ANALYZE=1 vite build"` script.
- `.gitignore` — added `/stats.html` and `/stats.json` (analyzer output artifacts land at repo root, not `build/`).
- This file.

No production runtime code was touched.
