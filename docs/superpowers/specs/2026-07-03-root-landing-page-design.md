# Root landing page (atomiq.exchange) — design

Date: 2026-07-03. Branch: `feat/root-landing-page` (off `develop`). Status: approved design, pending spec review.

## Problem / goal

Today the apex `atomiq.exchange` 30x-redirects to `app.atomiq.exchange`, where the SPA lives, so a visitor lands straight in the swap form with no marketing page. We want a garden.finance-style static marketing landing page served at the apex, with a "Launch App" CTA into the app. This gives us a crawlable brand homepage (SEO + first-touch messaging) without touching the app itself.

## Decisions (locked with Marci)

- Wiring: remove the apex→subdomain redirect and serve a new static landing page at `atomiq.exchange`. The app and all existing `/swap/<slug>` SEO pages stay unchanged on `app.atomiq.exchange`. There are no app routing changes.
- Canonical domain: minimal. The landing canonicalizes to `https://atomiq.exchange/`. The `/swap/<slug>` pages keep canonicalizing to `https://app.atomiq.exchange/...` exactly as they do now. No consolidation of the route pages onto the apex.
- Footer: a full nav-columns site footer (link columns + a curated set of swap-route links + the existing socials row), reused on the landing and on the `/swap/<slug>` pages. The app's in-app footer stays social-only and unchanged.
- The landing is static and JS-free, prerendered through the existing `build-seo` pipeline, mirroring how the `/swap` pages are built.

## Architecture

The origin split (nothing about the app or the route pages changes; only the apex gains a page and loses its redirect):

```
atomiq.exchange/               ->  NEW static LandingHome            (apex, canonical https://atomiq.exchange/)
app.atomiq.exchange/           ->  SPA swap app                      (unchanged)
app.atomiq.exchange/swap/<slug>->  existing static SEO route pages   (unchanged, canonical on the subdomain)
```

Cross-origin rule: because the landing sits on the apex and the app on the subdomain, every app-directed link on the landing (Launch App, hero CTA, popular-route links, nav items into the app) is an absolute URL to `https://app.atomiq.exchange`. The `/swap` pages keep using relative links, since they are served same-origin with the app.

## Components and files

New:

- `src/seo/LandingHome.tsx` — the homepage component: nav + hero + supported-chains + benefits + how-it-works + popular routes + FAQ + `SiteFooterView`. JS-free; plain anchors carry all styling (same convention as `LandingPage.tsx`).
- `src/seo/homeContent.ts` — homepage copy and section data in one place: hero headline/subhead, the shared `BENEFITS` array (hoisted out of `LandingPage.tsx`), the how-it-works steps, the supported-chains list derived from `tokens.ts` so it can never drift, the curated list of popular-route slugs, and the homepage FAQ set (`BASE_FAQS` plus any homepage-specific extras).
- `src/components/layout/SiteFooterView.tsx` — the full footer: link columns (Quick Links / Resources / Legal / Company, mirroring the atomiqlabs.com footer — see appendix), a curated set of swap-route links, and the existing socials row (embeds `SocialFooterView` rather than duplicating it). Takes an `appOrigin` prop: `''` (default) on the `/swap` pages for subdomain-relative links, `'https://app.atomiq.exchange'` on the apex landing so app links are absolute.
- `src/seo/__tests__/LandingHome.test.tsx` and `src/components/layout/__tests__/SiteFooterView.test.tsx`.

Changed:

- `src/seo/seoHead.ts` — keep the existing `ORIGIN = 'https://app.atomiq.exchange'` (the app/subdomain origin, still imported by `build-seo.tsx` and used by the route pages — no rename) and add `SITE_ORIGIN = 'https://atomiq.exchange'` for the apex. Add `renderLandingHead()` that builds the homepage head — title, meta description, `canonical` = `https://atomiq.exchange/`, OG/Twitter tags, and JSON-LD for `Organization` + `WebSite` (no route-specific `WebApplication`/`BreadcrumbList`). The existing `renderHead(route)` is untouched.
- `src/seo/LandingPage.tsx` — swap its inline `SocialFooterView` for `SiteFooterView` so the `/swap` pages gain the full footer; consume the `BENEFITS` array from `homeContent.ts` instead of its local copy.
- `scripts/build-seo.tsx` — add a `renderLandingHome()` step that renders `LandingHome` to static markup and writes the landing output. The existing per-route generation and the sitemap stay as they are, except the landing gets its head via `renderLandingHead()` and the apex sitemap entry uses `SITE_ORIGIN` (see SEO).

