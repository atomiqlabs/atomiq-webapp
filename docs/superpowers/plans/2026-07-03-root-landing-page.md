# Root Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, JS-free marketing landing page for the apex `atomiq.exchange`, reusing the app's existing SEO/prerender pipeline, with a full site footer shared by the landing and the `/swap/<slug>` pages.

**Architecture:** The app and its `/swap/<slug>` SEO pages stay untouched on `app.atomiq.exchange`. We add a new `LandingHome` component prerendered to a static `build/landing/index.html` for the apex. Because the landing lives on the apex and the app on the subdomain, every app-directed link on the landing is absolute to `https://app.atomiq.exchange`. Infra later removes the apex redirect and serves the landing output (out of scope for this plan).

**Tech Stack:** React 18 + `react-dom/server` `renderToStaticMarkup`, TypeScript, Vite, `tsx` build script, Vitest + jsdom, Bootstrap + Tailwind utility classes.

## Global Constraints

- No app routing changes; the SPA stays at `app.atomiq.exchange`. This plan touches only `src/seo/*`, `src/components/layout/*`, `scripts/build-seo.tsx`, and their tests.
- The landing ships no React runtime; plain anchors carry styling (same convention as `src/seo/LandingPage.tsx`).
- App-directed links on the landing are absolute to `https://app.atomiq.exchange`. The existing `/swap` pages keep using relative links.
- Landing canonical is `https://atomiq.exchange/`; the route pages keep `ORIGIN = 'https://app.atomiq.exchange'` (do not rename `ORIGIN`).
- Do not change the app's in-app footer. The full footer is a NEW `SiteFooterView`; the existing social-only `SocialFooterView` stays as-is and is embedded inside it.
- Public-facing copy uses no em dashes or en dashes (brand voice rule): use commas, periods, colons, parentheses, or plain hyphens only. Copy in this plan already follows this.
- Tests use Vitest with `renderToStaticMarkup` + string assertions (match `src/seo/__tests__/*`). Run with `npx vitest run <path>`.
- Commit messages are plain, with no `Co-Authored-By` or AI-attribution trailer.

---

### Task 1: Green the pre-existing failing tests (baseline)

Two tests from the squashed PR #56 are stale and fail on `develop`. Fix them so the suite is green before building on top. These fixes are also worth cherry-picking to `develop`.

**Files:**
- Modify: `src/seo/__tests__/content.test.tsx:11`
- Modify: `src/seo/__tests__/LandingPage.test.tsx:21` (and add a sibling fixture)

**Interfaces:**
- Consumes: `LandingPage(props: { route: ResolvedRoute; siblings: ResolvedRoute[] })` (current signature), `composeRoute` producing titles suffixed `| atomiq.exchange`.
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

In `src/seo/__tests__/LandingPage.test.tsx`, add a sibling fixture just after the `route` fixture (before the `describe`):

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
  ctaHref: '/?tokenIn=SOLANA:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&tokenOut=BITCOIN',
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
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/seo/__tests__/content.test.tsx src/seo/__tests__/LandingPage.test.tsx
git commit -m "test(seo): fix stale content + LandingPage tests to match current code"
```

---

### Task 2: Home content module

One module holding all homepage copy and derived data, so the component stays presentational and the copy is testable. Reuses `tokens.ts`, `routes.ts`, and `baseFaqs.ts` so lists cannot drift.

**Files:**
- Create: `src/seo/homeContent.ts`
- Test: `src/seo/__tests__/homeContent.test.ts`

**Interfaces:**
- Consumes: `BTC_SIDE`, `SMART_CHAIN_TOKENS` from `./tokens`; `buildRoutes` from `./routes`; `BASE_FAQS` from `./baseFaqs`; `FaqItem` from `./types`.
- Produces: `APP_ORIGIN: string`; `HERO: { headline, subhead, primaryCta: {label,href}, secondaryCta: {label,href} }`; `BENEFITS: {title,text}[]`; `ESCROW_HEADING: string`; `ESCROW_STEPS: string[]`; `SUPPORTED_CHAINS: string[]`; `POPULAR_ROUTES: {slug,label}[]`; `HOME_FAQS: FaqItem[]`.

- [ ] **Step 1: Write the failing test**

Create `src/seo/__tests__/homeContent.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  APP_ORIGIN, HERO, BENEFITS, ESCROW_STEPS, SUPPORTED_CHAINS, POPULAR_ROUTES, HOME_FAQS,
} from '../homeContent';
import { buildRoutes } from '../routes';

