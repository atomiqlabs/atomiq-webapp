# Web performance Tier 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the app's chain SDK off the first-paint path and stabilize layout so the app's Core Web Vitals pass, and prepare the landing-page fix, without deferring any wallet connector behind user action.

**Architecture:** Split the monolithic bundle three ways — a build-time-generated static token-metadata module lets the swap card render before the SDK loads; `SwapperFactory` is dynamically imported so the chain runtimes form a post-paint async chunk; non-index routes become `React.lazy` chunks. CLS is fixed by `font-display`, a stabilized loading overlay, and explicit image dimensions.

**Tech Stack:** Vite, React, TypeScript, `@atomiqlabs/sdk`, vitest, `tsx`, `rollup-plugin-visualizer`.

## Global Constraints

- Tests run with `npm test` (vitest); typecheck with `npm run typecheck` (`tsc --noEmit`); format with `npm run format` (prettier). Run typecheck before every commit.
- Commit message format: `<area>: <imperative what>` with body bullets. Never add an AI co-author or attribution trailer.
- Simplicity mandate: each change touches as little code as possible; never delete commented-out code.
- Must not regress: swaps, quoting, wallet connect, deep-linked `/?tokenIn=&tokenOut=` pairs, and every route (`/`, `/scan`, `/scan/2`, `/history`, `/gas`, `/faq`, `/about`, `/explorer`).
- The generated token metadata file is committed to git and must stay in sync with the SDK (a drift test enforces this).
- Do not implement the Tier 2 wallet-connector deferral or node-polyfill trimming in this plan.

---

### Task 1: Bundle analysis + baseline capture (W0)

**Files:**
- Modify: `vite.config.ts` (add an opt-in visualizer plugin)
- Modify: `package.json` (devDependency + an `analyze` script)
- Create: `docs/perf-tier1-baseline.md`

**Interfaces:**
- Produces: a committed `docs/perf-tier1-baseline.md` with per-chunk sizes and the before-metrics table; the visualizer is opt-in (`npm run analyze`) so normal builds are unchanged.

- [ ] **Step 1: Install the analyzer (dev only)**

Run: `npm install --save-dev --force rollup-plugin-visualizer`

- [ ] **Step 2: Wire it opt-in in `vite.config.ts`**

Add the import at the top and include the plugin only when `process.env.ANALYZE` is set, so it never affects normal `build`/`start`:

```ts
import { visualizer } from 'rollup-plugin-visualizer';
// ...inside plugins: [ ... ]
...(process.env.ANALYZE ? [visualizer({ filename: 'stats.html', template: 'treemap', gzipSize: true, brotliSize: true })] : []),
```

- [ ] **Step 3: Add the script**

In `package.json` scripts add: `"analyze": "ANALYZE=1 vite build"`

- [ ] **Step 4: Run it and open the treemap**

Run: `npm run analyze` then open `stats.html`. Expected: a single large chunk dominated by `@atomiqlabs/chain-*`, `@solana/*`, `starknet`, `ethers`/`viem`. Record the top ~15 packages by gzipped size.

- [ ] **Step 5: Capture the LCP element and CLS nodes (MANUAL — not for the subagent)**

The DevTools JSON exports already provided do not carry node-level data (only an aggregate 0.54 layout-shift), so this needs a fresh run. In Chrome Incognito (extensions disabled), run Lighthouse on `https://app.atomiq.exchange/` and note the exact node under "Largest Contentful Paint element" and every node under "Avoid large layout shifts". This step primarily informs Task 7 (CLS) and is not required to finish the bundle-analysis deliverable; Marci runs it, or it is captured later via a PerformanceObserver script in the browser. The automated subagent skips this step and leaves a placeholder line in the baseline doc for it.

- [ ] **Step 6: Write and commit the baseline**

Create `docs/perf-tier1-baseline.md` with: the four-combo metrics table from the spec, the top packages by size from Step 4, and the LCP element + CLS nodes from Step 5.

