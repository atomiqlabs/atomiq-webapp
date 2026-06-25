# SEO Static Landing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate one static, crawlable HTML landing page per supported token-swap pair (e.g. `/swap/bitcoin-to-usdc-solana`), each with real SEO content and a CTA that deep-links into the existing swap app with the pair pre-selected.

**Architecture:** A pure-data token catalog + route matrix drives both content and a post-build generator. The generator (`tsx scripts/build-seo.tsx`) runs in raw Node after `vite build`: it constructs the SDK `SwapperFactory` to resolve token identifiers, `renderToStaticMarkup`s a logic-free `<LandingPage>` (which reuses presentational `MainNavigationView`/`SocialFooterView`), and writes `build/swap/<slug>/index.html` + `sitemap.xml`. The landing pages ship no React runtime; menu interactivity is a shared plain-JS file (`public/navMenu.js`) loaded by both the app and the static pages.

**Tech Stack:** Vite, React 18, react-bootstrap, react-router-dom, `@atomiqlabs/sdk`, `tsx` (build-script runner), `vitest` + `@testing-library/react` (tests), `react-dom/server` (`renderToStaticMarkup`).

**Spec:** `docs/superpowers/specs/2026-06-17-seo-static-landing-pages-design.md`

**Validated assumptions (probed against installed deps):**
- `new SwapperFactory([SolanaInitializerV2, StarknetInitializer, CitreaInitializer, BotanixInitializer, AlpenInitializer, GoatInitializer]).Tokens` resolves in raw Node. Real identifiers used in fixtures below.
- The swap page reads `tokenIn`/`tokenOut`/`exactIn`/`amount` query params (`src/hooks/pages/useSwapPage.ts:348`); identifier format is `BITCOIN` | `LIGHTNING` | `<chainId>:<address>` (`src/utils/Tokens.ts:108`).

---

## Token identifier reference (from SDK probe, mainnet)

```
BITCOIN.BTC   -> BITCOIN
BITCOIN.BTCLN -> LIGHTNING
SOLANA.SOL    -> SOLANA:So11111111111111111111111111111111111111112
SOLANA.USDC   -> SOLANA:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
SOLANA.WBTC   -> SOLANA:3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh
SOLANA.BONK   -> SOLANA:DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
STARKNET.STRK -> STARKNET:0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
STARKNET.ETH  -> STARKNET:0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
STARKNET.WBTC -> STARKNET:0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac
STARKNET.strkBTC -> STARKNET:0x0787150e306e6eae6e3f79dea881770e8bbff2c1b8eb490f969669ee945b3135
STARKNET.USDC -> STARKNET:0x033068f6539f8e6e6b131e6b2b814e6c34a5224bc66947c47dab9dfee93b35fb
CITREA.CBTC   -> CITREA:0x0000000000000000000000000000000000000000
CITREA.USDC   -> CITREA:0xE045e6c36cF77FAA2CfB54466D71A3aEF7bbE839
```

The generator resolves these at build time via the Factory (not hardcoded). The strings above are used only in test fixtures.

---

## File structure

New files:
- `src/seo/tokens.ts` — pure token catalog (`SeoToken[]`): key, ticker, chain, display, SDK path. Curation point.
- `src/seo/routes.ts` — pure route enumeration: `buildRoutes()` → `SeoRoute[]`, slug logic, exclusion list.
- `src/seo/content.ts` — pure content composition: base copy + per-chain/token overrides; `composeRoute(route)`.
- `src/seo/baseFaqs.tsx` — selects/reuses base FAQ items from `FAQContent`.
- `src/seo/seoHead.ts` — pure `<head>` + JSON-LD string builders.
- `src/seo/LandingPage.tsx` — presentational page (props: resolved route). No SDK/context imports.
- `src/seo/types.ts` — shared SEO types.
- `src/components/layout/MainNavigationView.tsx` — presentational nav.
- `src/components/layout/SocialFooterView.tsx` — presentational footer.
- `public/navMenu.js` — plain-JS menu interactivity (shared).
- `scripts/build-seo.tsx` — post-build generator (run via `tsx`).
- Tests: `src/seo/__tests__/*.test.ts(x)`, `src/components/layout/__tests__/navMenu.test.ts`.

Modified files:
- `src/components/layout/MainNavigation.tsx` → wrapper around the View; remove unused `FEConstants` import.
- `src/components/layout/SocialFooter.tsx` → wrapper around the View.
- `index.html` → add `<script defer src="/navMenu.js">`.
- `src/pages/AboutPage.tsx:45`, `src/pages/SwapForGas.tsx:64` → fix `/FAQPage` → `/faq`.
- `src/pages/HistoryPage.tsx`, `src/pages/quickscan/QuickScan.tsx`, `src/pages/quickscan/QuickScanExecute.tsx`, `src/pages/SwapForGas.tsx` → client-side `noindex`.
- `vite.config.ts` → `build.manifest: true`.
- `package.json` → `build`/`build:seo`/`test` scripts; devDeps `tsx`, `vitest`.
- `public/robots.txt` → sitemap + disallows.

---

## Task 1: Tooling — vitest, tsx, manifest, baseline

**Files:**
- Modify: `package.json`, `vite.config.ts`
- Create: `vitest.config.ts`, `src/seo/types.ts`

- [ ] **Step 1: Install dev deps**

Run:
```bash
npm install --save-dev vitest@^2 tsx@^4 jsdom@^25 --force
```
Expected: added packages, no fatal errors.

- [ ] **Step 2: Add scripts to `package.json`**

In the `"scripts"` block, set `build` and add `build:seo`, `test`:
```json
    "build": "vite build && npm run build:seo",
    "build:seo": "tsx scripts/build-seo.tsx",
    "preview": "vite preview",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
```

- [ ] **Step 3: Enable the build manifest in `vite.config.ts`**

In the `build` block, add `manifest: true`:
```ts
    build: {
        outDir: 'build',
        manifest: true,
        rollupOptions: {
            input: '/index.html',
        },
    },
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 5: Create `src/seo/types.ts`**

```ts
import type { ReactNode } from 'react';

export type SeoToken = {
  key: string;          // unique slug part, e.g. 'usdc-solana' | 'bitcoin' | 'lightning'
  ticker: string;       // 'USDC', 'BTC'
  chainKey: string;     // 'solana' | 'starknet' | 'citrea' | 'bitcoin' | 'lightning'
  chainName: string;    // 'Solana', 'Starknet', 'Citrea', 'Bitcoin', 'Lightning Network'
  sdkPath?: [string, string]; // ['SOLANA','USDC'] for smart-chain tokens; omitted for BTC/LN
  literalId?: string;   // 'BITCOIN' | 'LIGHTNING' for the BTC side
  isBtcSide: boolean;
};

export type SeoRoute = {
  slug: string;     // 'bitcoin-to-usdc-solana'
  from: SeoToken;
  to: SeoToken;
};

export type FaqItem = { question: string; answer: ReactNode };

