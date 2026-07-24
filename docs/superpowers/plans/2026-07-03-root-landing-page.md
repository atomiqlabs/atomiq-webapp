# Root Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, JS-free marketing site (a landing page plus the existing `/swap/<slug>` SEO pages) served from the canonical `www.atomiq.exchange`, as a separate build bundle from the SPA app, with a full shared site footer.

**Architecture (per Adam's topology, 2026-07-03):** Cloudflare fronts two Azure Storage static sites. `atomiq.exchange` redirects to `https://www.atomiq.exchange/$path`. `www.atomiq.exchange` serves the marketing bundle (landing + `/swap` pages) and is the canonical domain. `app.atomiq.exchange` serves the SPA, unchanged. The marketing bundle and the app build are two separate outputs from this one repo (shared components). All app-directed links on the marketing site are absolute to `https://app.atomiq.exchange`; all marketing-internal links are relative.

**Tech Stack:** React 18 + `react-dom/server` `renderToStaticMarkup`, TypeScript, Vite, `tsx` build script, Vitest + jsdom, Bootstrap + Tailwind utility classes.

## Global Constraints

- Canonical marketing origin is `https://www.atomiq.exchange` (the `ORIGIN` constant). The app/deep-link origin is `https://app.atomiq.exchange` (`APP_ORIGIN`, defined in `homeContent.ts`).
- No app routing changes; the SPA stays at `app.atomiq.exchange`. This plan touches only `src/seo/*`, `src/components/layout/*`, `scripts/build-seo.tsx`, `public/robots.txt`, and their tests.
- The landing and `/swap` pages ship no React runtime; plain anchors carry styling.
- App-directed links (landing + `/swap` pages): absolute to `https://app.atomiq.exchange`. Marketing-internal links (landing↔`/swap`, `/swap`↔sibling, footer routes): relative.
- Two build outputs: the SPA in `build/` (via `vite build`), the marketing bundle in `dist-marketing/` (via `build:seo`). `build:seo` writes only to `dist-marketing/` and never into `build/`.
- Do not change the app's in-app footer. The full footer is a NEW `SiteFooterView`; the existing social-only `SocialFooterView` stays and is embedded inside it.
- Public-facing copy uses no em dashes or en dashes (brand voice rule): commas, periods, colons, parentheses, or plain hyphens only.
- Tests use Vitest with `renderToStaticMarkup` + string assertions. Run with `npx vitest run <path>`.
- Commit messages are plain, with no `Co-Authored-By` or AI-attribution trailer.

---

### Task 1: Green the pre-existing failing tests (baseline)

Two tests from the squashed PR #56 are stale and fail on `develop`. Fix them so the suite is green before building on top. Worth cherry-picking to `develop`.

**Files:**
- Modify: `src/seo/__tests__/content.test.tsx:11`
- Modify: `src/seo/__tests__/LandingPage.test.tsx:21` (and add a sibling fixture)

**Interfaces:**
- Consumes: `LandingPage(props: { route: ResolvedRoute; siblings: ResolvedRoute[] })`; `composeRoute` producing titles suffixed `| atomiq.exchange`.
- Produces: nothing new.

- [ ] **Step 1: Run the suite to observe the two failures**

Run: `npx vitest run src/seo src/components/layout`
Expected: FAIL — `content.test.tsx` ("expected '… | atomiq.exchange' to be '… | Atomiq'") and `LandingPage.test.tsx` (render crash on `siblings` undefined).

- [ ] **Step 2: Fix the stale title assertion**

In `src/seo/__tests__/content.test.tsx`, change line 11 from:

```tsx
    expect(c.title).toBe('Swap BTC to USDC on Solana | Atomiq');
```

to:

```tsx
    expect(c.title).toBe('Swap BTC to USDC on Solana | atomiq.exchange');
```

- [ ] **Step 3: Fix the stale `LandingPage` prop**

In `src/seo/__tests__/LandingPage.test.tsx`, add a sibling fixture right after the `route` fixture (before the `describe`):

```tsx
const sibling: ResolvedRoute = {
  slug: 'usdc-solana-to-bitcoin',
  from: route.to,
  to: route.from,
  title: 'Swap USDC on Solana to BTC | atomiq.exchange',
  description: 'desc',
  h1: 'Swap USDC on Solana to BTC',
  intro: 'intro',
  faqs: [],
  tokenInId: route.to.tokenId,
  tokenOutId: route.from.tokenId,
  ctaHref: 'https://app.atomiq.exchange/?tokenIn=SOLANA:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&tokenOut=BITCOIN',
};
```

Then change the render line from:

```tsx
  const html = renderToStaticMarkup(<LandingPage route={route} siblingSlugs={['usdc-solana-to-bitcoin']} />);
```

to:

```tsx
  const html = renderToStaticMarkup(<LandingPage route={route} siblings={[sibling]} />);
```

- [ ] **Step 4: Run the suite to verify green**

Run: `npx vitest run src/seo src/components/layout`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/seo/__tests__/content.test.tsx src/seo/__tests__/LandingPage.test.tsx
git commit -m "test(seo): fix stale content + LandingPage tests to match current code"
```

---

### Task 2: Home content module

All homepage copy and derived data in one module. Also defines `APP_ORIGIN`, the single source for the app/deep-link origin.

**Files:**
- Create: `src/seo/homeContent.ts`
- Test: `src/seo/__tests__/homeContent.test.ts`

**Interfaces:**
- Consumes: `BTC_SIDE`, `SMART_CHAIN_TOKENS` from `./tokens`; `buildRoutes` from `./routes`; `BASE_FAQS` from `./baseFaqs`; `FaqItem` from `./types`.
- Produces: `APP_ORIGIN: string`; `DOCS_URL: string`; `HERO: { headline, subhead, primaryCta:{label,href}, secondaryCta:{label,href} }`; `BENEFITS: {title,text}[]`; `ESCROW_HEADING: string`; `ESCROW_STEPS: string[]`; `SUPPORTED_CHAINS: string[]`; `POPULAR_ROUTES: {slug,label}[]`; `HOME_FAQS: FaqItem[]`.

- [ ] **Step 1: Write the failing test**

Create `src/seo/__tests__/homeContent.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  APP_ORIGIN, HERO, BENEFITS, ESCROW_STEPS, SUPPORTED_CHAINS, POPULAR_ROUTES, HOME_FAQS,
} from '../homeContent';
import { buildRoutes } from '../routes';