```bash
git add vite.config.ts package.json package-lock.json docs/perf-tier1-baseline.md
git commit -m "perf: add opt-in bundle analyzer and record Tier 1 baseline"
```

---

### Task 2: Token-metadata generator + drift test (W1.1)

**Files:**
- Create: `scripts/genTokens.ts`
- Create: `src/data/tokenMeta.generated.ts` (generated, committed)
- Create: `src/data/__tests__/tokenMeta.drift.test.ts`

**Interfaces:**
- Produces: `tokenMeta` — a `Record<chainId, Record<ticker, TokenMeta>>` where `TokenMeta = { chainId: string; ticker: string; name: string; decimals: number; displayDecimals?: number; address: string; chain: 'SC' | 'BTC'; lightning?: boolean }`. Consumed by Task 4.

- [ ] **Step 1: Write the generator**

Create `scripts/genTokens.ts`. It imports the SDK-backed `Factory` (heavy imports are fine here — this runs in Node at build time, not in the browser bundle) and serializes only the data fields of `Token` (from `node_modules/@atomiqlabs/sdk/dist/types/Token.d.ts`), dropping the `equals`/`toString` functions:

```ts
import * as fs from 'fs';
import * as path from 'path';
import { Factory } from '../src/utils/SwapperFactory';

type TokenMeta = {
  chainId: string; ticker: string; name: string; decimals: number;
  displayDecimals?: number; address: string; chain: 'SC' | 'BTC'; lightning?: boolean;
};

function toMeta(t: any): TokenMeta {
  const m: TokenMeta = {
    chainId: t.chainId, ticker: t.ticker, name: t.name,
    decimals: t.decimals, address: t.address, chain: t.chain,
  };
  if (t.displayDecimals !== undefined) m.displayDecimals = t.displayDecimals;
  if (t.lightning !== undefined) m.lightning = t.lightning;
  return m;
}

function main() {
  const out: Record<string, Record<string, TokenMeta>> = {};
  for (const chainId of Object.keys(Factory.Tokens as any)) {
    const chainTokens = (Factory.Tokens as any)[chainId];
    out[chainId] = {};
    for (const ticker of Object.keys(chainTokens)) out[chainId][ticker] = toMeta(chainTokens[ticker]);
  }
  const banner = '// AUTO-GENERATED by scripts/genTokens.ts — do not edit by hand.\n';
  const body = `export const tokenMeta = ${JSON.stringify(out, null, 2)} as const;\n`;
  fs.writeFileSync(path.resolve('src/data/tokenMeta.generated.ts'), banner + body);
  console.log('Wrote src/data/tokenMeta.generated.ts');
}
main();
```

- [ ] **Step 2: Generate the file**

Run: `npx tsx scripts/genTokens.ts`
Expected: `Wrote src/data/tokenMeta.generated.ts`, and the new file contains `SOLANA`, `STARKNET`, `CITREA`, `BOTANIX`, `ALPEN`, `GOAT`, and `BITCOIN` keys with token entries.

- [ ] **Step 3: Write the drift test**

Create `src/data/__tests__/tokenMeta.drift.test.ts`. This imports the SDK `Factory` (Node-side, fine in a test) and the generated module, and fails if they diverge:

```ts
import { describe, it, expect } from 'vitest';
import { Factory } from '../../utils/SwapperFactory';
import { tokenMeta } from '../tokenMeta.generated';

describe('tokenMeta.generated', () => {
  it('matches Factory.Tokens (run `npx tsx scripts/genTokens.ts` to regenerate)', () => {
    const F = Factory.Tokens as any;
    for (const chainId of Object.keys(F)) {
      for (const ticker of Object.keys(F[chainId])) {
        const t = F[chainId][ticker];
        const m = (tokenMeta as any)[chainId]?.[ticker];
        expect(m, `${chainId}.${ticker} missing in tokenMeta.generated`).toBeDefined();
        expect(m.address).toBe(t.address);
        expect(m.decimals).toBe(t.decimals);
        expect(m.ticker).toBe(t.ticker);
        expect(m.chainId).toBe(t.chainId);
        expect(m.chain).toBe(t.chain);
      }
    }
  });
});
```