export type ComposedRoute = SeoRoute & {
  title: string;
  description: string;
  h1: string;
  intro: string;
  faqs: FaqItem[];
};

export type ResolvedRoute = ComposedRoute & {
  tokenInId: string;   // resolved at build via SDK
  tokenOutId: string;
  ctaHref: string;     // '/?tokenIn=...&tokenOut=...'
};
```

- [ ] **Step 6: Verify typecheck baseline**

Run: `npm run typecheck`
Expected: PASS (no errors from the new types file).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts vitest.config.ts src/seo/types.ts
git commit -m "chore: add vitest/tsx tooling and SEO types"
```

---

## Task 2: Token catalog (`src/seo/tokens.ts`)

**Files:**
- Create: `src/seo/tokens.ts`
- Test: `src/seo/__tests__/tokens.test.ts`

- [ ] **Step 1: Write the failing test**

`src/seo/__tests__/tokens.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { BTC_SIDE, SMART_CHAIN_TOKENS } from '../tokens';

describe('token catalog', () => {
  it('has bitcoin and lightning on the BTC side with literal ids', () => {
    const keys = BTC_SIDE.map((t) => t.key);
    expect(keys).toEqual(['bitcoin', 'lightning']);
    expect(BTC_SIDE.find((t) => t.key === 'bitcoin')!.literalId).toBe('BITCOIN');
    expect(BTC_SIDE.find((t) => t.key === 'lightning')!.literalId).toBe('LIGHTNING');
  });

  it('smart-chain tokens carry a unique key and sdkPath', () => {
    const usdcSol = SMART_CHAIN_TOKENS.find((t) => t.key === 'usdc-solana');
    expect(usdcSol).toBeDefined();
    expect(usdcSol!.sdkPath).toEqual(['SOLANA', 'USDC']);
    expect(usdcSol!.chainName).toBe('Solana');
    const keys = SMART_CHAIN_TOKENS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length); // unique
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/seo/__tests__/tokens.test.ts`
Expected: FAIL ("Cannot find module '../tokens'").

- [ ] **Step 3: Implement `src/seo/tokens.ts`**

```ts
import type { SeoToken } from './types';

export const BTC_SIDE: SeoToken[] = [
  { key: 'bitcoin', ticker: 'BTC', chainKey: 'bitcoin', chainName: 'Bitcoin', literalId: 'BITCOIN', isBtcSide: true },
  { key: 'lightning', ticker: 'BTC', chainKey: 'lightning', chainName: 'Lightning Network', literalId: 'LIGHTNING', isBtcSide: true },
];

// Mirrors the mainnet entries of smartChainTokenArray (src/utils/Tokens.ts:49).
// Curate here: comment a line out to drop that token's pages.
export const SMART_CHAIN_TOKENS: SeoToken[] = [
  { key: 'sol-solana',     ticker: 'SOL',     chainKey: 'solana',   chainName: 'Solana',   sdkPath: ['SOLANA', 'SOL'],     isBtcSide: false },
  { key: 'usdc-solana',    ticker: 'USDC',    chainKey: 'solana',   chainName: 'Solana',   sdkPath: ['SOLANA', 'USDC'],    isBtcSide: false },
  { key: 'wbtc-solana',    ticker: 'WBTC',    chainKey: 'solana',   chainName: 'Solana',   sdkPath: ['SOLANA', 'WBTC'],    isBtcSide: false },
  { key: 'bonk-solana',    ticker: 'BONK',    chainKey: 'solana',   chainName: 'Solana',   sdkPath: ['SOLANA', 'BONK'],    isBtcSide: false },
  { key: 'strk-starknet',  ticker: 'STRK',    chainKey: 'starknet', chainName: 'Starknet', sdkPath: ['STARKNET', 'STRK'],  isBtcSide: false },
  { key: 'eth-starknet',   ticker: 'ETH',     chainKey: 'starknet', chainName: 'Starknet', sdkPath: ['STARKNET', 'ETH'],   isBtcSide: false },
  { key: 'wbtc-starknet',  ticker: 'WBTC',    chainKey: 'starknet', chainName: 'Starknet', sdkPath: ['STARKNET', 'WBTC'],  isBtcSide: false },
  { key: 'strkbtc-starknet', ticker: 'strkBTC', chainKey: 'starknet', chainName: 'Starknet', sdkPath: ['STARKNET', 'strkBTC'], isBtcSide: false },
  { key: 'usdc-starknet',  ticker: 'USDC',    chainKey: 'starknet', chainName: 'Starknet', sdkPath: ['STARKNET', 'USDC'],  isBtcSide: false },
  { key: 'cbtc-citrea',    ticker: 'cBTC',    chainKey: 'citrea',   chainName: 'Citrea',   sdkPath: ['CITREA', 'CBTC'],    isBtcSide: false },
  { key: 'usdc-citrea',    ticker: 'USDC',    chainKey: 'citrea',   chainName: 'Citrea',   sdkPath: ['CITREA', 'USDC'],    isBtcSide: false },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/seo/__tests__/tokens.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/seo/tokens.ts src/seo/__tests__/tokens.test.ts
git commit -m "feat(seo): add token catalog for landing pages"
```

---

## Task 3: Route enumeration (`src/seo/routes.ts`)

**Files:**
- Create: `src/seo/routes.ts`
- Test: `src/seo/__tests__/routes.test.ts`

- [ ] **Step 1: Write the failing test**

`src/seo/__tests__/routes.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildRoutes } from '../routes';

describe('buildRoutes', () => {
  const routes = buildRoutes();

  it('creates both directions for each btc-side x smart-chain pair', () => {
    const slugs = routes.map((r) => r.slug);
    expect(slugs).toContain('bitcoin-to-usdc-solana');
    expect(slugs).toContain('usdc-solana-to-bitcoin');
    expect(slugs).toContain('lightning-to-sol-solana');
    expect(slugs).toContain('strkbtc-starknet-to-lightning');
  });

  it('produces unique slugs and no btc-to-btc pairs', () => {
    const slugs = routes.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(routes.every((r) => r.from.isBtcSide !== r.to.isBtcSide)).toBe(true);
  });

  it('slug equals from.key-to-to.key', () => {
    const r = routes.find((x) => x.slug === 'bitcoin-to-usdc-solana')!;
    expect(r.from.key).toBe('bitcoin');
    expect(r.to.key).toBe('usdc-solana');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/seo/__tests__/routes.test.ts`
Expected: FAIL ("Cannot find module '../routes'").

- [ ] **Step 3: Implement `src/seo/routes.ts`**