## Build and deploy

`npm run build:seo` gains one output: the static landing for the apex. The landing references only assets that already exist in the app build — the hashed CSS resolved from the Vite manifest (same `cssHref()` mechanism used today), plus public assets (`/main_logo.png`, `/logo192.png`, favicon, `/icons/socials/*`, and the icon/webfonts the CSS pulls in).

Recommended deploy: serve the same `build/` artifact at the apex with its index mapped to the landing HTML (e.g. emit `build/landing/index.html` and have the apex host serve that as `/`). This avoids asset duplication and any CSS-hash coupling, because both origins serve the identical build. Alternative, if the apex must be a fully independent deploy: emit a self-contained `build-landing/` bundle with the referenced assets copied in. Which one we use depends on the hosting setup — that is the single question for Adam.

Infra step (Adam, not solo-doable): point `atomiq.exchange` at the landing output and remove the apex→subdomain redirect. This is a redirect removal plus a static deploy target — no new subdomain, no DNS record creation.

## Landing page sections

1. Header/nav — `MainNavigationView` with a "Launch App" button to the app subdomain. Nav items that point into the app use absolute subdomain URLs.
2. Hero — the company page's headline "Swap fully trustlessly between Bitcoin & other chains" + subhead, primary CTA "Swap now" → `https://app.atomiq.exchange/`, secondary "Read Docs" → `https://docs.atomiq.exchange/`. Exact copy in the appendix.
3. Supported chains/assets — BTC and Lightning on one side; Solana, Starknet, Citrea (and the other configured EVM L2s) on the other. Derived from `tokens.ts` so the list can't drift from what the app actually supports.
4. Why Atomiq — the four `BENEFITS`: trustless and atomic, no bridge or CEX, Bitcoin-secured, RFQ pricing.
5. How the atomiq escrow works — the four-step escrow explanation reused from the company page (lock the vault → counterparty sends a valid BTC tx → a Bitcoin light client verifies it → funds release, or you get your tokens back), paired with the escrow-vault illustration. Exact copy in the appendix.
6. Popular swap routes — a curated grid linking to `https://app.atomiq.exchange/swap/<slug>` (drives internal links to the route pages; the main SEO win of putting the homepage in front).
7. FAQ — the `BASE_FAQS` set as a native `<details>` accordion (zero JS, answers in crawlable HTML).
8. `SiteFooterView`.

## SEO

- Head: `<title>`, meta description, `canonical` = `https://atomiq.exchange/`, OG + Twitter cards, JSON-LD `Organization` + `WebSite`.
- Sitemap: keep the apex and subdomain sitemaps separate (minimal). The subdomain sitemap keeps listing `/swap/<slug>` under `APP_ORIGIN` as today; the apex serves its own small sitemap listing `/` under `SITE_ORIGIN`. (The current `build-seo` sitemap already lists `/` — that entry moves to the apex sitemap.)
- No `FAQPage` schema — consistent with the existing decision (Google deprecated FAQ rich results 2026-05-07); visible FAQ text carries the signal.

## Testing

- Vitest, mirroring the existing `src/seo/__tests__` style. `LandingHome`: renders, exactly one `<h1>`, the hero CTA and popular-route/nav links into the app are absolute to `https://app.atomiq.exchange`, and FAQ answer text is present in the HTML. `SiteFooterView`: renders the link columns, route links, and socials; `appOrigin` prefixes app links; the `noTooltip` path renders plain anchors.
- Manual: `npm run build`, then eyeball the landing output at desktop and mobile widths (Playwright screenshot) before handing off to Adam.

## Out of scope (YAGNI)

- No app routing changes; no move of the swap app to a `/app` subpath.
- No canonical consolidation of the `/swap` pages onto the apex.
- No analytics/tracking (per Marci's preference; Cloudflare stats suffice).
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