- [ ] **Step 4: Run the test (expect pass, since we just generated)**

Run: `npm test -- tokenMeta.drift`
Expected: PASS. If it fails, regenerate with Step 2 and re-run.

- [ ] **Step 5: Commit**

```bash
git add scripts/genTokens.ts src/data/tokenMeta.generated.ts src/data/__tests__/tokenMeta.drift.test.ts
git commit -m "perf: generate static token metadata from SDK with drift test"
```

---

### Task 3: Run the generator on dev and build (W1.2)

**Files:**
- Modify: `vite.config.ts` (add a `buildStart` plugin)

**Interfaces:**
- Consumes: `scripts/genTokens.ts` from Task 2.
- Produces: automatic regeneration of `src/data/tokenMeta.generated.ts` on both `npm start` and `npm run build`.

- [ ] **Step 1: Add the plugin**

In `vite.config.ts`, add a small local plugin and include it first in the `plugins` array. It shells out to the generator so the heavy SDK import stays in an isolated process (not in Vite's config eval). `buildStart` fires for both `vite` (dev) and `vite build`:

```ts
import { execFileSync } from 'child_process';

function genTokensPlugin() {
  return {
    name: 'gen-tokens',
    buildStart() {
      execFileSync('npx', ['tsx', 'scripts/genTokens.ts'], { stdio: 'inherit' });
    },
  };
}
// plugins: [ genTokensPlugin(), react(), nodePolyfills({...}), ... ]
```

- [ ] **Step 2: Verify dev regeneration**

Run: `touch src/data/tokenMeta.generated.ts && npm start`
Expected: on startup the console prints `Wrote src/data/tokenMeta.generated.ts`; the dev server then serves normally. Stop the server.

- [ ] **Step 3: Verify build regeneration**

Run: `npm run build`
Expected: the same `Wrote ...` line appears during the build, and the build completes.

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts
git commit -m "perf: regenerate token metadata on dev start and build"
```

---

### Task 4: Source token display data from generated metadata (W1.3)

**Files:**
- Modify: `src/utils/Tokens.ts`
- Test: `src/utils/__tests__/Tokens.test.ts` (create)

**Interfaces:**
- Consumes: `tokenMeta` from Task 2.
- Produces: `smartChainTokenArray`, `supportedSmartChainTokenIdentifiers`, `TokenIcons`, and the display/format helpers, all with **no import from `./SwapperFactory`** at module top. `fromTokenIdentifier` for smart-chain tokens is deferred to Task 5.

- [ ] **Step 1: Write a test pinning the display data**

Create `src/utils/__tests__/Tokens.test.ts`. It asserts the array is populated from metadata without the SDK factory, and that identifiers are stable:

```ts
import { describe, it, expect } from 'vitest';
import { smartChainTokenArray, supportedSmartChainTokenIdentifiers, toTokenIdentifier } from '../Tokens';

describe('Tokens display data', () => {
  it('populates the smart-chain token array from metadata', () => {
    expect(smartChainTokenArray.length).toBeGreaterThan(0);
    const sol = smartChainTokenArray.find((t) => t.chainId === 'SOLANA' && t.ticker === 'SOL');
    expect(sol).toBeTruthy();
    expect(sol!.decimals).toBe(9);
  });
  it('derives identifiers as chainId:address', () => {
    const sol = smartChainTokenArray.find((t) => t.ticker === 'SOL')!;
    expect(toTokenIdentifier(sol)).toBe(`SOLANA:${sol.address}`);
    expect(supportedSmartChainTokenIdentifiers.has(toTokenIdentifier(sol))).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- Tokens.test`
Expected: FAIL (module still imports `Tokens` from `./SwapperFactory`, or field mismatch) — this confirms the test exercises the code before the refactor.

- [ ] **Step 3: Refactor `utils/Tokens.ts`**

Replace the top import `import {TokenResolver, Tokens} from "./SwapperFactory";` with `import { tokenMeta } from "../data/tokenMeta.generated";`. Keep the lightweight SDK type imports (`isBtcToken`, `isSCToken`, `SCToken`, `Token`, `toHumanReadableString`, `BitcoinNetwork`) — these are type guards/utilities and do not pull the chain runtimes. Rebuild `smartChainTokenArray` from `tokenMeta` instead of `Tokens.SOLANA.SOL` etc. Each push becomes a lookup, e.g.:

```ts
// helper near the top
const scToken = (chainId: string, ticker: string): SCToken =>
  (tokenMeta as any)[chainId][ticker] as SCToken;

// then, preserving the existing ChainsConfig guards and ordering:
if (ChainsConfig.SOLANA) {
  smartChainTokenArray.push(scToken('SOLANA', 'SOL'));
  smartChainTokenArray.push(scToken('SOLANA', 'USDC'));
  smartChainTokenArray.push(scToken('SOLANA', 'WBTC'));
  smartChainTokenArray.push(scToken('SOLANA', 'BONK'));
}
// ...repeat the same 1:1 substitution for CITREA, BOTANIX, ALPEN, GOAT, STARKNET
```

Update the two BTC references in `fromTokenIdentifier` to use SDK `BitcoinTokens` (lightweight constant from `@atomiqlabs/sdk`) instead of `Tokens.BITCOIN`: `import { BitcoinTokens } from '@atomiqlabs/sdk';` then `return BitcoinTokens.BTCLN;` / `return BitcoinTokens.BTC;`. Leave the smart-chain `default` branch of `fromTokenIdentifier` (which uses `TokenResolver`) as a temporary throw or `null` return with a `// TODO(Task 5)`-free comment noting it is wired to the lazy swapper in the next task — Task 5 replaces it.

- [ ] **Step 4: Run the tests and typecheck**

Run: `npm test -- Tokens.test tokenMeta.drift` then `npm run typecheck`
Expected: the Tokens tests PASS; typecheck passes (fix any field-name mismatches surfaced by the compiler).

- [ ] **Step 5: Commit**

```bash
git add src/utils/Tokens.ts src/utils/__tests__/Tokens.test.ts
git commit -m "perf: render token list from static metadata, drop SDK import from Tokens"
```

---

### Task 5: Lazy-load the SDK Factory + reroute remaining importers (W1.4)

**Files:**
- Modify: `src/providers/SwapperProvider.tsx`
- Modify: `src/utils/Tokens.ts` (`fromTokenIdentifier` smart-chain branch)
- Modify (as typecheck requires): `src/adapters/transactionAdapters.ts`, `src/hooks/pages/useSwapPage.ts`, `src/pages/quickscan/QuickScanExecute.tsx`, `src/seo/tokens.ts`

**Interfaces:**
- Consumes: `Factory` from `utils/SwapperFactory` (now imported dynamically); the loaded `swapper` exposes token resolution used to turn an identifier into a real SDK token for swap construction.
- Produces: chain runtimes in a separate async chunk loaded after first paint.

- [ ] **Step 1: Dynamically import Factory in `SwapperProvider`**

Remove the top-level `import {Factory} from "../utils/SwapperFactory";`. Inside `loadSwapper()`, before `Factory.newSwapper(...)`, add: `const { Factory } = await import("../utils/SwapperFactory");`. Remove the module-level `console.log('Factory: ', Factory);` (it forces eager evaluation). Leave all other logic unchanged.

- [ ] **Step 2: Route smart-chain identifier resolution through the loaded swapper**

For any consumer that turned a URL identifier into a smart-chain `Token` via `fromTokenIdentifier`/`TokenResolver` (chiefly `useSwapPage.ts` and `QuickScanExecute.tsx`), resolve it from the already-loaded `swapper` in context instead of the static `TokenResolver`. The swapper is available via `SwapperContext`; a token is resolved by its `chainId` + `address`. Where a component only needs display data (icon/ticker/name) it should use `tokenMeta`/`TokenIcons`, not the SDK. Update `transactionAdapters.ts` and `seo/tokens.ts` similarly: display → metadata, swap logic → loaded swapper. Work file-by-file guided by `npm run typecheck`; the contract is "no module on the initial route may statically import from `utils/SwapperFactory`."

- [ ] **Step 3: Verify no static SDK-factory import remains on the critical path**

Run: `grep -rn "utils/SwapperFactory" src` 
Expected: the only matches are `scripts/genTokens.ts`, the drift test, and the dynamic `import(...)` inside `SwapperProvider.tsx`. No static top-level `import ... from '.../SwapperFactory'` in any component/hook/adapter.

- [ ] **Step 4: Typecheck and run the full test suite**

Run: `npm run typecheck && npm test`
Expected: both pass.

- [ ] **Step 5: Verify the chunk split in the build**

Run: `npm run build` then inspect `build/assets` (or `npm run analyze` + `stats.html`).
Expected: the main entry chunk is materially smaller than the Task 1 baseline, and a separate large chunk containing `@atomiqlabs/chain-*` / `@solana` / `starknet` / `ethers` exists (loaded on demand, not by `index.html`).

- [ ] **Step 6: Manual smoke test (the regression-critical step)**

Run `npm start`. Verify: the swap card renders immediately with the default token pair; a deep link `http://localhost:5173/?tokenIn=BITCOIN&tokenOut=SOLANA:<sol-usdc-address>` shows the correct pair; connecting a wallet, getting a quote, and starting each swap type still works. Confirm no console errors on load.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "perf: dynamically import chain SDK so it loads after first paint"
```

---

### Task 6: Route-level code splitting (W3)

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: each non-index route as its own async chunk; `qr-scanner` no longer in the initial chunk.

- [ ] **Step 1: Convert non-index routes to `React.lazy`**

In `App.tsx`, replace the static page imports (`QuickScan`, `QuickScanExecute`, `HistoryPage`, `FAQPage`, `AboutPage`, `SwapForGas`, `SwapExplorer`, `NotFound`) with lazy imports, keeping `SwapNew` (the index route) eagerly imported so first paint is unaffected:

```ts
import { lazy, Suspense } from 'react';
const HistoryPage = lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const FAQPage = lazy(() => import('./pages/FAQPage').then(m => ({ default: m.FAQPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const SwapForGas = lazy(() => import('./pages/SwapForGas').then(m => ({ default: m.SwapForGas })));
const SwapExplorer = lazy(() => import('./pages/SwapExplorer').then(m => ({ default: m.SwapExplorer })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));
const QuickScan = lazy(() => import('./pages/quickscan/QuickScan').then(m => ({ default: m.QuickScan })));
const QuickScanExecute = lazy(() => import('./pages/quickscan/QuickScanExecute').then(m => ({ default: m.QuickScanExecute })));
```

Wrap `<Routes>` in `<Suspense fallback={<div className="d-flex justify-content-center mt-5"><Spinner animation="border" variant="light" /></div>}>`.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Verify chunks + navigation**

Run: `npm run build` (expect per-page chunk files in `build/assets`), then `npm start` and click through `/history`, `/gas`, `/faq`, `/about`, `/explorer`, `/scan`. Expected: each route loads and works.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "perf: lazy-load non-index routes and qr-scanner"
```

---

### Task 7: CLS fixes (W2)

**Files:**
- Modify: `src/assets/fonts/WorkSans/style.css`, `src/assets/fonts/scandia/medium/style.css`, `src/assets/fonts/scandia/regular/style.css`
- Modify: `src/App.tsx` (loading/error overlay)
- Modify: whichever nodes Task 1 Step 5 flagged (swap card / images)

**Interfaces:**
- Produces: lab CLS < 0.1 on the app.

- [ ] **Step 1: Add `font-display: swap` to every `@font-face`**

In each of the three font `style.css` files, add `font-display: swap;` inside every `@font-face` block. This removes the invisible-text-then-reflow (FOIT) shift. (WorkSans ships TTF-only; a woff2 conversion is a weight optimization deferred out of this task.)

- [ ] **Step 2: Stabilize the loading/error overlay**

In `App.tsx`, the block at lines ~29-43 conditionally inserts a tall overlay into normal document flow only when `loading && loadingError`. Give its container a reserved, non-shifting placement (render it as an absolutely-positioned overlay within a relatively-positioned parent, or reserve its height) so toggling it does not push the routed content down.

- [ ] **Step 3: Address the specific nodes from the baseline**

For each node Task 1 flagged under layout shifts (expected: the swap card region that fills once the swapper loads, and any images without dimensions), reserve space: give the swap-card container a stable `min-height`, and add explicit `width`/`height` (or `aspect-ratio`) to any `<img>` lacking them. Task 4/5 already remove the biggest shift by rendering tokens synchronously.

- [ ] **Step 4: Verify CLS**

Run Lighthouse (Incognito) on the running app. Expected: lab CLS < 0.1. Compare against the baseline value.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "perf: eliminate layout shift (font-display, stable overlay, image dimensions)"
```

---

### Task 8: Verify Cloudflare cache headers (W5)

**Files:** none (verification only — the team already configured the Cloudflare cache rules).

- [ ] **Step 1: Check a hashed asset**

Run: `curl -sI https://app.atomiq.exchange/assets/<any-hashed-file>.js | grep -i cache-control`
Expected: a long `max-age` with `immutable` (e.g. `cache-control: public, max-age=31536000, immutable`).

- [ ] **Step 2: Check the HTML document**

Run: `curl -sI https://app.atomiq.exchange/ | grep -i cache-control`
Expected: a short or `no-cache` policy so new deploys are picked up. Record both results in `docs/perf-tier1-baseline.md`; if either is wrong, flag it to the team (this task changes no code).

---

### Task 9: Landing mobile (W4) — BLOCKED pending source location

**Status:** The `www.atomiq.exchange/` marketing homepage (Performance 76 on mobile, the hero-imagery page) is generated and built to a **separate folder inside the `atomiq-webapp` repo** (per the owner). That folder is not git-tracked (`git ls-files` shows only `src/ docs/ public/ scripts/` + configs) and the hero copy is not in the tracked source, so it is a gitignored build output or lives on a separate branch. The exact source path is to be provided when W4 starts.

**Needed from the owner (at W4 start):** the exact path to the marketing site's source (which folder generates it) so its `<head>`/CSS/image pipeline can be edited.

**Intended fix once located (from the design, W4):** stop render-blocking on the full CSS (inline critical CSS or load the sheet non-blocking) to kill the ~2,980 ms mobile render-block; add font `preload` + `font-display: swap`; give hero images explicit dimensions, serve WebP/AVIF at responsive sizes (the 799 KiB of images is the bulk of mobile weight), and lazy-load below-the-fold images. Target: mobile Performance ≥ 90.

---

## Execution order

Task 1 → Task 8 (quick verify) → Task 6 (route split) → Tasks 2-5 (the token/SDK core, in order) → Task 7 (CLS, benefits from Tasks 4-5) → Task 9 (once unblocked). Tasks 2-5 are sequential; Task 6 and Task 8 are independent and can run anytime after Task 1.