```ts
import type { SeoRoute, SeoToken } from './types';
import { BTC_SIDE, SMART_CHAIN_TOKENS } from './tokens';

// Slugs to omit (curation). e.g. 'bonk-solana-to-bitcoin'.
const EXCLUDE = new Set<string>([]);

function pair(from: SeoToken, to: SeoToken): SeoRoute {
  return { slug: `${from.key}-to-${to.key}`, from, to };
}

export function buildRoutes(): SeoRoute[] {
  const routes: SeoRoute[] = [];
  for (const btc of BTC_SIDE) {
    for (const sc of SMART_CHAIN_TOKENS) {
      routes.push(pair(btc, sc)); // BTC -> token
      routes.push(pair(sc, btc)); // token -> BTC
    }
  }
  return routes.filter((r) => !EXCLUDE.has(r.slug));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/seo/__tests__/routes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/seo/routes.ts src/seo/__tests__/routes.test.ts
git commit -m "feat(seo): enumerate token-pair routes"
```

---

## Task 4: Base FAQs + content composition

**Files:**
- Create: `src/seo/baseFaqs.tsx`, `src/seo/content.ts`
- Test: `src/seo/__tests__/content.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/seo/__tests__/content.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { composeRoute } from '../content';
import { buildRoutes } from '../routes';

describe('composeRoute', () => {
  const routes = buildRoutes();
  const btcToUsdcSol = routes.find((r) => r.slug === 'bitcoin-to-usdc-solana')!;

  it('builds a title, description, h1 with token + chain context', () => {
    const c = composeRoute(btcToUsdcSol);
    expect(c.title).toBe('Swap BTC to USDC on Solana | Atomiq');
    expect(c.h1).toBe('Swap BTC to USDC on Solana');
    expect(c.description.length).toBeGreaterThan(40);
  });

  it('includes chain-specific extra FAQ for Solana targets', () => {
    const c = composeRoute(btcToUsdcSol);
    const questions = c.faqs.map((f) => f.question);
    expect(questions.some((q) => /What is Solana/i.test(q))).toBe(true);
    expect(c.faqs.length).toBeGreaterThanOrEqual(3); // base + extras
  });

  it('includes Lightning extra FAQ for lightning routes', () => {
    const r = routes.find((x) => x.slug === 'lightning-to-sol-solana')!;
    const c = composeRoute(r);
    expect(c.faqs.map((f) => f.question).some((q) => /Lightning/i.test(q))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/seo/__tests__/content.test.tsx`
Expected: FAIL ("Cannot find module '../content'").

- [ ] **Step 3: Implement `src/seo/baseFaqs.tsx`**

Reuse a subset of the existing FAQ copy as static (non-interactive) nodes. Note `FAQContent` answers may be functions taking `anchorNavigate`; call them with a no-op.

```tsx
import * as React from 'react';
import { FAQContent } from '../data/FAQContent';
import type { FaqItem } from './types';

const noop = () => {};

// Indices into FAQContent: "Do I have to trust anyone?", "Why should you use atomiq.exchange?", "Are you audited?"
const BASE_INDICES = [2, 3, 7];

export const BASE_FAQS: FaqItem[] = BASE_INDICES.map((i) => {
  const item = FAQContent[i];
  return {
    question: item.question,
    answer: typeof item.answer === 'function' ? item.answer(noop) : item.answer,
  };
});
```

- [ ] **Step 4: Implement `src/seo/content.ts`**

```ts
import * as React from 'react';
import type { ComposedRoute, FaqItem, SeoRoute, SeoToken } from './types';
import { BASE_FAQS } from './baseFaqs';

function display(token: SeoToken, withChain: boolean): string {
  if (token.chainKey === 'bitcoin') return 'BTC';
  if (token.chainKey === 'lightning') return 'Lightning BTC';
  return withChain ? `${token.ticker} on ${token.chainName}` : token.ticker;
}

const CHAIN_FAQS: Record<string, FaqItem> = {
  solana: {
    question: 'What is Solana?',
    answer: React.createElement('p', null,
      'Solana is a high-performance, low-fee smart-contract blockchain. Atomiq lets you move native Bitcoin in and out of the Solana ecosystem trustlessly, without a custodial bridge or centralized exchange.'),
  },
  starknet: {
    question: 'What is Starknet?',
    answer: React.createElement('p', null,
      'Starknet is an Ethereum layer-2 ZK-rollup. Atomiq enables trustless, atomic swaps between native Bitcoin and Starknet assets, secured by a Bitcoin light client and on-chain contracts.'),
  },
  citrea: {
    question: 'What is Citrea?',
    answer: React.createElement('p', null,
      'Citrea is a Bitcoin rollup. Atomiq lets you swap between native Bitcoin and Citrea assets trustlessly.'),
  },
};

const LIGHTNING_FAQ: FaqItem = {
  question: 'What is the Lightning Network?',
  answer: React.createElement('p', null,
    'The Lightning Network is a Bitcoin layer-2 for instant, low-fee payments. Atomiq supports Lightning as a swap leg, so you can move between Lightning BTC and smart-chain assets in seconds.'),
};

export function composeRoute(route: SeoRoute): ComposedRoute {
  const from = display(route.from, false);
  const to = display(route.to, true);
  const fromFull = display(route.from, true);

  const title = `Swap ${from} to ${to} | Atomiq`;
  const h1 = `Swap ${from} to ${to}`;
  const description =
    `Swap ${fromFull} to ${to} trustlessly with Atomiq — a non-custodial, atomic cross-chain DEX. ` +
    `No centralized exchange, no custodial bridge: just connect your wallets and swap.`;
  const intro =
    `Atomiq lets you swap ${fromFull} to ${to} in a fully trustless, atomic way. ` +
    `Swaps are secured by a Bitcoin light client and on-chain smart contracts, so you keep custody of your funds the entire time and can always reclaim them if a swap does not complete.`;

  const extras: FaqItem[] = [];
  const scChain = route.from.isBtcSide ? route.to.chainKey : route.from.chainKey;
  if (CHAIN_FAQS[scChain]) extras.push(CHAIN_FAQS[scChain]);
  if (route.from.chainKey === 'lightning' || route.to.chainKey === 'lightning') extras.push(LIGHTNING_FAQ);

  return { ...route, title, description, h1, intro, faqs: [...extras, ...BASE_FAQS] };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/seo/__tests__/content.test.tsx`
Expected: PASS. If a base-FAQ index assertion fails, verify indices in `src/data/FAQContent.tsx` and adjust `BASE_INDICES`.

- [ ] **Step 6: Commit**

```bash
git add src/seo/baseFaqs.tsx src/seo/content.ts src/seo/__tests__/content.test.tsx
git commit -m "feat(seo): compose per-route content with base + chain FAQs"
```

---

## Task 5: SEO head + JSON-LD builders (`src/seo/seoHead.ts`)

**Files:**
- Create: `src/seo/seoHead.ts`
- Test: `src/seo/__tests__/seoHead.test.ts`

- [ ] **Step 1: Write the failing test**

