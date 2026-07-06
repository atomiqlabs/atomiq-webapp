# Root landing page (atomiq.exchange) — design

Date: 2026-07-03. Branch: `feat/root-landing-page` (off `develop`). Status: approved design, pending spec review.

## Problem / goal

Today the apex `atomiq.exchange` 30x-redirects to `app.atomiq.exchange`, where the SPA lives, so a visitor lands straight in the swap form with no marketing page. We want a garden.finance-style static marketing landing page, plus the existing `/swap/<slug>` SEO pages, served from a single canonical marketing domain, with "Launch App" CTAs into the app. This gives us one crawlable brand domain (better SEO + first-touch messaging) with the app cleanly separated on its own subdomain.

## Decisions (locked with Marci)

- Topology (per Adam, 2026-07-03): the marketing static site and the app deploy as two separate bundles from this one repo, fronted by Cloudflare + Azure Storage static hosting.
  - `atomiq.exchange` (apex) → Cloudflare redirect rule → `https://www.atomiq.exchange/$path`.
  - `www.atomiq.exchange` → marketing static site (the landing **and** the `/swap/<slug>` pages) → Azure Storage Account A. This is the canonical domain.
  - `app.atomiq.exchange` → the SPA app → Azure Storage Account B.
  - Canonical is `www.atomiq.exchange`, not the bare apex: Azure static-website hosting does not serve apex roots well, hence the www canonical plus the apex redirect.
- Canonical domain: consolidate. Both the landing and the `/swap/<slug>` pages live on and canonicalize to `https://www.atomiq.exchange`. This moves the route pages off `app.atomiq.exchange` onto the marketing domain, giving one canonical domain for all crawlable content and removing the SPA-vs-static-routing clash on the app subdomain.
- Two build outputs, one repo: an app bundle (the SPA, `build/`) and a self-contained marketing bundle (landing + `/swap` pages + its own copied assets, `dist-marketing/`). Same repo, so components and styles are shared.
- Footer: a full nav-columns site footer (link columns + a curated set of relative `/swap` route links + the existing socials row), reused on the landing and on the `/swap/<slug>` pages. The app's in-app footer stays social-only and unchanged.
- The landing and route pages are static and JS-free, prerendered through the `build-seo` pipeline. There are no app routing changes.

## Architecture

The topology (Cloudflare in front of two Azure Storage static sites):

```
atomiq.exchange/                 ->  Cloudflare redirect            -> https://www.atomiq.exchange/$path
www.atomiq.exchange/             ->  NEW static LandingHome         [Bundle A, canonical https://www.atomiq.exchange/]
www.atomiq.exchange/swap/<slug>  ->  static SEO route pages (moved) [Bundle A, canonical .../swap/<slug>]
app.atomiq.exchange/             ->  SPA swap app                   [Bundle B, unchanged]
```

Link rule: all app-directed links on the marketing site (the landing's Launch App and Swap CTAs, the `/swap` pages' swap CTAs, and the Swap/Explorer nav items) are absolute to `https://app.atomiq.exchange`. All marketing-internal links (landing → `/swap`, `/swap` → sibling `/swap`, footer route links) are relative, since the landing and the route pages share the `www.atomiq.exchange` origin.

## Components and files

New:

- `src/seo/LandingHome.tsx` — the homepage component: nav + hero + supported-chains + benefits + how-it-works + popular routes + FAQ + `SiteFooterView`. JS-free; plain anchors carry all styling (same convention as `LandingPage.tsx`).
- `src/seo/homeContent.ts` — homepage copy and section data in one place: hero headline/subhead, the shared `BENEFITS` array (hoisted out of `LandingPage.tsx`), the how-it-works steps, the supported-chains list derived from `tokens.ts` so it can never drift, the curated list of popular-route slugs, and the homepage FAQ set (`BASE_FAQS` plus any homepage-specific extras).
- `src/components/layout/SiteFooterView.tsx` — the full footer: link columns (Quick Links / Resources / Legal / Company, mirroring the atomiqlabs.com footer — see appendix), a curated set of **relative** `/swap/<slug>` route links, and the existing socials row (embeds `SocialFooterView` rather than duplicating it). No `appOrigin` prop: the landing and the `/swap` pages share the www origin, so route links are relative and the column links are external.
- `src/seo/__tests__/LandingHome.test.tsx` and `src/components/layout/__tests__/SiteFooterView.test.tsx`.

Changed:

- `src/seo/seoHead.ts` — flip `ORIGIN` from the app subdomain to the canonical marketing origin `https://www.atomiq.exchange`. `renderHead(route)` already uses `ORIGIN` for the `/swap` canonical, sitemap loc, and OG image, so those move to www automatically (no signature change). The CTA/deep-link target `APP_ORIGIN` (`https://app.atomiq.exchange`) is defined in `homeContent.ts` and imported where needed. Add `renderLandingHead()` for the homepage head — title, meta description, `canonical` = `https://www.atomiq.exchange/`, OG/Twitter, and JSON-LD `Organization` + `WebSite` (no route-specific `WebApplication`/`BreadcrumbList`).
- `src/seo/LandingPage.tsx` — the `/swap` pages now live on the marketing domain, so their app-directed links become absolute to `APP_ORIGIN`: the nav Swap/Explorer items, the "Launch App" button, and the "Open the app" link. Sibling `/swap` links stay relative. Swap its inline `SocialFooterView` for `SiteFooterView`, and consume `BENEFITS` from `homeContent.ts` instead of its local copy.
- `scripts/build-seo.tsx` — becomes the marketing-bundle builder. It renders the landing (`LandingHome` + `renderLandingHead()`) and the per-route `/swap` pages into a separate `dist-marketing/` output (not the app's `build/`), builds each per-route `ctaHref` as an absolute `${APP_ORIGIN}/?tokenIn=…&tokenOut=…`, writes one www `sitemap.xml` (`/` + every `/swap/<slug>`) and a `robots.txt`, and copies the referenced static assets (`build/assets/`, favicon, logos, `/icons/**`, `navMenu.js`) into `dist-marketing/` so the bundle is self-contained.
- `public/robots.txt` — the app subdomain should not compete with the canonical www content, so the app bundle's `robots.txt` disallows indexing (the marketing bundle ships its own `Allow` + sitemap).

## Build and deploy

`npm run build` produces the two bundles. `vite build` writes the SPA to `build/` (Bundle B → Azure Account B → `app.atomiq.exchange`). `npm run build:seo` then writes the marketing bundle to `dist-marketing/` (Bundle A → Azure Account A → `www.atomiq.exchange`): the landing `index.html`, the `/swap/<slug>/index.html` pages, `sitemap.xml`, `robots.txt`, and a copy of the static assets they reference (the hashed CSS resolved from the Vite manifest, plus `assets/`, favicon, logos, `/icons/**`, `navMenu.js`). The marketing bundle is self-contained so it can serve from its own storage account with no dependency on the app origin.

Infra step (Adam): a Cloudflare redirect `atomiq.exchange` → `https://www.atomiq.exchange/$path`; point `www.atomiq.exchange` at Azure Storage Account A (`dist-marketing/`) and `app.atomiq.exchange` at Account B (`build/`).

## Landing page sections

1. Header/nav — `MainNavigationView` with a "Launch App" button (absolute to `https://app.atomiq.exchange/`). Nav Swap/Explorer items are absolute app-subdomain URLs; Docs/SDK/legal are external.
2. Hero — the company page's headline "Swap fully trustlessly between Bitcoin & other chains" + subhead, primary CTA "Swap now" → `https://app.atomiq.exchange/`, secondary "Read Docs" → `https://docs.atomiq.exchange/`. Exact copy in the appendix.
3. Supported chains/assets — BTC and Lightning on one side; Solana, Starknet, Citrea (and the other configured EVM L2s) on the other. Derived from `tokens.ts` so the list can't drift from what the app actually supports.
4. Why Atomiq — the four `BENEFITS`: trustless and atomic, no bridge or CEX, Bitcoin-secured, RFQ pricing.
5. How the atomiq escrow works — the four-step escrow explanation reused from the company page (lock the vault → counterparty sends a valid BTC tx → a Bitcoin light client verifies it → funds release, or you get your tokens back), paired with the escrow-vault illustration. Exact copy in the appendix.
6. Popular swap routes — a curated grid of **relative** `/swap/<slug>` links (same www origin as the landing) to the route pages; the main SEO win of putting the homepage in front.
7. FAQ — the `BASE_FAQS` set as a native `<details>` accordion (zero JS, answers in crawlable HTML).
8. `SiteFooterView`.

## SEO

- Head: `<title>`, meta description, `canonical` = `https://www.atomiq.exchange/`, OG + Twitter cards, JSON-LD `Organization` + `WebSite`.
- Sitemap: one sitemap on the marketing domain (`dist-marketing/sitemap.xml`) listing `/` and every `/swap/<slug>` under `https://www.atomiq.exchange`. The marketing `robots.txt` allows crawling and points to that sitemap; the app subdomain's `robots.txt` disallows indexing so it does not compete with the canonical www content.
- No `FAQPage` schema — consistent with the existing decision (Google deprecated FAQ rich results 2026-05-07); visible FAQ text carries the signal.

## Testing

- Vitest, mirroring the existing `src/seo/__tests__` style. `LandingHome`: renders, exactly one `<h1>`, the hero CTA and Swap/Explorer nav point at `https://app.atomiq.exchange`, the popular-route links are relative `/swap/<slug>`, and FAQ answers are in the HTML. `SiteFooterView`: renders the columns, relative `/swap` route links, and socials. `seoHead`: `renderHead` canonicalizes to `https://www.atomiq.exchange/swap/<slug>` and `renderLandingHead` to `https://www.atomiq.exchange/`.
- Manual: `npm run build`, then eyeball the landing output at desktop and mobile widths (Playwright screenshot) before handing off to Adam.

## Out of scope (YAGNI)

- No app routing changes; no move of the swap app to a `/app` subpath.
- Consolidating the `/swap` pages onto the www marketing domain IS in scope (Adam's topology); the app keeps its own routes unchanged.
- No analytics/tracking (Cloudflare stats suffice).
- The company Webflow page (`atomiqlabs.com`) is untouched — separate track.
- The infinite-scroll footer bug on the app's history/explorer pages is noted separately and is not part of this work.

## Appendix — source content harvested from atomiqlabs.com (2026-07-03)

Captured live with Playwright from the company page. We reuse this copy and these value props but upgrade the structure with real semantic headings: the Webflow page renders all its "headings" as styled `<div>`s, which is the "no headings on the page" SEO defect flagged on the 2026-06-26 call — our version fixes it with real `<h1>`/`<h2>`. Full-page screenshot saved this session at `.playwright-mcp/atomiqlabs-full.png`.

Meta description (reusable): "Swap trustlessly between Bitcoin and other blockchains with atomiq.exchange. Our cross-chain DEX uses atomic swaps for secure, non-custodial trading with no intermediaries."

Hero — headline "Swap fully trustlessly between Bitcoin & other chains"; subhead "Unlock fully trustless swaps between Bitcoin & other chains. Enjoy secure & efficient transactions without intermediaries - fully non-custodial"; CTAs "Swap now" (→ app) and "Read Docs" (→ docs.atomiq.exchange).

Supported chains strip: Bitcoin, Bitcoin (Lightning Network), Solana, Starknet, Citrea.

Value section — heading "Swap between Bitcoin & other chains with zero slippage"; body "Atomiq.exchange offers Bitcoin cross-chain swaps, with Bitcoin-grade security & higher capital efficiency, while eliminating the need for intermediaries (e.g. Validators)"; three props — Security: "Secured by Bitcoin's proof of work via escrow"; Tech: "Bitcoin light client & atomic swaps"; Support: "Native Bitcoin, Lightning, Solana, Starknet".

Escrow / how-it-works — heading "The atomiq escrow - secured by Bitcoin's Proof of work"; four steps:

1. "Tokens are locked in a smart contract vault on the smart chain (e.g. Solana)."
2. "To unlock the vault, and get access to the tokens, the counterparty must send a valid Bitcoin transaction."
3. "The smart contract verifies the transaction using a Bitcoin light client, which saves Bitcoin transactions data on Solana."
4. "If the Bitcoin payment is confirmed, the vault releases the funds. If not, the trade doesn't go through and you receive your tokens back."

Closing CTA band — heading "Start swapping with atomiq labs"; subhead "It's safe, quick & efficient"; secondary line "Want to provide liquidity or integrate the atomiq SDK?" with "Become an LP" and "Integrate the SDK" buttons. (The newsletter subscribe form on the source page is dropped — no forms/tracking, per the no-analytics decision.)

Footer columns (mirror the site, adapt targets to real destinations):

- Quick Links: About us (atomiqlabs.com/about), Contact us (mailto:info@atomiqlabs.com)
- Resources: FAQs, Docs (docs.atomiq.exchange), Audits (github.com/atomiqlabs/atomiq-readme/tree/main/audits), SDK (npmjs.com/@atomiqlabs/sdk)
- Legal: Terms of Service, Privacy Policy, Cookie Policy (atomiqlabs.com pages)
- Company: The Lab, Meet the Team (atomiqlabs.com/about)
- Our additions: a curated Popular-routes group linking to `app.atomiq.exchange/swap/<slug>`, plus the socials row.
- Copyright line: "atomiq labs. All rights reserved." (year stamped at build time).

Illustration assets (Webflow CDN `cdn.prod.website-files.com/6800c6be3f80a4179f8b4a5f/...`; download and bundle locally for a self-contained apex page, or substitute the app's own visuals):

- Logo wordmark: `6800c86e...Isolation_Mode.webp`
- Hero lab-flask illustration: `680646c5...Frame 1597879755.svg`
- Escrow vault illustration: `6806507366...Frame 1597879756.svg`
- Co-brand chain logos (Solana / Starknet / Citrea): several PNGs under the same CDN path.

Visual identity: near-black background (`rgb(0,0,0)`), purple + orange "chemistry lab" flask motif — consistent with the app's existing dark theme, so the app's own styling largely carries over.