describe('homeContent', () => {
  it('hero primary CTA points at the app subdomain root', () => {
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

The full site footer: link columns mirroring atomiqlabs.com, a curated popular-routes group, and the existing socials row. Reused by the landing and the `/swap` pages. `appOrigin` prefixes app-relative links (`''` on the subdomain pages, the app origin on the apex landing).

**Files:**
- Create: `src/components/layout/SiteFooterView.tsx`
- Test: `src/components/layout/__tests__/SiteFooterView.test.tsx`

**Interfaces:**
- Consumes: `SocialFooterView` from `./SocialFooterView`; `POPULAR_ROUTES` from `../../seo/homeContent`.
- Produces: `SiteFooterView(props: { appOrigin?: string; noTooltip?: boolean })`.

- [ ] **Step 1: Write the failing test**

Create `src/components/layout/__tests__/SiteFooterView.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SiteFooterView } from '../SiteFooterView';

describe('SiteFooterView', () => {
  it('renders link columns, socials, and copyright', () => {
    const html = renderToStaticMarkup(<SiteFooterView />);
    expect(html).toContain('Quick Links');
    expect(html).toContain('Resources');
    expect(html).toContain('Legal');
    expect(html).toContain('Company');
    expect(html).toContain('href="https://docs.atomiq.exchange/"');
    expect(html).toContain('href="https://twitter.com/atomiqlabs"'); // from SocialFooterView
    expect(html).toContain('All rights reserved');
  });
  it('uses relative /swap route links by default', () => {
    const html = renderToStaticMarkup(<SiteFooterView />);
    expect(html).toMatch(/href="\/swap\/[a-z0-9-]+"/);
  });
  it('prefixes route links with appOrigin when provided', () => {
    const html = renderToStaticMarkup(<SiteFooterView appOrigin="https://app.atomiq.exchange" />);
    expect(html).toContain('href="https://app.atomiq.exchange/swap/');
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

type FooterLink = { label: string; href: string; external?: boolean };
type FooterColumn = { title: string; links: FooterLink[] };

const COLUMNS: FooterColumn[] = [
  {
    title: 'Quick Links',
    links: [
      { label: 'About us', href: 'https://www.atomiqlabs.com/about', external: true },
      { label: 'Contact us', href: 'mailto:info@atomiqlabs.com', external: true },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'FAQs', href: 'https://www.atomiqlabs.com/resources#faq', external: true },
      { label: 'Docs', href: 'https://docs.atomiq.exchange/', external: true },
      { label: 'Audits', href: 'https://github.com/atomiqlabs/atomiq-readme/tree/main/audits', external: true },
      { label: 'SDK', href: 'https://npmjs.com/@atomiqlabs/sdk', external: true },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: 'https://www.atomiqlabs.com/terms-of-service', external: true },
      { label: 'Privacy Policy', href: 'https://www.atomiqlabs.com/privacy-cookie-policy', external: true },
      { label: 'Cookie Policy', href: 'https://www.atomiqlabs.com/privacy-cookie-policy', external: true },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'The Lab', href: 'https://www.atomiqlabs.com/about', external: true },
      { label: 'Meet the Team', href: 'https://www.atomiqlabs.com/about#team', external: true },
    ],
  },
];

function FooterLinkItem({ link }: { link: FooterLink }) {
  const attrs = link.external ? { target: '_blank', rel: 'noreferrer' } : {};
  return (
    <li className="mb-2">
      <a href={link.href} className="text-white text-opacity-75 text-decoration-none" {...attrs}>
        {link.label}
      </a>
    </li>
  );
}

export function SiteFooterView(props: { appOrigin?: string; noTooltip?: boolean }) {
  const appOrigin = props.appOrigin ?? '';
  return (
    <footer className="site-footer text-white container pt-5 pb-4">
      <div className="row">
        {COLUMNS.map((col) => (
          <div className="col-6 col-md-3 col-lg-2 pb-3" key={col.title}>
            <h3 className="fs-6 fw-semibold mb-3">{col.title}</h3>
            <ul className="list-unstyled mb-0">
              {col.links.map((l) => (
                <FooterLinkItem key={l.label} link={l} />
              ))}
            </ul>
          </div>
        ))}

        <div className="col-6 col-md-3 col-lg-2 pb-3">
          <h3 className="fs-6 fw-semibold mb-3">Popular routes</h3>
          <ul className="list-unstyled mb-0">
            {POPULAR_ROUTES.map((r) => (
              <li className="mb-2" key={r.slug}>
                <a href={`${appOrigin}/swap/${r.slug}`} className="text-white text-opacity-75 text-decoration-none">
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

### Task 4: Use SiteFooterView and shared BENEFITS in LandingPage

Point the existing `/swap` route pages at the full footer, and consume `BENEFITS` from `homeContent` so it is defined once. No prop changes to `LandingPage`.

**Files:**
- Modify: `src/seo/LandingPage.tsx`
- Modify: `src/seo/__tests__/LandingPage.test.tsx` (add a footer assertion)

**Interfaces:**
- Consumes: `SiteFooterView` from `../components/layout/SiteFooterView`; `BENEFITS` from `./homeContent`.
- Produces: unchanged `LandingPage(props: { route: ResolvedRoute; siblings: ResolvedRoute[] })`.

- [ ] **Step 1: Add the failing footer assertion**

In `src/seo/__tests__/LandingPage.test.tsx`, add this test inside the `describe('LandingPage', ...)` block:

```tsx
  it('renders the full site footer', () => {
    expect(html).toContain('Quick Links');
    expect(html).toContain('All rights reserved');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/seo/__tests__/LandingPage.test.tsx`
Expected: FAIL — the current footer (`SocialFooterView`) has no "Quick Links".

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
import { BENEFITS } from './homeContent';
import type {ResolvedRoute, SeoToken} from './types';
```

Delete the local `BENEFITS` block (the `const BENEFITS: { title: string; text: string }[] = [ ... ];` array, lines 25-42).

Replace the footer element near the end:

```tsx
      <SocialFooterView isHorizontal={false} noTooltip />
```

with (note: `/swap` pages are served on the subdomain, so the default relative `appOrigin` is correct):

```tsx
      <SiteFooterView noTooltip />
```

- [ ] **Step 4: Run the suite to verify green**

Run: `npx vitest run src/seo src/components/layout`
Expected: PASS — LandingPage renders the full footer; nothing else regresses.

- [ ] **Step 5: Commit**

```bash
git add src/seo/LandingPage.tsx src/seo/__tests__/LandingPage.test.tsx
git commit -m "refactor(seo): LandingPage uses SiteFooterView and shared BENEFITS"
```

---

### Task 5: Apex head builder in seoHead

Add the apex origin constant and a landing-specific head builder (homepage title/description/canonical + Organization and WebSite JSON-LD, no route-specific schema). The existing `ORIGIN` and `renderHead(route)` are untouched.

**Files:**
- Modify: `src/seo/seoHead.ts`
- Modify: `src/seo/__tests__/seoHead.test.ts`

**Interfaces:**
- Consumes: existing `esc`, `ORIGIN`, `OG_IMAGE`, `ATOMIQ_LABS_PAGE` in `seoHead.ts`.
- Produces: `SITE_ORIGIN: string`; `renderLandingHead(): string`.

- [ ] **Step 1: Write the failing test**

In `src/seo/__tests__/seoHead.test.ts`, change the import line:

```ts
import { renderHead, ORIGIN } from '../seoHead';
```

to:

```ts
import { renderHead, renderLandingHead, ORIGIN, SITE_ORIGIN } from '../seoHead';
```

Then append this block at the end of the file:

```ts
describe('renderLandingHead', () => {
  const head = renderLandingHead();
  it('canonicalizes to the apex origin', () => {
    expect(SITE_ORIGIN).toBe('https://atomiq.exchange');
    expect(head).toContain(`<link rel="canonical" href="${SITE_ORIGIN}/"/>`);
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

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/seo/__tests__/seoHead.test.ts`
Expected: FAIL — `renderLandingHead`/`SITE_ORIGIN` are not exported.

- [ ] **Step 3: Add the constant and builder**

In `src/seo/seoHead.ts`, add after the existing `export const ORIGIN = 'https://app.atomiq.exchange';` line:

```ts
export const SITE_ORIGIN = 'https://atomiq.exchange';
```

Then add this function at the end of the file:

```ts
export function renderLandingHead(): string {
  const title = 'atomiq.exchange | Trustless cross-chain swaps for Bitcoin';
  const description =
    'Swap trustlessly between Bitcoin and other blockchains with atomiq.exchange. Our cross-chain DEX uses atomic swaps for secure, non-custodial trading with no intermediaries.';
  const url = `${SITE_ORIGIN}/`;
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/seo/__tests__/seoHead.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/seo/seoHead.ts src/seo/__tests__/seoHead.test.ts
git commit -m "feat(seo): apex SITE_ORIGIN + renderLandingHead for the landing page"
```

---

### Task 6: LandingHome component

The homepage itself: nav (with a Launch App button and app-absolute nav links), hero, supported chains, benefits, escrow steps, popular routes, FAQ accordion, and the full footer. JS-free.

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
  it('points the primary CTA and Launch App at the app subdomain root', () => {
    expect(html).toContain(`href="${APP_ORIGIN}/"`);
  });
  it('links popular routes to the app-subdomain /swap pages', () => {
    expect(html).toContain(`href="${APP_ORIGIN}/swap/`);
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

// Swap/Explorer navigate to the app in the same tab (absolute, cross-subdomain);
// Docs/SDK/legal are external sites opened in a new tab.
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
                <a href={`${APP_ORIGIN}/swap/${r.slug}`} className="text-white">
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

      <SiteFooterView appOrigin={APP_ORIGIN} noTooltip />
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
git commit -m "feat(seo): LandingHome component for the apex landing page"
```

---

### Task 7: Generate the landing in build-seo + full-build verification

Wire `LandingHome` + `renderLandingHead` into the static build: emit `build/landing/index.html` for the apex and its own sitemap; drop the `/` entry from the subdomain sitemap (it moves to the apex sitemap). This task has no unit test (the script does filesystem IO, matching the existing `build-seo` pattern); it is verified by a real build.

**Files:**
- Modify: `scripts/build-seo.tsx`

**Interfaces:**
- Consumes: `LandingHome` from `../src/seo/LandingHome`; `renderLandingHead`, `SITE_ORIGIN` from `../src/seo/seoHead` (alongside the existing `renderHead`, `ORIGIN`).
- Produces: `build/landing/index.html`, `build/landing/sitemap.xml`; a `build/sitemap.xml` that lists only `/swap/<slug>`.

- [ ] **Step 1: Add imports**

In `scripts/build-seo.tsx`, extend the two SEO imports. Change:

```tsx
import { renderHead, ORIGIN } from '../src/seo/seoHead';
import { LandingPage } from '../src/seo/LandingPage';
```

to:

```tsx
import { renderHead, renderLandingHead, ORIGIN, SITE_ORIGIN } from '../src/seo/seoHead';
import { LandingPage } from '../src/seo/LandingPage';
import { LandingHome } from '../src/seo/LandingHome';
```

- [ ] **Step 2: Add a landing document helper**

In `scripts/build-seo.tsx`, add this function right after the existing `htmlDocument(...)` function:

```tsx
function landingDocument(body: string, css: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="stylesheet" href="${css}" />
    ${renderLandingHead()}
  </head>
  <body>
    <div id="root" class="background">${body}</div>
    <script defer src="/navMenu.js"></script>
  </body>
</html>`;
}
```

- [ ] **Step 3: Emit the landing page and split the sitemaps**

In `scripts/build-seo.tsx`, replace the sitemap block at the end of `main()` (the lines from `const urls = ['/', ...resolved.map(...)]` through the final `console.log(...)`):

```tsx
  const urls = ['/', ...resolved.map((r) => `/swap/${r.slug}`)];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${ORIGIN}${u}</loc></url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(BUILD, 'sitemap.xml'), sitemap);

  console.log(`Generated ${resolved.length} landing pages + sitemap (${urls.length} urls).`);
```

with:

```tsx
  // Subdomain sitemap: swap route pages only (the apex root is listed on the apex sitemap).
  const swapUrls = resolved.map((r) => `/swap/${r.slug}`);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${swapUrls.map((u) => `  <url><loc>${ORIGIN}${u}</loc></url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(BUILD, 'sitemap.xml'), sitemap);

  // Apex landing page + its own sitemap (served at atomiq.exchange, out-of-plan infra step).
  const landingBody = renderToStaticMarkup(React.createElement(LandingHome));
  const landingDir = path.join(BUILD, 'landing');
  fs.mkdirSync(landingDir, { recursive: true });
  fs.writeFileSync(path.join(landingDir, 'index.html'), landingDocument(landingBody, css));

  const landingSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_ORIGIN}/</loc></url>
</urlset>`;
  fs.writeFileSync(path.join(landingDir, 'sitemap.xml'), landingSitemap);

  console.log(`Generated ${resolved.length} swap pages + apex landing + 2 sitemaps.`);
```

- [ ] **Step 4: Confirm the whole unit-test suite still passes**

Run: `npx vitest run`
Expected: PASS — all test files green.

- [ ] **Step 5: Run a full build and verify the landing output**

Prerequisite: dependencies installed (`npm install --force` if needed) and an env file present (`cp .env.mainnet .env` if `.env` is missing). Then:

Run: `npm run build`
Expected: completes with `Generated N swap pages + apex landing + 2 sitemaps.`

Then verify the artifact:

Run: `test -f build/landing/index.html && grep -c "Swap fully trustlessly between Bitcoin" build/landing/index.html && grep -c 'rel="canonical" href="https://atomiq.exchange/"' build/landing/index.html`
Expected: prints the file exists and both greps return `1`.

- [ ] **Step 6: Eyeball the rendered page (manual)**

Preview the build and screenshot the landing at desktop and mobile widths (Playwright), checking the hero, cards, escrow steps, popular-route links, and footer render correctly.

Run: `npm run preview` then open the served `/landing/` path (or open `build/landing/index.html` directly), capture at 1440px and 390px.
Expected: layout matches the app's dark theme; all CTA/nav/route links point at `https://app.atomiq.exchange`.

- [ ] **Step 7: Commit**

```bash
git add scripts/build-seo.tsx
git commit -m "feat(seo): generate apex landing page + split sitemaps in build-seo"
```

---

## Deploy handoff (out of scope, for Adam)

The build now produces `build/landing/index.html` (+ `build/landing/sitemap.xml`). To go live: serve that output at `atomiq.exchange` and remove the apex to subdomain redirect. Recommended: serve the same `build/` artifact at the apex with its index mapped to `landing/index.html` (no asset duplication, no CSS-hash coupling). If the apex must be a fully independent deploy, emit a self-contained bundle by also copying the referenced assets (`build/assets/*`, `main_logo.png`, `logo192.png`, favicon, `/icons/socials/*`). No new subdomain or DNS record is needed.

## Notes

- The Webflow brand illustrations (hero flasks, escrow vault) are not wired in by this plan; the landing reuses the app's own dark-theme styling. If we want those illustrations, add a follow-up task to download them into `public/` and reference them from `LandingHome`.
- Tasks 1's fixes to `content.test.tsx` and `LandingPage.test.tsx` address pre-existing red tests on `develop`; consider cherry-picking that commit back to `develop`.