describe('homeContent', () => {
  it('APP_ORIGIN is the app subdomain and the hero CTA points at it', () => {
    expect(APP_ORIGIN).toBe('https://app.atomiq.exchange');
    expect(HERO.primaryCta.href).toBe('https://app.atomiq.exchange/');
  });
  it('has four benefits and four escrow steps', () => {
    expect(BENEFITS).toHaveLength(4);
    expect(ESCROW_STEPS).toHaveLength(4);
  });
  it('supported chains include Bitcoin and Solana', () => {
    expect(SUPPORTED_CHAINS).toContain('Bitcoin');
    expect(SUPPORTED_CHAINS).toContain('Solana');
  });
  it('popular routes are non-empty and all resolve to real slugs', () => {
    const valid = new Set(buildRoutes().map((r) => r.slug));
    expect(POPULAR_ROUTES.length).toBeGreaterThan(0);
    for (const r of POPULAR_ROUTES) expect(valid.has(r.slug)).toBe(true);
  });
  it('home FAQs reuse the three base FAQs', () => {
    expect(HOME_FAQS).toHaveLength(3);
  });
  it('copy uses no em or en dashes', () => {
    const blob = JSON.stringify([HERO, BENEFITS, ESCROW_STEPS]);
    expect(blob).not.toMatch(/[–—]/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/seo/__tests__/homeContent.test.ts`
Expected: FAIL — cannot resolve `../homeContent`.

- [ ] **Step 3: Write the module**

Create `src/seo/homeContent.ts`:

```ts
import type { FaqItem } from './types';
import { BASE_FAQS } from './baseFaqs';
import { BTC_SIDE, SMART_CHAIN_TOKENS } from './tokens';
import { buildRoutes } from './routes';

// The app / deep-link origin. The marketing site lives on www.atomiq.exchange (see seoHead ORIGIN);
// every app-directed link is absolute to this subdomain.
export const APP_ORIGIN = 'https://app.atomiq.exchange';
export const DOCS_URL = 'https://docs.atomiq.exchange/';

export const HERO = {
  headline: 'Swap fully trustlessly between Bitcoin & other chains',
  subhead:
    'Unlock fully trustless swaps between Bitcoin and other chains. Enjoy secure, efficient transactions with no intermediaries, fully non-custodial.',
  primaryCta: { label: 'Swap now', href: `${APP_ORIGIN}/` },
  secondaryCta: { label: 'Read Docs', href: DOCS_URL },
};

export const BENEFITS: { title: string; text: string }[] = [
  { title: 'Trustless & atomic', text: 'You keep custody the entire time and can always reclaim your funds if a swap does not complete.' },
  { title: 'No bridge or CEX', text: 'No custodial bridge and no centralized exchange: no deposits, no withdrawals, no counterparty risk.' },
  { title: 'Bitcoin-secured', text: 'Swaps are verified against Bitcoin proof-of-work via an on-chain Bitcoin light client.' },
  { title: 'RFQ pricing', text: 'Competitive quotes straight from market makers, with no AMM pools and no slippage.' },
];

export const ESCROW_HEADING = "The atomiq escrow, secured by Bitcoin's proof of work";
export const ESCROW_STEPS: string[] = [
  'Tokens are locked in a smart contract vault on the smart chain (e.g. Solana).',
  'To unlock the vault and get access to the tokens, the counterparty must send a valid Bitcoin transaction.',
  'The smart contract verifies the transaction using a Bitcoin light client, which saves Bitcoin transaction data on the smart chain.',
  'If the Bitcoin payment is confirmed, the vault releases the funds. If not, the trade does not go through and you receive your tokens back.',
];

// Unique chain names in display order (BTC side first). Derived so it cannot drift.
export const SUPPORTED_CHAINS: string[] = Array.from(
  new Set([...BTC_SIDE, ...SMART_CHAIN_TOKENS].map((t) => t.chainName)),
);

export type PopularRoute = { slug: string; label: string };
// First eight BTC -> smart-chain routes, straight from buildRoutes() so every slug is real.
export const POPULAR_ROUTES: PopularRoute[] = buildRoutes()
  .filter((r) => r.from.key === 'bitcoin' && !r.to.isBtcSide)
  .slice(0, 8)
  .map((r) => ({ slug: r.slug, label: `BTC to ${r.to.ticker} on ${r.to.chainName}` }));

export const HOME_FAQS: FaqItem[] = BASE_FAQS;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/seo/__tests__/homeContent.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/seo/homeContent.ts src/seo/__tests__/homeContent.test.ts
git commit -m "feat(seo): home content module for the root landing page"
```

---

### Task 3: SiteFooterView component

The full site footer: link columns mirroring atomiqlabs.com, a curated popular-routes group, and the socials row. Reused by the landing and the `/swap` pages, which share the www origin, so all route links are relative and there is no `appOrigin` prop.

**Files:**
- Create: `src/components/layout/SiteFooterView.tsx`
- Test: `src/components/layout/__tests__/SiteFooterView.test.tsx`

**Interfaces:**
- Consumes: `SocialFooterView` from `./SocialFooterView`; `POPULAR_ROUTES` from `../../seo/homeContent`.
- Produces: `SiteFooterView(props: { noTooltip?: boolean })`.

- [ ] **Step 1: Write the failing test**

Create `src/components/layout/__tests__/SiteFooterView.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SiteFooterView } from '../SiteFooterView';

describe('SiteFooterView', () => {
  const html = renderToStaticMarkup(<SiteFooterView />);
  it('renders link columns, socials, and copyright', () => {
    expect(html).toContain('Quick Links');
    expect(html).toContain('Resources');
    expect(html).toContain('Legal');
    expect(html).toContain('Company');
    expect(html).toContain('href="https://docs.atomiq.exchange/"');
    expect(html).toContain('href="https://twitter.com/atomiqlabs"'); // from SocialFooterView
    expect(html).toContain('All rights reserved');
  });
  it('uses relative /swap route links (same www origin)', () => {
    expect(html).toMatch(/href="\/swap\/[a-z0-9-]+"/);
    expect(html).not.toContain('href="https://app.atomiq.exchange/swap/');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/__tests__/SiteFooterView.test.tsx`
Expected: FAIL — cannot resolve `../SiteFooterView`.

- [ ] **Step 3: Write the component**

Create `src/components/layout/SiteFooterView.tsx`:

```tsx
import * as React from 'react';
import { SocialFooterView } from './SocialFooterView';
import { POPULAR_ROUTES } from '../../seo/homeContent';

type FooterLink = { label: string; href: string };
type FooterColumn = { title: string; links: FooterLink[] };

// Column links mirror the atomiqlabs.com footer; all are external, so they carry absolute URLs.
const COLUMNS: FooterColumn[] = [
  {
    title: 'Quick Links',
    links: [
      { label: 'About us', href: 'https://www.atomiqlabs.com/about' },
      { label: 'Contact us', href: 'mailto:info@atomiqlabs.com' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'FAQs', href: 'https://www.atomiqlabs.com/resources#faq' },
      { label: 'Docs', href: 'https://docs.atomiq.exchange/' },
      { label: 'Audits', href: 'https://github.com/atomiqlabs/atomiq-readme/tree/main/audits' },
      { label: 'SDK', href: 'https://npmjs.com/@atomiqlabs/sdk' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: 'https://www.atomiqlabs.com/terms-of-service' },
      { label: 'Privacy Policy', href: 'https://www.atomiqlabs.com/privacy-cookie-policy' },
      { label: 'Cookie Policy', href: 'https://www.atomiqlabs.com/privacy-cookie-policy' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'The Lab', href: 'https://www.atomiqlabs.com/about' },
      { label: 'Meet the Team', href: 'https://www.atomiqlabs.com/about#team' },
    ],
  },
];

export function SiteFooterView(props: { noTooltip?: boolean }) {
  return (
    <footer className="site-footer text-white container pt-5 pb-4">
      <div className="row">
        {COLUMNS.map((col) => (
          <div className="col-6 col-md-3 col-lg-2 pb-3" key={col.title}>
            <h3 className="fs-6 fw-semibold mb-3">{col.title}</h3>
            <ul className="list-unstyled mb-0">
              {col.links.map((l) => (
                <li className="mb-2" key={l.label}>
                  <a href={l.href} className="text-white text-opacity-75 text-decoration-none" target="_blank" rel="noreferrer">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="col-6 col-md-3 col-lg-2 pb-3">
          <h3 className="fs-6 fw-semibold mb-3">Popular routes</h3>
          <ul className="list-unstyled mb-0">
            {POPULAR_ROUTES.map((r) => (
              <li className="mb-2" key={r.slug}>
                <a href={`/swap/${r.slug}`} className="text-white text-opacity-75 text-decoration-none">
                  {r.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="d-flex flex-column flex-md-row align-items-center justify-content-between border-top border-secondary border-opacity-25 pt-3 mt-3">
        <SocialFooterView isHorizontal noTooltip={props.noTooltip} />
        <div className="site-footer__copyright text-white text-opacity-50 mt-3 mt-md-0">
          atomiq labs. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/layout/__tests__/SiteFooterView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/SiteFooterView.tsx src/components/layout/__tests__/SiteFooterView.test.tsx
git commit -m "feat(layout): full SiteFooterView with columns, routes, and socials"
```

---

### Task 4: Flip canonical origin to www + add the landing head builder

Move the canonical marketing origin to `www.atomiq.exchange` and add the homepage head builder. `renderHead(route)` already uses `ORIGIN`, so its `/swap` canonical, sitemap loc, and OG image move to www with only the constant change.

**Files:**
- Modify: `src/seo/seoHead.ts`
- Modify: `src/seo/__tests__/seoHead.test.ts`

**Interfaces:**
- Consumes: existing `esc`, `OG_IMAGE`, `ATOMIQ_LABS_PAGE` in `seoHead.ts`.
- Produces: `ORIGIN` (value now `https://www.atomiq.exchange`); `renderLandingHead(): string`.

- [ ] **Step 1: Update the tests (they will fail)**

In `src/seo/__tests__/seoHead.test.ts`, change the import line:

```ts
import { renderHead, ORIGIN } from '../seoHead';
```

to:

```ts
import { renderHead, renderLandingHead, ORIGIN } from '../seoHead';
```

Add a `www` assertion inside the existing `describe('renderHead', ...)` block:

```ts
  it('canonicalizes to the www marketing origin', () => {
    expect(ORIGIN).toBe('https://www.atomiq.exchange');
  });
```

Then append this block at the end of the file:

```ts
describe('renderLandingHead', () => {
  const head = renderLandingHead();
  it('uses the www canonical origin at the root', () => {
    expect(head).toContain(`<link rel="canonical" href="${ORIGIN}/"/>`);
  });
  it('emits a title and description', () => {
    expect(head).toContain('<title>');
    expect(head).toContain('<meta name="description"');
  });
  it('emits Organization + WebSite JSON-LD, no route schema', () => {
    expect(head).toContain('"@type":"Organization"');
    expect(head).toContain('"@type":"WebSite"');
    expect(head).not.toContain('WebApplication');
    expect(head).not.toContain('BreadcrumbList');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/seo/__tests__/seoHead.test.ts`
Expected: FAIL — `ORIGIN` is still the app subdomain and `renderLandingHead` is not exported.

- [ ] **Step 3: Flip ORIGIN and add the builder**

In `src/seo/seoHead.ts`, change:

```ts
export const ORIGIN = 'https://app.atomiq.exchange';
```

to:

```ts
export const ORIGIN = 'https://www.atomiq.exchange';
```

Then add this function at the end of the file:

```ts
export function renderLandingHead(): string {
  const title = 'atomiq.exchange | Trustless cross-chain swaps for Bitcoin';
  const description =
    'Swap trustlessly between Bitcoin and other blockchains with atomiq.exchange. Our cross-chain DEX uses atomic swaps for secure, non-custodial trading with no intermediaries.';
  const url = `${ORIGIN}/`;
  const t = esc(title);
  const d = esc(description);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', name: 'atomiq labs', url: ATOMIQ_LABS_PAGE, logo: OG_IMAGE },
      { '@type': 'WebSite', name: 'atomiq.exchange', url },
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/seo/__tests__/seoHead.test.ts`
Expected: PASS (the existing `${ORIGIN}/swap/...` canonical assertion now resolves to www).

- [ ] **Step 5: Commit**

```bash
git add src/seo/seoHead.ts src/seo/__tests__/seoHead.test.ts
git commit -m "feat(seo): canonical www origin + renderLandingHead for the landing"
```

---

### Task 5: Point LandingPage links at the app + use SiteFooterView

The `/swap` pages now live on the www marketing domain, so their app-directed links must be absolute to `APP_ORIGIN`. Also adopt the full footer and the shared `BENEFITS`. Prop signature is unchanged.

**Files:**
- Modify: `src/seo/LandingPage.tsx`
- Modify: `src/seo/__tests__/LandingPage.test.tsx`

**Interfaces:**
- Consumes: `SiteFooterView` from `../components/layout/SiteFooterView`; `BENEFITS`, `APP_ORIGIN` from `./homeContent`.
- Produces: unchanged `LandingPage(props: { route: ResolvedRoute; siblings: ResolvedRoute[] })`.

- [ ] **Step 1: Add failing assertions**

In `src/seo/__tests__/LandingPage.test.tsx`, add these tests inside the `describe('LandingPage', ...)` block:

```tsx
  it('renders the full site footer', () => {
    expect(html).toContain('Quick Links');
    expect(html).toContain('All rights reserved');
  });
  it('points app links at the app subdomain (absolute)', () => {
    expect(html).toContain('href="https://app.atomiq.exchange/"');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/seo/__tests__/LandingPage.test.tsx`
Expected: FAIL — current footer has no "Quick Links" and app links are still relative `/`.

- [ ] **Step 3: Update LandingPage**

In `src/seo/LandingPage.tsx`:

Replace the top imports (lines 1-3):

```tsx
import { MainNavigationView, NavItem } from '../components/layout/MainNavigationView';
import { SocialFooterView } from '../components/layout/SocialFooterView';
import type {ResolvedRoute, SeoToken} from './types';
```

with:

```tsx
import { MainNavigationView, NavItem } from '../components/layout/MainNavigationView';
import { SiteFooterView } from '../components/layout/SiteFooterView';
import { BENEFITS, APP_ORIGIN } from './homeContent';
import type {ResolvedRoute, SeoToken} from './types';
```

Delete the local `BENEFITS` block (the `const BENEFITS: { title: string; text: string }[] = [ ... ];` array).

Change the first two `NAV_ITEMS` entries from:

```tsx
  { link: '/', icon: 'swap-nav', title: 'Swap' },
  { link: '/explorer', icon: 'Explorer', title: 'Explorer' },
```

to:

```tsx
  { link: `${APP_ORIGIN}/`, icon: 'swap-nav', title: 'Swap' },
  { link: `${APP_ORIGIN}/explorer`, icon: 'Explorer', title: 'Explorer' },
```

Change the "Launch App" button href from:

```tsx
            <a href="/" className={LAUNCH_CLASS}>
              Launch App
            </a>
```

to:

```tsx
            <a href={`${APP_ORIGIN}/`} className={LAUNCH_CLASS}>
              Launch App
            </a>
```

Change the "Open the atomiq.exchange app" link at the end of the "Other swap routes" list from:

```tsx
            <li className="mt-2">
              <a href="/" className="text-white">
                Open the atomiq.exchange app
              </a>
            </li>
```

to:

```tsx
            <li className="mt-2">
              <a href={`${APP_ORIGIN}/`} className="text-white">
                Open the atomiq.exchange app
              </a>
            </li>
```

Replace the footer element near the end:

```tsx
      <SocialFooterView isHorizontal={false} noTooltip />
```

with:

```tsx
      <SiteFooterView noTooltip />
```

- [ ] **Step 4: Run the suite to verify green**

Run: `npx vitest run src/seo src/components/layout`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/seo/LandingPage.tsx src/seo/__tests__/LandingPage.test.tsx
git commit -m "refactor(seo): LandingPage links to app subdomain + uses SiteFooterView"
```

---

### Task 6: LandingHome component

The homepage: nav (Launch App + app-absolute Swap/Explorer), hero, supported chains, benefits, escrow steps, popular routes (relative `/swap`), FAQ accordion, and the full footer. JS-free.

**Files:**
- Create: `src/seo/LandingHome.tsx`
- Test: `src/seo/__tests__/LandingHome.test.tsx`

**Interfaces:**
- Consumes: `MainNavigationView`, `NavItem` from `../components/layout/MainNavigationView`; `SiteFooterView` from `../components/layout/SiteFooterView`; from `./homeContent`: `APP_ORIGIN`, `HERO`, `BENEFITS`, `ESCROW_HEADING`, `ESCROW_STEPS`, `SUPPORTED_CHAINS`, `POPULAR_ROUTES`, `HOME_FAQS`.
- Produces: `LandingHome()` (no props).

- [ ] **Step 1: Write the failing test**

Create `src/seo/__tests__/LandingHome.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LandingHome } from '../LandingHome';
import { APP_ORIGIN, HOME_FAQS } from '../homeContent';

describe('LandingHome', () => {
  const html = renderToStaticMarkup(<LandingHome />);
  it('renders exactly one h1 with the hero headline', () => {
    expect((html.match(/<h1/g) || []).length).toBe(1);
    expect(html).toContain('Swap fully trustlessly between Bitcoin');
  });
  it('points the primary CTA, Launch App, and Swap nav at the app subdomain', () => {
    expect(html).toContain(`href="${APP_ORIGIN}/"`);
  });
  it('links popular routes with relative /swap paths', () => {
    expect(html).toMatch(/href="\/swap\/[a-z0-9-]+"/);
    expect(html).not.toContain(`href="${APP_ORIGIN}/swap/`);
  });
  it('renders one FAQ <details> per base FAQ', () => {
    expect((html.match(/<details/g) || []).length).toBe(HOME_FAQS.length);
  });
  it('renders the full site footer', () => {
    expect(html).toContain('Quick Links');
    expect(html).toContain('All rights reserved');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/seo/__tests__/LandingHome.test.tsx`
Expected: FAIL — cannot resolve `../LandingHome`.

- [ ] **Step 3: Write the component**

Create `src/seo/LandingHome.tsx`:

```tsx
import { MainNavigationView, NavItem } from '../components/layout/MainNavigationView';
import { SiteFooterView } from '../components/layout/SiteFooterView';
import {
  APP_ORIGIN, HERO, BENEFITS, ESCROW_HEADING, ESCROW_STEPS, SUPPORTED_CHAINS, POPULAR_ROUTES, HOME_FAQS,
} from './homeContent';

// Swap/Explorer navigate to the app (absolute, cross-subdomain); Docs/SDK/legal are external.
const NAV_ITEMS: NavItem[] = [
  { link: `${APP_ORIGIN}/`, icon: 'swap-nav', title: 'Swap' },
  { link: `${APP_ORIGIN}/explorer`, icon: 'Explorer', title: 'Explorer' },
  { link: 'https://docs.atomiq.exchange/', icon: 'book', title: 'Docs', external: true },
  { link: 'https://npmjs.com/@atomiqlabs/sdk', icon: 'embed2', title: 'SDK', external: true },
  { link: 'https://www.atomiqlabs.com/terms-of-service', icon: 'file-text', title: 'Terms of Service', external: true },
  { link: 'https://www.atomiqlabs.com/privacy-cookie-policy', icon: 'user', title: 'Privacy Policy', external: true },
];

// Copied from LandingPage.tsx so the landing buttons match the app's primary CTA look.
const CTA_CLASS =
  'btn base-button base-button--primary base-button--large w-100 d-flex align-items-center justify-content-center text-white text-decoration-none';
const LAUNCH_CLASS =
  'btn base-button base-button--primary base-button--smaller d-inline-flex align-items-center text-white text-decoration-none';
const CARD_CLASS = 'bg-white/10 rounded-2xl p-4';

export function LandingHome() {
  return (
    <div className="App d-flex flex-column">
      <MainNavigationView
        navItems={NAV_ITEMS}
        walletSlot={
          <div className="d-flex justify-content-end">
            <a href={`${APP_ORIGIN}/`} className={LAUNCH_CLASS}>
              Launch App
            </a>
          </div>
        }
        currentPath="/"
        networkBadge={{ show: false, label: '' }}
        noTooltip
      />

      <div className="flex-fill text-white container text-start mt-4 mt-md-5 mb-5">
        <h1 className="page-title">{HERO.headline}</h1>

        <div className={`${CARD_CLASS} mb-3`}>
          <p className="mb-4">{HERO.subhead}</p>
          <a href={HERO.primaryCta.href} className={CTA_CLASS}>
            {HERO.primaryCta.label}
          </a>
          <a href={HERO.secondaryCta.href} className="d-inline-block mt-3 text-white" target="_blank" rel="noreferrer">
            {HERO.secondaryCta.label}
          </a>
        </div>

        <h2 className="page-title mt-5">Supported chains</h2>
        <div className={`${CARD_CLASS} mb-3`}>
          <ul className="d-flex flex-wrap gap-3 mb-0 list-unstyled">
            {SUPPORTED_CHAINS.map((c) => (
              <li key={c} className="fw-semibold">{c}</li>
            ))}
          </ul>
        </div>

        <h2 className="page-title mt-5">Why swap with Atomiq</h2>
        <div className="row">
          {BENEFITS.map((b) => (
            <div className="col-12 col-md-6 col-lg-3 pb-3" key={b.title}>
              <div className={`${CARD_CLASS} height-100`}>
                <h3 className="fs-5 fw-semibold mb-2">{b.title}</h3>
                <p className="mb-0 text-white text-opacity-75">{b.text}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="page-title mt-5">{ESCROW_HEADING}</h2>
        <div className="row">
          {ESCROW_STEPS.map((step, i) => (
            <div className="col-12 col-md-6 col-lg-3 pb-3" key={i}>
              <div className={`${CARD_CLASS} height-100`}>
                <div className="fs-4 fw-bold mb-2">{i + 1}</div>
                <p className="mb-0 text-white text-opacity-75">{step}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="page-title mt-5">Popular swap routes</h2>
        <div className={`${CARD_CLASS} mb-3`}>
          <ul className="mb-0 ps-3 d-flex flex-column gap-1">
            {POPULAR_ROUTES.map((r) => (
              <li key={r.slug}>
                <a href={`/swap/${r.slug}`} className="text-white">
                  {r.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <h2 className="page-title mt-5">FAQ</h2>
        <div className="seo-faqs">
          {HOME_FAQS.map((faq, i) => (
            <details key={i} open={i === 0}>
              <summary>
                <span className="seo-faq-number">{i + 1}.</span>
                <span>{faq.question}</span>
                <span className="seo-faq-arrow icon icon-caret-down" aria-hidden="true" />
              </summary>
              <div className="seo-faq-answer faq-answer">{faq.answer}</div>
            </details>
          ))}
        </div>
      </div>

      <SiteFooterView noTooltip />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/seo/__tests__/LandingHome.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/seo/LandingHome.tsx src/seo/__tests__/LandingHome.test.tsx
git commit -m "feat(seo): LandingHome component for the marketing landing page"
```

---

### Task 7: Marketing bundle in build-seo + app robots cleanup + full build

Rework `build-seo` into the marketing-bundle builder: render the landing + `/swap` pages into `dist-marketing/` (never into `build/`), absolute app `ctaHref`, one www sitemap + robots, and copied assets so the bundle is self-contained. Then fix the app's stale robots sitemap reference (the app stays indexable) and verify with a real build. No unit test (filesystem IO, matching the existing pattern).

**Files:**
- Modify: `scripts/build-seo.tsx` (full replacement)
- Modify: `public/robots.txt`

**Interfaces:**
- Consumes: `buildRoutes`, `composeRoute`, `renderHead`, `renderLandingHead`, `ORIGIN`, `APP_ORIGIN`, `LandingPage`, `LandingHome`, `ResolvedRoute`.
- Produces: `dist-marketing/index.html`, `dist-marketing/swap/<slug>/index.html`, `dist-marketing/sitemap.xml`, `dist-marketing/robots.txt`, copied `dist-marketing/assets` + public files.

- [ ] **Step 1: Replace `scripts/build-seo.tsx`**

Replace the entire contents of `scripts/build-seo.tsx` with:

```tsx
import * as fs from 'fs';
import * as path from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import * as React from 'react';
import { buildRoutes } from '../src/seo/routes';
import { composeRoute } from '../src/seo/content';
import { renderHead, renderLandingHead, ORIGIN } from '../src/seo/seoHead';
import { APP_ORIGIN } from '../src/seo/homeContent';
import { LandingPage } from '../src/seo/LandingPage';
import { LandingHome } from '../src/seo/LandingHome';
import type { ResolvedRoute } from '../src/seo/types';

const BUILD = path.resolve('build');          // vite app build: read manifest + assets from here
const OUT = path.resolve('dist-marketing');   // marketing bundle: write everything here

function cssHref(): string {
  const manifestPath = path.join(BUILD, '.vite', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entry = manifest['index.html'] ?? Object.values(manifest).find((e: any) => e.isEntry);
  // single-entry build: only one CSS chunk is expected
  const css = (entry as any)?.css?.[0];
  if (!css) throw new Error('No CSS asset found in Vite manifest');
  return '/' + css;
}

// Rank candidate sibling routes by relevance so the internal links reinforce the
// most useful relationships first (exact reverse, then same token, then same chain).
function siblingScore(r: ResolvedRoute, route: ResolvedRoute): number {
  if (r.from.key === route.to.key && r.to.key === route.from.key) return 0; // exact reverse
  if (r.from.key === route.to.key || r.to.key === route.from.key) return 1; // shares a token
  if (r.to.chainKey === route.to.chainKey && r.from.chainKey === route.from.chainKey) return 2;
  if (r.to.chainKey === route.to.chainKey || r.from.chainKey === route.from.chainKey) return 3;
  return 4;
}

function htmlDocument(headHtml: string, body: string, css: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="stylesheet" href="${css}" />
    ${headHtml}
  </head>
  <body>
    <div id="root" class="background">${body}</div>
    <script defer src="/navMenu.js"></script>
  </body>
</html>`;
}

// Copy the static assets the prerendered pages reference so the marketing bundle serves
// standalone from its own storage account, with no dependency on the app origin.
function copyAssets(): void {
  fs.cpSync(path.join(BUILD, 'assets'), path.join(OUT, 'assets'), { recursive: true });
  if (fs.existsSync(path.join(BUILD, 'icons'))) {
    fs.cpSync(path.join(BUILD, 'icons'), path.join(OUT, 'icons'), { recursive: true });
  }
  for (const f of ['favicon.ico', 'main_logo.png', 'logo192.png', 'logo512.png', 'navMenu.js']) {
    const src = path.join(BUILD, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT, f));
  }
}

function main() {
  const css = cssHref();
  console.log('Using CSS asset:', css);

  const routes = buildRoutes();
  const composed = routes.map(composeRoute);

  const resolved: ResolvedRoute[] = composed.map((c) => ({
    ...c,
    tokenInId: c.from.tokenId,
    tokenOutId: c.to.tokenId,
    // App deep-link is absolute: the swap pages live on www, the app on app.atomiq.exchange.
    ctaHref: `${APP_ORIGIN}/?tokenIn=${c.from.tokenId}&tokenOut=${c.to.tokenId}`,
  }));

  fs.mkdirSync(OUT, { recursive: true });

  for (const route of resolved) {
    const siblings = resolved
      .filter((r) => r.slug !== route.slug && (
        r.from.key === route.to.key || r.to.key === route.from.key ||
        r.from.chainKey === route.from.chainKey || r.to.chainKey === route.to.chainKey
      ))
      .sort((a, b) => siblingScore(a, route) - siblingScore(b, route))
      .slice(0, 8);

    const body = renderToStaticMarkup(React.createElement(LandingPage, { route, siblings }));
    const dir = path.join(OUT, 'swap', route.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), htmlDocument(renderHead(route), body, css));
  }

  // Landing page at the marketing root.
  const landingBody = renderToStaticMarkup(React.createElement(LandingHome));
  fs.writeFileSync(path.join(OUT, 'index.html'), htmlDocument(renderLandingHead(), landingBody, css));

  // One sitemap + robots on the canonical www origin.
  const urls = ['/', ...resolved.map((r) => `/swap/${r.slug}`)];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${ORIGIN}${u}</loc></url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap);
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`);

  copyAssets();

  console.log(`Generated ${resolved.length} swap pages + landing + sitemap/robots into dist-marketing/.`);
}

main();
```

- [ ] **Step 2: Fix the app's stale sitemap reference (keep it indexable)**

The app subdomain should stay in search, so do NOT disallow it. Only drop the stale `Sitemap: https://app.atomiq.exchange/sitemap.xml` line (that sitemap now lives on www). Edit `public/robots.txt` to remove that `Sitemap:` line, leaving:

```
# https://www.robotstxt.org/robotstxt.html
User-agent: *
Disallow: /history
Disallow: /scan
Disallow: /gas
```

- [ ] **Step 3: Confirm the whole unit-test suite still passes**

Run: `npx vitest run`
Expected: PASS — all test files green.

- [ ] **Step 4: Run a full build and verify both bundles**

Prerequisite: dependencies installed (`npm install --force` if needed) and an env file present (`cp .env.mainnet .env` if `.env` is missing). Then:

Run: `npm run build`
Expected: `vite build` writes `build/`, then build-seo prints `Generated N swap pages + landing + sitemap/robots into dist-marketing/.`

Verify the marketing bundle:

Run:
```bash
test -f dist-marketing/index.html \
 && grep -c "Swap fully trustlessly between Bitcoin" dist-marketing/index.html \
 && grep -c 'rel="canonical" href="https://www.atomiq.exchange/"' dist-marketing/index.html \
 && test -f dist-marketing/swap/bitcoin-to-sol-solana/index.html \
 && grep -c 'href="https://app.atomiq.exchange/?tokenIn=' dist-marketing/swap/bitcoin-to-sol-solana/index.html \
 && test -f dist-marketing/sitemap.xml \
 && test -d dist-marketing/assets
```
Expected: file/dir checks pass and each grep returns `1` (or more).

Verify the app bundle no longer contains swap pages:

Run: `test ! -d build/swap && echo "app bundle clean"`
Expected: prints `app bundle clean`.

- [ ] **Step 5: Eyeball the rendered pages (manual)**

Preview and screenshot the landing and one `/swap` page at desktop (1440px) and mobile (390px) widths (Playwright), checking the hero, cards, escrow steps, popular-route links, footer, and that all CTA/nav links point at `https://app.atomiq.exchange`.

Run: serve `dist-marketing/` (e.g. `npx serve dist-marketing` or open the files directly) and capture.
Expected: layout matches the app's dark theme; internal `/swap` links stay relative, app links absolute.

- [ ] **Step 6: Commit**

```bash
git add scripts/build-seo.tsx public/robots.txt
git commit -m "feat(seo): marketing bundle (dist-marketing) on www + drop stale app sitemap ref"
```

---

## Deploy handoff (out of scope, for Adam)

Two bundles from `npm run build`: `build/` (SPA → Azure Storage Account B → `app.atomiq.exchange`) and `dist-marketing/` (landing + `/swap` pages + assets → Azure Storage Account A → `www.atomiq.exchange`). Cloudflare: redirect `atomiq.exchange` → `https://www.atomiq.exchange/$path`. The marketing bundle is self-contained (own CSS/fonts/logos/icons), so it serves independently of the app deploy.

## Notes

- The app subdomain stays indexable (Marci's call); its `robots.txt` keeps the utility-route disallows and only drops the stale app-sitemap reference. The `/swap` canonical tags point to www, so there is no duplicate-content competition.
- The Webflow brand illustrations (hero flasks, escrow vault) are not wired in by this plan; the landing reuses the app's own dark-theme styling. If we want them, add a follow-up to download them into `public/` and reference them from `LandingHome`.
- Task 1's fixes to `content.test.tsx` and `LandingPage.test.tsx` address pre-existing red tests on `develop`; consider cherry-picking that commit back to `develop`.
- `build-seo.tsx` keeps its filename but now builds the marketing bundle; rename to `build-marketing.tsx` later if desired (also update the `build:seo` script name).
```