`src/seo/__tests__/seoHead.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { renderHead, ORIGIN } from '../seoHead';
import type { ResolvedRoute } from '../types';

const fixture: ResolvedRoute = {
  slug: 'bitcoin-to-usdc-solana',
  from: { key: 'bitcoin', ticker: 'BTC', chainKey: 'bitcoin', chainName: 'Bitcoin', literalId: 'BITCOIN', isBtcSide: true },
  to: { key: 'usdc-solana', ticker: 'USDC', chainKey: 'solana', chainName: 'Solana', sdkPath: ['SOLANA', 'USDC'], isBtcSide: false },
  title: 'Swap BTC to USDC on Solana | Atomiq',
  description: 'desc',
  h1: 'Swap BTC to USDC on Solana',
  intro: 'intro',
  faqs: [],
  tokenInId: 'BITCOIN',
  tokenOutId: 'SOLANA:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  ctaHref: '/?tokenIn=BITCOIN&tokenOut=SOLANA:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
};

describe('renderHead', () => {
  const head = renderHead(fixture);
  it('emits title, description, canonical', () => {
    expect(head).toContain('<title>Swap BTC to USDC on Solana | Atomiq</title>');
    expect(head).toContain(`<link rel="canonical" href="${ORIGIN}/swap/bitcoin-to-usdc-solana"/>`);
    expect(head).toContain('<meta name="description" content="desc"/>');
  });
  it('emits og + twitter', () => {
    expect(head).toContain('property="og:title"');
    expect(head).toContain('name="twitter:card" content="summary_large_image"');
  });
  it('emits WebApplication + BreadcrumbList JSON-LD, no FAQPage', () => {
    expect(head).toContain('"@type":"WebApplication"');
    expect(head).toContain('"@type":"BreadcrumbList"');
    expect(head).not.toContain('FAQPage');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/seo/__tests__/seoHead.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/seo/seoHead.ts`**

```ts
import type { ResolvedRoute } from './types';

export const ORIGIN = 'https://app.atomiq.exchange';
const OG_IMAGE = `${ORIGIN}/logo512.png`;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderHead(route: ResolvedRoute): string {
  const url = `${ORIGIN}/swap/${route.slug}`;
  const t = esc(route.title);
  const d = esc(route.description);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', name: 'Atomiq', url: ORIGIN, logo: OG_IMAGE },
      { '@type': 'WebSite', name: 'Atomiq', url: ORIGIN },
      { '@type': 'WebApplication', name: route.title, url, applicationCategory: 'FinanceApplication', operatingSystem: 'Web' },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Atomiq', item: ORIGIN },
          { '@type': 'ListItem', position: 2, name: route.h1, item: url },
        ],
      },
    ],
  };
  return [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}"/>`,
    `<link rel="canonical" href="${url}"/>`,
    `<meta property="og:type" content="website"/>`,
    `<meta property="og:title" content="${t}"/>`,
    `<meta property="og:description" content="${d}"/>`,
    `<meta property="og:url" content="${url}"/>`,
    `<meta property="og:image" content="${OG_IMAGE}"/>`,
    `<meta name="twitter:card" content="summary_large_image"/>`,
    `<meta name="twitter:title" content="${t}"/>`,
    `<meta name="twitter:description" content="${d}"/>`,
    `<meta name="twitter:image" content="${OG_IMAGE}"/>`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
  ].join('\n    ');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/seo/__tests__/seoHead.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/seo/seoHead.ts src/seo/__tests__/seoHead.test.ts
git commit -m "feat(seo): head + JSON-LD builders"
```

---

## Task 6: navMenu.js (shared menu interactivity)

**Files:**
- Create: `public/navMenu.js`
- Test: `src/components/layout/__tests__/navMenu.test.ts`

Contract (the View in Task 7 must emit these hooks):
- `[data-nav-toggle]` — hamburger button; toggles `.show` on `[data-nav-collapse]`.
- `[data-nav-collapse]` — the collapsible nav container.
- `[data-nav-dropdown]` — wrapper for the "More" menu; `[data-nav-dropdown-toggle]` inside it toggles `.show` on the wrapper.
- Clicking an `<a>` inside `[data-nav-collapse]`, or clicking outside it, closes everything.

- [ ] **Step 1: Write the failing test**

`src/components/layout/__tests__/navMenu.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';

async function loadNavMenu() {
  // public/navMenu.js attaches delegated listeners and calls init on load
  await import('../../../../public/navMenu.js');
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

beforeEach(() => {
  document.body.innerHTML = `
    <button data-nav-toggle>menu</button>
    <div data-nav-collapse>
      <a href="/swap/x" id="lnk">link</a>
      <div data-nav-dropdown>
        <button data-nav-dropdown-toggle>More</button>
        <div class="dropdown-menu"></div>
      </div>
    </div>
    <div id="outside">outside</div>`;
});

describe('navMenu', () => {
  it('toggles the collapse open and closed via the hamburger', async () => {
    await loadNavMenu();
    const collapse = document.querySelector('[data-nav-collapse]')!;
    (document.querySelector('[data-nav-toggle]') as HTMLElement).click();
    expect(collapse.classList.contains('show')).toBe(true);
    (document.querySelector('[data-nav-toggle]') as HTMLElement).click();
    expect(collapse.classList.contains('show')).toBe(false);
  });

  it('closes the collapse when a nav link is clicked', async () => {
    await loadNavMenu();
    const collapse = document.querySelector('[data-nav-collapse]')!;
    (document.querySelector('[data-nav-toggle]') as HTMLElement).click();
    (document.getElementById('lnk') as HTMLElement).click();
    expect(collapse.classList.contains('show')).toBe(false);
  });

  it('toggles the More dropdown', async () => {
    await loadNavMenu();
    const dd = document.querySelector('[data-nav-dropdown]')!;
    (document.querySelector('[data-nav-dropdown-toggle]') as HTMLElement).click();
    expect(dd.classList.contains('show')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/__tests__/navMenu.test.ts`
Expected: FAIL ("Cannot find module .../public/navMenu.js").

- [ ] **Step 3: Implement `public/navMenu.js`**

```js
// Menu interactivity for the navbar (MainNavigationView). Plain JS, event-delegated
// on `document`, so it works identically for the React-rendered app and the static
// SEO landing pages. Loaded via <script defer src="/navMenu.js"> in index.html and in
// every generated page. Hooks: [data-nav-toggle], [data-nav-collapse],
// [data-nav-dropdown] + [data-nav-dropdown-toggle]. See MainNavigationView.tsx.
(function () {
  function closeAll() {
    document.querySelectorAll('[data-nav-collapse].show, [data-nav-dropdown].show')
      .forEach(function (el) { el.classList.remove('show'); });
  }

  function init() {
    document.addEventListener('click', function (e) {
      var target = e.target;
      var toggle = target.closest && target.closest('[data-nav-toggle]');
      if (toggle) {
        var collapse = document.querySelector('[data-nav-collapse]');
        if (collapse) collapse.classList.toggle('show');
        return;
      }
      var ddToggle = target.closest && target.closest('[data-nav-dropdown-toggle]');
      if (ddToggle) {
        var dd = ddToggle.closest('[data-nav-dropdown]');
        if (dd) dd.classList.toggle('show');
        return;
      }
      var link = target.closest && target.closest('[data-nav-collapse] a');
      if (link) { closeAll(); return; }
      // click outside the collapse closes everything
      if (!(target.closest && target.closest('[data-nav-collapse]'))) closeAll();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/layout/__tests__/navMenu.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/navMenu.js src/components/layout/__tests__/navMenu.test.ts
git commit -m "feat(seo): shared plain-JS navbar menu interactivity"
```

---

## Task 7: SocialFooterView + wrapper

**Files:**
- Create: `src/components/layout/SocialFooterView.tsx`
- Modify: `src/components/layout/SocialFooter.tsx`
- Test: `src/components/layout/__tests__/SocialFooterView.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/layout/__tests__/SocialFooterView.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SocialFooterView } from '../SocialFooterView';

describe('SocialFooterView', () => {
  it('renders all social links and the horizontal modifier', () => {
    const html = renderToStaticMarkup(<SocialFooterView isHorizontal={true} />);
    expect(html).toContain('href="https://github.com/atomiqlabs"');
    expect(html).toContain('href="https://twitter.com/atomiqlabs"');
    expect(html).toContain('is-horizontal');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/__tests__/SocialFooterView.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `src/components/layout/SocialFooterView.tsx`**

Move the presentational markup out of `SocialFooter.tsx`. Drop `OverlayTrigger`/`Tooltip` (JS-only; not needed for static output and avoids a router/JS dependency).

```tsx
import * as React from 'react';

const socialLink = [
  { link: 'https://twitter.com/atomiqlabs', image: 'twitter.png', title: 'Twitter' },
  { link: 'https://github.com/atomiqlabs', image: 'github.png', title: 'GitHub' },
  { link: 'https://t.me/+_MQNtlBXQ2Q1MGEy', image: 'telegram.png', title: 'Telegram' },
  { link: 'https://t.me/atomiq_support', image: 'telegram-support.png', title: 'Talk to support' },
];

export function SocialFooterView(props: { isHorizontal: boolean }) {
  return (
    <div className={`social-footer ${props.isHorizontal ? 'is-horizontal pt-3' : ''}`}>
      {socialLink.map(({ link, image, title }) => (
        <a key={link} href={link} target="_blank" rel="noreferrer" className="social-footer__link" title={title}>
          <img className="social-footer__icon" src={`/icons/socials/${image}`} alt={title} />
        </a>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Rewrite `src/components/layout/SocialFooter.tsx` as a wrapper**

```tsx
import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { SocialFooterView } from './SocialFooterView';

export function SocialFooter(props: {}) {
  const location = useLocation();
  const isHorizontal = location.pathname === '/history' || location.pathname === '/explorer';
  return <SocialFooterView isHorizontal={isHorizontal} />;
}
```

- [ ] **Step 5: Run test + typecheck**

Run: `npx vitest run src/components/layout/__tests__/SocialFooterView.test.tsx && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/SocialFooterView.tsx src/components/layout/SocialFooter.tsx src/components/layout/__tests__/SocialFooterView.test.tsx
git commit -m "refactor(layout): split SocialFooter into view + wrapper"
```

---

## Task 8: MainNavigationView + wrapper

**Files:**
- Create: `src/components/layout/MainNavigationView.tsx`
- Modify: `src/components/layout/MainNavigation.tsx`
- Test: `src/components/layout/__tests__/MainNavigationView.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/layout/__tests__/MainNavigationView.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MainNavigationView } from '../MainNavigationView';

const items = [
  { link: '/', icon: 'swap-nav', title: 'Swap' },
  { link: '/explorer', icon: 'Explorer', title: 'Explorer' },
  { link: 'https://docs.atomiq.exchange/', icon: 'book', title: 'Docs', external: true },
];

describe('MainNavigationView', () => {
  it('renders nav items, wallet slot, and menu hooks', () => {
    const html = renderToStaticMarkup(
      <MainNavigationView
        navItems={items}
        walletSlot={<a href="/" className="launch-app">Launch App</a>}
        currentPath="/explorer"
        networkBadge={{ show: false, label: '' }}
      />,
    );
    expect(html).toContain('data-nav-toggle');
    expect(html).toContain('data-nav-collapse');
    expect(html).toContain('Launch App');
    expect(html).toContain('href="/explorer"');
    expect(html).toContain('href="https://docs.atomiq.exchange/"');
  });

  it('marks the current path active', () => {
    const html = renderToStaticMarkup(
      <MainNavigationView navItems={items} walletSlot={null} currentPath="/explorer" networkBadge={{ show: false, label: '' }} />,
    );
    // the explorer item should carry the active class
    expect(html).toMatch(/is-active[^>]*>(?:(?!<\/a>).)*Explorer/s);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/__tests__/MainNavigationView.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `src/components/layout/MainNavigationView.tsx`**

Presentational only. Replaces react-bootstrap `Navbar`/`Collapse`/`NavDropdown` with plain elements styled by the existing `main-navigation__*` and bootstrap `dropdown`/`show` classes, carrying the `navMenu.js` hooks. No context, SDK, env, or state.

```tsx
import * as React from 'react';
import classNames from 'classnames';
import { Badge } from 'react-bootstrap';
import Icon from 'react-icons-kit';
import { angleDown } from 'react-icons-kit/fa/angleDown';

// Menu open/close is driven by public/navMenu.js (loaded via <script> in index.html
// and on static pages) using the data-nav-* hooks below. Do NOT add React state for
// the mobile toggle / dropdown — keep this component presentational.
export type NavItem = {
  link: string;
  icon?: string;
  title: React.ReactNode;
  count?: number;
  external?: boolean;
};

export function MainNavigationView(props: {
  navItems: NavItem[];
  walletSlot: React.ReactNode;
  settingsSlot?: React.ReactNode;
  currentPath: string;
  networkBadge: { show: boolean; label: string };
  onNavClick?: (e: React.MouseEvent) => void;
}) {
  const { navItems, walletSlot, settingsSlot, currentPath, networkBadge, onNavClick } = props;
  const primary = navItems.slice(0, 3);
  const more = navItems.slice(3);

  const renderLink = (item: NavItem, mobileOnly: boolean) => (
    <a
      key={item.link}
      href={item.link}
      onClick={item.external ? undefined : onNavClick}
      className={classNames('main-navigation__nav__item', {
        'is-active': currentPath === item.link,
        'is-mobile': mobileOnly,
      })}
    >
      {item.icon && <span className={`main-navigation__nav__item__icon icon icon-${item.icon}`} />}
      <span className="main-navigation__nav__item__text">{item.title}</span>
      {item.count ? <div className="main-navigation__nav__item__count">{item.count}</div> : null}
    </a>
  );

  return (
    <div className="container max-width-100">
      <div>
        <nav className="main-navigation navbar navbar-expand-lg">
          <a className="navbar-brand" href="/">
            <div className="d-flex flex-row" style={{ fontSize: '1.5rem' }}>
              <img src="/main_logo.png" className="main-navigation__logo is-desktop" alt="atomiq" />
              <img src="/logo192.png" className="main-navigation__logo is-mobile" alt="atomiq" />
              {networkBadge.show && (
                <Badge className="main-navigation__network ms-2 my-0 align-items-center font-smallest" bg="danger">
                  {networkBadge.label}
                </Badge>
              )}
            </div>
          </a>

          <button type="button" className="navbar-toggler" data-nav-toggle aria-label="Toggle navigation">
            <span className="navbar-toggler-icon" />
          </button>

          <div className="main-navigation__wallet">{walletSlot}</div>

          <div className="main-navigation__collapse navbar-collapse" data-nav-collapse role="navigation">
            <div className="main-navigation__nav navbar-nav">
              {primary.map((item) => renderLink(item, false))}
              {more.map((item) => renderLink(item, true))}

              {more.length > 0 && (
                <div className="main-navigation__more dropdown" data-nav-dropdown>
                  <button type="button" className="main-navigation__more__label" data-nav-dropdown-toggle>
                    <span className="main-navigation__more__text">More</span>
                    <Icon icon={angleDown} size={20} className="main-navigation__more__icon" />
                  </button>
                  <div className="dropdown-menu dropdown-menu-dark">
                    {more.map((item) => (
                      <a key={item.link} href={item.link} onClick={item.external ? undefined : onNavClick} className="dropdown-item">
                        {item.icon && <span className={`me-2 main-navigation__item__icon icon icon-${item.icon}`} />}
                        {item.title}
                      </a>
                    ))}
                    {settingsSlot}
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the View test**

Run: `npx vitest run src/components/layout/__tests__/MainNavigationView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Rewrite `src/components/layout/MainNavigation.tsx` as a wrapper**

Keep the existing logic; delete the `FEConstants` import (unused); compute the props and render the View. Settings stays a React-wired button passed via `settingsSlot`.

```tsx
import * as React from 'react';
import { Spinner } from 'react-bootstrap';
import Icon from 'react-icons-kit';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { BitcoinNetwork, SwapType } from '@atomiqlabs/sdk';
import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import { WalletConnector } from '../wallets/WalletConnector';
import { SwapperContext } from '../../context/SwapperContext';
import { useAnchorNavigate } from '../../hooks/navigation/useAnchorNavigate';
import { ChainsConfig } from '../../data/ChainsConfig';
import { SettingsModal } from '../modals/SettingsModal';
import { MainNavigationView, NavItem } from './MainNavigationView';

export function MainNavigation(props: {}) {
  const location = useLocation();
  const [actionRequiredCount, setActionRequiredCount] = React.useState<number>(0);
  const { swapper, syncing, syncingError } = React.useContext(SwapperContext);
  const [settingsOpened, setSettingsOpened] = useState<boolean>(false);
  const anchorNavigate = useAnchorNavigate();

  React.useEffect(() => {
    if (swapper == null) return;
    const updateActionCount = async () => {
      const swaps = await swapper.getActionableSwaps();
      const initiated = swaps.filter((swap) => swap.isInitiated());
      const notTrusted = initiated.filter(
        (swap) =>
          swap.getType() !== SwapType.TRUSTED_FROM_BTC &&
          swap.getType() !== SwapType.TRUSTED_FROM_BTCLN,
      );
      setActionRequiredCount(notTrusted.filter((swap) => swap.requiresAction()).length);
    };
    updateActionCount();
    const listener = () => updateActionCount();
    swapper.on('swapState', listener);
    return () => swapper.off('swapState', listener);
  }, [swapper]);

  const navItems: NavItem[] = [
    { link: '/', icon: 'swap-nav', title: 'Swap' },
    {
      link: '/history',
      icon: 'Swap-History',
      title: (
        <>
          <span>Swap History</span>
          {syncing && <Spinner className="text-white ms-2" size="sm" />}
          {syncingError && <Icon size={20} className="ms-2 flex" icon={ic_warning} />}
        </>
      ),
      count: actionRequiredCount > 0 ? actionRequiredCount : undefined,
    },
    { link: '/explorer', icon: 'Explorer', title: 'Explorer' },
    { link: 'https://docs.atomiq.exchange/', icon: 'book', title: 'Docs', external: true },
    { link: 'https://npmjs.com/@atomiqlabs/sdk', icon: 'embed2', title: 'SDK', external: true },
  ];

  const settingsSlot = (
    <a
      href="/settings"
      onClick={(e) => {
        e.preventDefault();
        setSettingsOpened(true);
      }}
      className="dropdown-item"
    >
      <span className="me-2 main-navigation__item__icon icon icon-cog" />
      Settings
    </a>
  );

  return (
    <>
      <SettingsModal opened={settingsOpened} close={() => setSettingsOpened(false)} />
      <MainNavigationView
        navItems={navItems}
        walletSlot={<WalletConnector />}
        settingsSlot={settingsSlot}
        currentPath={location.pathname}
        networkBadge={{
          show: ChainsConfig.BITCOIN.network !== BitcoinNetwork.MAINNET,
          label: BitcoinNetwork[ChainsConfig.BITCOIN.network],
        }}
        onNavClick={anchorNavigate}
      />
    </>
  );
}
```

- [ ] **Step 6: Add the menu script to `index.html`**

Add immediately before `<script type="module" src="/src/main.tsx"></script>`:
```html
    <script defer src="/navMenu.js"></script>
```

- [ ] **Step 7: Typecheck + run app, verify nav regression**

Run: `npm run typecheck` (expected PASS).
Run: `npm start`, open http://localhost:5173, and verify in the live app:
- Desktop: nav links present, "More" dropdown opens/closes on click, active link highlighted, wallet connector renders, syncing spinner/action-count behave as before.
- Mobile width (<992px): hamburger toggles the menu open/closed, clicking a link closes it, clicking outside closes it.
- Settings item opens the modal.

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/MainNavigationView.tsx src/components/layout/MainNavigation.tsx src/components/layout/__tests__/MainNavigationView.test.tsx index.html
git commit -m "refactor(layout): split MainNavigation into view + wrapper, drive menu via navMenu.js"
```

---

## Task 9: LandingPage component

**Files:**
- Create: `src/seo/LandingPage.tsx`
- Test: `src/seo/__tests__/LandingPage.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/seo/__tests__/LandingPage.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LandingPage } from '../LandingPage';
import type { ResolvedRoute } from '../types';

const route: ResolvedRoute = {
  slug: 'bitcoin-to-usdc-solana',
  from: { key: 'bitcoin', ticker: 'BTC', chainKey: 'bitcoin', chainName: 'Bitcoin', literalId: 'BITCOIN', isBtcSide: true },
  to: { key: 'usdc-solana', ticker: 'USDC', chainKey: 'solana', chainName: 'Solana', sdkPath: ['SOLANA', 'USDC'], isBtcSide: false },
  title: 'Swap BTC to USDC on Solana | Atomiq',
  description: 'desc',
  h1: 'Swap BTC to USDC on Solana',
  intro: 'Swap BTC to USDC on Solana trustlessly.',
  faqs: [{ question: 'What is Solana?', answer: <p>Solana is fast.</p> }],
  tokenInId: 'BITCOIN',
  tokenOutId: 'SOLANA:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  ctaHref: '/?tokenIn=BITCOIN&tokenOut=SOLANA:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
};

describe('LandingPage', () => {
  const html = renderToStaticMarkup(<LandingPage route={route} siblingSlugs={['usdc-solana-to-bitcoin']} />);
  it('renders the h1 and intro', () => {
    expect(html).toContain('<h1');
    expect(html).toContain('Swap BTC to USDC on Solana');
    expect(html).toContain('trustlessly');
  });
  it('renders the CTA deep-link', () => {
    expect(html).toContain(`href="${route.ctaHref}"`);
  });
  it('renders FAQ text expanded (crawlable, no accordion)', () => {
    expect(html).toContain('What is Solana?');
    expect(html).toContain('Solana is fast.');
  });
  it('links to sibling pages and home', () => {
    expect(html).toContain('href="/swap/usdc-solana-to-bitcoin"');
    expect(html).toContain('href="/"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/seo/__tests__/LandingPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `src/seo/LandingPage.tsx`**

Presentational; reuses the shared views. No SDK/context imports.

```tsx
import * as React from 'react';
import { MainNavigationView, NavItem } from '../components/layout/MainNavigationView';
import { SocialFooterView } from '../components/layout/SocialFooterView';
import type { ResolvedRoute } from './types';

const NAV_ITEMS: NavItem[] = [
  { link: '/', icon: 'swap-nav', title: 'Swap' },
  { link: '/explorer', icon: 'Explorer', title: 'Explorer' },
  { link: 'https://docs.atomiq.exchange/', icon: 'book', title: 'Docs', external: true },
];

export function LandingPage(props: { route: ResolvedRoute; siblingSlugs: string[] }) {
  const { route, siblingSlugs } = props;
  return (
    <div className="App d-flex flex-column">
      <MainNavigationView
        navItems={NAV_ITEMS}
        walletSlot={<a href="/" className="btn btn-primary main-navigation__launch">Launch App</a>}
        currentPath={`/swap/${route.slug}`}
        networkBadge={{ show: false, label: '' }}
      />

      <main className="d-flex flex-grow-1 flex-column mt-4 mt-md-5 container text-white text-start">
        <h1 className="page-title">{route.h1}</h1>
        <p className="lead">{route.intro}</p>
        <p>
          <a href={route.ctaHref} className="btn btn-primary btn-lg">
            Swap {route.from.ticker} to {route.to.ticker}
          </a>
        </p>

        <h2 className="mt-5">Why swap with Atomiq</h2>
        <ul>
          <li><strong>Trustless &amp; atomic:</strong> you keep custody throughout; reclaim funds if a swap does not complete.</li>
          <li><strong>No custodial bridge or CEX:</strong> no deposits, no withdrawals, no counterparty risk.</li>
          <li><strong>Bitcoin light-client security:</strong> swaps are verified against Bitcoin proof-of-work.</li>
          <li><strong>RFQ pricing:</strong> competitive market-maker quotes, no AMM slippage.</li>
        </ul>

        <h2 className="mt-5">What you need</h2>
        <p>
          A Bitcoin wallet{route.to.chainKey === 'bitcoin' || route.from.chainKey === 'bitcoin' ? '' : ''} and a {route.from.isBtcSide ? route.to.chainName : route.from.chainName} wallet. Connect both in the app to begin.
        </p>

        <h2 className="mt-5">FAQ</h2>
        {route.faqs.map((faq, i) => (
          <section key={i} className="mb-3">
            <h3>{faq.question}</h3>
            <div>{faq.answer}</div>
          </section>
        ))}

        <h2 className="mt-5">Other swap routes</h2>
        <ul>
          {siblingSlugs.map((slug) => (
            <li key={slug}><a href={`/swap/${slug}`}>{slug.replace(/-/g, ' ')}</a></li>
          ))}
          <li><a href="/">Open the Atomiq app</a></li>
        </ul>
      </main>

      <SocialFooterView isHorizontal={false} />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/seo/__tests__/LandingPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/seo/LandingPage.tsx src/seo/__tests__/LandingPage.test.tsx
git commit -m "feat(seo): static LandingPage component"
```

---

## Task 10: Build generator (`scripts/build-seo.tsx`)

**Files:**
- Create: `scripts/build-seo.tsx`
- (Run after `vite build`)

- [ ] **Step 1: Implement `scripts/build-seo.tsx`**

```tsx
import * as fs from 'fs';
import * as path from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import * as React from 'react';
import { SwapperFactory } from '@atomiqlabs/sdk';
import { SolanaInitializerV2 } from '@atomiqlabs/chain-solana';
import { StarknetInitializer } from '@atomiqlabs/chain-starknet';
import { CitreaInitializer, BotanixInitializer, AlpenInitializer, GoatInitializer } from '@atomiqlabs/chain-evm';
import { buildRoutes } from '../src/seo/routes';
import { composeRoute } from '../src/seo/content';
import { renderHead, ORIGIN } from '../src/seo/seoHead';
import { LandingPage } from '../src/seo/LandingPage';
import type { ResolvedRoute, SeoToken } from '../src/seo/types';

const BUILD = path.resolve('build');

const Factory = new SwapperFactory([
  SolanaInitializerV2, StarknetInitializer, CitreaInitializer, BotanixInitializer, AlpenInitializer, GoatInitializer,
] as any);
const Tokens: any = Factory.Tokens;

function identifier(token: SeoToken): string {
  if (token.literalId) return token.literalId;
  const [chain, name] = token.sdkPath!;
  const t = Tokens[chain]?.[name];
  if (t == null) throw new Error(`Unknown SDK token ${chain}.${name} for ${token.key}`);
  return `${t.chainId}:${t.address}`;
}

function cssHref(): string {
  const manifestPath = path.join(BUILD, '.vite', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entry = manifest['index.html'] ?? Object.values(manifest).find((e: any) => e.isEntry);
  const css = (entry as any)?.css?.[0];
  if (!css) throw new Error('No CSS asset found in Vite manifest');
  return '/' + css;
}

function htmlDocument(route: ResolvedRoute, body: string, css: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="stylesheet" href="${css}" />
    ${renderHead(route)}
  </head>
  <body>
    <div id="root" class="background">${body}</div>
    <script defer src="/navMenu.js"></script>
  </body>
</html>`;
}

function main() {
  const css = cssHref();
  const routes = buildRoutes();
  const composed = routes.map(composeRoute);

  const resolved: ResolvedRoute[] = composed.map((c) => {
    const tokenInId = identifier(c.from);
    const tokenOutId = identifier(c.to);
    return {
      ...c,
      tokenInId,
      tokenOutId,
      ctaHref: `/?tokenIn=${tokenInId}&tokenOut=${tokenOutId}`,
    };
  });

  for (const route of resolved) {
    // siblings: same smart-chain token, other direction + a few same-chain routes
    const siblings = resolved
      .filter((r) => r.slug !== route.slug && (
        r.from.key === route.to.key || r.to.key === route.from.key ||
        r.from.chainKey === route.from.chainKey || r.to.chainKey === route.to.chainKey
      ))
      .slice(0, 8)
      .map((r) => r.slug);

    const body = renderToStaticMarkup(React.createElement(LandingPage, { route, siblingSlugs: siblings }));
    const dir = path.join(BUILD, 'swap', route.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), htmlDocument(route, body, css));
  }

  // sitemap
  const urls = ['/', ...resolved.map((r) => `/swap/${r.slug}`)];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${ORIGIN}${u}</loc></url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(BUILD, 'sitemap.xml'), sitemap);

  console.log(`Generated ${resolved.length} landing pages + sitemap (${urls.length} urls).`);
}

main();
```

- [ ] **Step 2: Build and verify output**

Run (requires `.env` present for `vite build`):
```bash
cp .env.mainnet .env 2>/dev/null || true
npm run build
```
Expected: `vite build` completes, then "Generated N landing pages + sitemap".

- [ ] **Step 3: Inspect a generated page (no JS)**

Run:
```bash
cat build/swap/bitcoin-to-usdc-solana/index.html | grep -o '<h1[^<]*<[^>]*>[^<]*' | head
grep -c 'tokenOut=SOLANA:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' build/swap/bitcoin-to-usdc-solana/index.html
test -f build/sitemap.xml && echo "sitemap OK"
test -f build/navMenu.js && echo "navMenu copied OK"
```
Expected: H1 text present; CTA grep returns `1`; sitemap and navMenu present.

- [ ] **Step 4: Commit**

```bash
git add scripts/build-seo.tsx
git commit -m "feat(seo): build-time static landing page + sitemap generator"
```

---

## Task 11: robots.txt + noindex on utility routes

**Files:**
- Modify: `public/robots.txt`
- Modify: `src/pages/HistoryPage.tsx`, `src/pages/SwapForGas.tsx`, `src/pages/quickscan/QuickScan.tsx`, `src/pages/quickscan/QuickScanExecute.tsx`

- [ ] **Step 1: Rewrite `public/robots.txt`**

```
# https://www.robotstxt.org/robotstxt.html
User-agent: *
Disallow: /history
Disallow: /scan
Disallow: /gas

Sitemap: https://app.atomiq.exchange/sitemap.xml
```

- [ ] **Step 2: Add a tiny `useNoindex` hook**

Create `src/hooks/utils/useNoindex.ts`:
```ts
import { useEffect } from 'react';

export function useNoindex() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);
}
```

- [ ] **Step 3: Call it from each utility page**

In `HistoryPage.tsx`, `SwapForGas.tsx`, `quickscan/QuickScan.tsx`, `quickscan/QuickScanExecute.tsx`, add the import and call at the top of the component body:
```ts
import { useNoindex } from '../hooks/utils/useNoindex'; // adjust relative path for quickscan/*
// ...inside the component:
useNoindex();
```
(For `quickscan/*` the path is `'../../hooks/utils/useNoindex'`.)

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/robots.txt src/hooks/utils/useNoindex.ts src/pages/HistoryPage.tsx src/pages/SwapForGas.tsx src/pages/quickscan/QuickScan.tsx src/pages/quickscan/QuickScanExecute.tsx
git commit -m "feat(seo): robots.txt sitemap/disallows + noindex on utility routes"
```

---

## Task 12: Fix broken FAQ links

**Files:**
- Modify: `src/pages/AboutPage.tsx:45`, `src/pages/SwapForGas.tsx:64`

- [ ] **Step 1: Fix `AboutPage.tsx`**

Change `href="/FAQPage?tabOpen=6"` to `href="/faq?tabOpen=6"`.

- [ ] **Step 2: Fix `SwapForGas.tsx`**

Change `href="/FAQPage?tabOpen=11"` to `href="/faq?tabOpen=11"`.

- [ ] **Step 3: Verify in-app**

Run `npm start`; from About and Swap-for-gas pages, click the FAQ links; expected: navigates to `/faq` and scrolls to the right entry (no 404/NotFound).

- [ ] **Step 4: Commit**

```bash
git add src/pages/AboutPage.tsx src/pages/SwapForGas.tsx
git commit -m "fix: correct broken /FAQPage links to /faq"
```

---

## Task 13: Full verification

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all suites PASS.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Full build + spot-check output**

Run:
```bash
npm run build
ls build/swap | head
echo "page count: $(ls build/swap | wc -l)"
grep -o '<title>[^<]*</title>' build/swap/lightning-to-strk-starknet/index.html
```
Expected: ~60 directories under `build/swap`, each with `index.html`; title reads "Swap Lightning BTC to STRK on Starknet | Atomiq".

- [ ] **Step 4: Serve the build and verify a page renders without the SPA**

Run:
```bash
npx serve -s build -l 5055 &
sleep 1
curl -s http://localhost:5055/swap/bitcoin-to-sol-solana/index.html | grep -c 'Swap BTC to SOL on Solana'
kill %1
```
Expected: returns `1` (content present in raw HTML).

- [ ] **Step 5: Manual app regression (navbar)**

Per Task 8 Step 7 checklist — confirm the live app navbar still works on desktop and mobile.

- [ ] **Step 6: Final commit (if any cleanup)**

```bash
git add -A
git commit -m "chore(seo): verification pass" || echo "nothing to commit"
```

---

## Deployment note (out-of-repo, do not skip)

The Cloudflare SPA rewrite must **exclude `/swap/`** so requests under `/swap/<slug>` are served from the Azure origin (the generated `index.html`) instead of being rewritten to the root `/index.html`. Verify Azure static-website serves `swap/<slug>/index.html` for the directory path `/swap/<slug>`; if it does not, switch the generator to emit flat files (`build/swap/<slug>.html`) and use `/swap/<slug>.html` canonicals. `sitemap.xml`, `robots.txt`, and `navMenu.js` are served as normal origin files.

## Self-review notes

- Spec §5 (view/wrapper split) → Tasks 7, 8. §5.3 (navMenu) → Task 6. §6/§6.1 (landing page + per-route FAQ) → Tasks 4, 9. §7 (CTA deep-link) → Tasks 5, 10 (validated). §8 (token-pair matrix) → Tasks 2, 3. §9 (head/JSON-LD/sitemap/robots/noindex) → Tasks 5, 10, 11. §10 (build pipeline) → Tasks 1, 10. §11 (Cloudflare) → deployment note. §12 (link fixes) → Task 12.
- Deviation from spec §10: build renders via `tsx` (raw Node) — confirmed viable by SDK probe — not Vite SSR. Spec intent preserved.
- Types `SeoToken`/`SeoRoute`/`ComposedRoute`/`ResolvedRoute`/`NavItem` are defined once (Task 1 / Task 8) and reused consistently.
