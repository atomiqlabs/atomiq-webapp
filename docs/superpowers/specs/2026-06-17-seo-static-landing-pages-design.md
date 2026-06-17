# SEO static landing pages — design spec

Date: 2026-06-17
Status: draft (pending review)
Repo: `atomiq-webapp`

## 1. Goal

Make Atomiq discoverable in search for route-specific queries ("trustless swap SOL to BTC", "bridge Bitcoin to USDC on Solana", "swap BTC to Starknet") by adding crawlable, token-pair-specific landing pages — without making the interactive SPA itself server-rendered or crawlable. The pattern is Garden Finance's route landing pages, minus the live widget mock: a static, on-brand page per token pair with real SEO content and a single CTA that hands off to the existing swap app with the pair pre-selected.

## 2. Approach (decided)

Generate **standalone static HTML files**, one per token pair, from a matrix. The pages:

- ship **no React runtime and are never hydrated** — they are plain HTML + the shared compiled CSS + one small shared menu script;
- reuse the app's real chrome (navbar, footer) via a presentational-component split, so they look identical to the app and never drift;
- contain real crawlable content (H1, route copy, supported tokens, trust model, fees note, wallet requirements, FAQ) plus internal links;
- carry a single **"Launch App" / "Swap"** CTA that deep-links into the existing swap page with the pair pre-selected via query params (already supported — see §7).

Rejected alternatives (for the record): prerendering the live SPA via headless browser (react-snap / puppeteer snapshot), and a full SSG framework migration (vite-react-ssg / Next). Both fight the app's heavy wallet/SDK/polyfill graph and hydration; the static-files approach shares nothing with the app runtime and is far lower risk.

## 3. Non-goals

- The main app page (`/`) and all existing routes stay **exactly as they are** (behaviour-wise).
- No SSR/hydration of the swap UI.
- No Garden-style interactive/mocked swap widget on landing pages (CTA only for v1; mock is a possible future enhancement).
- No FAQPage JSON-LD (Google deprecated FAQ rich results as of 2026-05-07); visible FAQ text is for relevance/long-tail only.
- **Only token-pair pages are added now.** Static rendering of the `/about` and `/faq` pages is deferred (they remain SPA-only); see §15.

## 4. Architecture overview

```
Token-pair matrix (src/seo/routes.ts; enumerated from smartChainTokenArray)
        │  drives ↓
        ├── landing page content + per-route FAQ + CTA query params
        └── sitemap.xml entries

Presentational components (shared, logic-free)
        ├── MainNavigationView  ← rendered by app wrapper AND static template
        └── SocialFooterView      ← rendered by app wrapper AND static template

public/navMenu.js (plain JS, event delegation)
        └── loaded via <script> by index.html AND every static page

Build pipeline (scripts/build-seo.mjs, runs after `vite build`)
        ├── esbuild/tsx transpile of the static template (raw Node, no Vite SSR)
        ├── renderToStaticMarkup(<LandingPage route=…/>) per token pair
        ├── inject hashed CSS <link> (from Vite manifest) + <script defer src="/navMenu.js">
        ├── write build/swap/<slug>/index.html
        └── emit build/sitemap.xml
```

`public/navMenu.js` is copied verbatim to `build/navMenu.js` by Vite (static asset) — no bundle/transpile step. The static template's import graph contains **only** React, react-bootstrap, react-icons-kit, the presentational View components, and the route matrix — no `@atomiqlabs/sdk`, no `ChainsConfig`, no `WalletConnector`, no `SettingsModal`, no env. That is what makes a raw-Node `renderToStaticMarkup` viable (see §6, §10).

## 5. Presentational refactor (shared chrome)

### 5.1 MainNavigation: View + wrapper split

Split `src/components/layout/MainNavigation.tsx` into:

- **`MainNavigationView.tsx`** — pure presentational, props only, no context/SDK/env/state-logic. Props:
  - `navItems` — array of `{ link, icon, title, count?, external? }`.
  - `walletSlot: React.ReactNode` — app passes `<WalletConnector/>`; static passes a styled "Launch App" link.
  - `settingsSlot?: React.ReactNode` — app passes the settings-cog button (opens modal); static passes a link or `null`.
  - `networkBadge?: { show: boolean; label: string }` — replaces the `ChainsConfig` + `BitcoinNetwork` lookup.
  - `actionRequiredCount?: number` (default 0), `syncing?: boolean`, `syncingError?: boolean` — replaces the `swapper.getActionableSwaps()` / `SwapType` logic.
  - `currentPath: string` — for `is-active` highlighting (replaces `useLocation`).
  - `onNavClick?: (e) => void` — app passes `anchorNavigate`; static omits (plain `href` links, crawlable).
  - Markup uses the existing `main-navigation__*` SCSS classes and carries the `data-*` hooks that `navMenu.js` drives (see §5.3). Header comment documents the navMenu contract.
  - The react-bootstrap `Navbar`/`Navbar.Collapse`/`NavDropdown` stateful wrappers are replaced with plain semantic elements styled by the same classes, so identical DOM renders in both contexts and the shared script drives it.

- **`MainNavigation.tsx`** (wrapper, app-only) — keeps all current logic: `useContext(SwapperContext)`, action-count effect, `useLocation`, `useAnchorNavigate`, the `ChainsConfig`/`BitcoinNetwork` badge value, `WalletConnector`, `SettingsModal` + `settingsOpened` state. Renders `<MainNavigationView … />`. **Remove the now-unused `FEConstants` import** (confirmed unused). The menu script is loaded globally via `index.html` (§5.3), so the wrapper does not need to invoke it.

### 5.2 SocialFooter: View + wrapper split

- **`SocialFooterView.tsx`** — props `{ isHorizontal: boolean }`; renders the existing markup/classes. Tooltips are optional and degrade gracefully without JS (or are dropped in the static path).
- **`SocialFooter.tsx`** (wrapper) — uses `useLocation()` to compute `isHorizontal` (today's `isTablePage` logic) and renders the View.

### 5.3 navMenu.js (centralized menu interactivity)

- New `public/navMenu.js` — **plain JavaScript** (not TypeScript; no build/transpile, no minification — ~40 lines is fine as-is). Single source of truth for: mobile hamburger toggle, click-outside-to-close, close-on-link-click, and the "More" dropdown. Written with **event delegation** on `document` (matching `data-*` hooks / classes) so it is robust to React mount order and re-renders, and works identically on React-rendered and static DOM. Self-initialises on `DOMContentLoaded`.
- Vite copies `public/navMenu.js` → `build/navMenu.js` verbatim.
- **Loaded the same way everywhere:** `<script defer src="/navMenu.js"></script>` in `index.html` (the app) and in every generated static page. No import in the app, no bundling.
- **Documentation:** `MainNavigationView` header comment enumerates the `data-*` hooks the script drives and points to `public/navMenu.js`, so the arrangement is discoverable from the component.

## 6. Landing page template + content

- **`src/seo/LandingPage.tsx`** — presentational page component, props `{ route }`. Renders, inside the same `App`/`background` wrapper classes the app uses:
  - `<MainNavigationView>` with the static props from §5.1 (Launch App CTA in `walletSlot`, no settings, `currentPath` = page path, no `onNavClick`).
  - Hero: `<h1>` (e.g. "Swap BTC to USDC on Solana"), route description paragraph, primary CTA button/link → deep link (see §7).
  - Sections: supported tokens for the pair, trust model (trustless/atomic/non-custodial, Bitcoin light-client verification, refund path), fees note (RFQ / competitive market-maker pricing, no AMM slippage), wallet requirements.
  - FAQ section (see §6.1), rendered **expanded** as plain `<section>` blocks (no collapsing accordion → fully crawlable, no JS).
  - `<SocialFooterView isHorizontal={false}/>` plus an internal-links block (sibling token-pair pages + home `/`).
  - `<head>` content via the SEO helper (§9): title, meta description, canonical, OG/Twitter, JSON-LD.

### 6.1 FAQ composition (per-route)

- Landing FAQ = a curated **base set** reused from `src/data/FAQContent.tsx` (e.g. "Do I have to trust anyone?", "Why should you use atomiq.exchange?", "Are you audited?") + the route's **`extraFaqs`** (e.g. "What is Solana?", "What is the Lightning Network?", "What is USDC?").
- Function-form answers in `FAQContent` (which take `anchorNavigate`) are rendered with a no-op handler; their `href`s remain real links. `extraFaqs` answers are authored as plain strings/JSX.
- This is the FAQ *section embedded in token-pair pages* — distinct from the standalone `/faq` route, whose static rendering stays out of scope (§3).

## 7. CTA deep-link (route pre-selection)

The swap page already reads URL params (`src/hooks/pages/useSwapPage.ts:348`): `tokenIn`, `tokenOut`, `exactIn`, `amount`. Token identifier format (`src/utils/Tokens.ts:108`): on-chain BTC = `BITCOIN`, Lightning = `LIGHTNING`, smart-chain token = `<chainId>:<address>`.

CTA URL shape: `/?tokenIn=<id>&tokenOut=<id>` (e.g. `/?tokenIn=BITCOIN&tokenOut=SOLANA:<usdc-address>`). Smart-chain addresses are **resolved at build time** from the SDK token definitions (`toTokenIdentifier(Tokens.SOLANA.USDC)` etc.), so the matrix references tokens symbolically and addresses never get hardcoded or drift. No app change is required for pre-selection.

## 8. Token-pair matrix

Granularity is **one page per token pair** (not per chain) — e.g. `bitcoin-to-usdc-solana`, not just `bitcoin-to-solana`.

Token universe = the app's supported smart-chain tokens, enumerated from `smartChainTokenArray` (`src/utils/Tokens.ts:49`), which on mainnet includes: Solana (SOL, USDC, WBTC, BONK), Starknet (WBTC, strkBTC, STRK, ETH, USDC), Citrea (cBTC, USDC), Botanix (BTC), Alpen (BTC), GOAT (BTC, PBTC) — gated by which chains are enabled in `ChainsConfig`.

Pairs = `{BITCOIN, LIGHTNING}` × `smartChainTokenArray`, in **both directions**, filtered to pairs the app actually supports (~60 pages at current mainnet config). The set is curatable in the matrix — high-value pairs (BTC/LN ↔ SOL, USDC, STRK, strkBTC, cBTC, ETH) can be prioritised and low-value ones excluded.

Slug scheme: BTC side = `bitcoin` | `lightning`; smart-chain side = `<token>-<chain>` (chain disambiguates same-ticker tokens, e.g. USDC on Solana vs Starknet). Examples: `bitcoin-to-usdc-solana`, `usdc-solana-to-bitcoin`, `lightning-to-sol-solana`, `bitcoin-to-strkbtc-starknet`. URL = `/swap/<slug>`.

`src/seo/routes.ts` exports the generated `SeoRoute[]`:

```ts
type SeoRoute = {
  slug: string;            // 'bitcoin-to-usdc-solana' → /swap/bitcoin-to-usdc-solana
  from: TokenKey;          // symbolic; resolved to tokenIn identifier at build
  to: TokenKey;
  title: string;           // templated, override-able
  description: string;
  h1: string;
  intro: string;
  extraFaqs?: { question: string; answer: string }[];
};
```

Content is **templated with overrides**: defaults derive from token/chain names (title `Swap {FROM} to {TO} on {CHAIN} | Atomiq`, matching description and `h1`), with per-token and per-chain overrides for `intro`/`extraFaqs` (e.g. chain-level "What is Solana?" applied to all Solana-target pairs; token-level "What is USDC?"). Overrides live in a small `src/seo/content.ts` keyed by token/chain. Token identifiers for the CTA (`<chain>:<address>`) are resolved at build time from the SDK token definitions (the orchestrating build script may import the SDK; this is separate from the clean static-render template graph in §4).

## 9. SEO metadata, structured data, sitemap, robots

- **Per-page `<head>`** (built into the static HTML, not Helmet — there is no React runtime on these pages): `<title>`, `<meta name="description">`, `<link rel="canonical">` (absolute, no trailing slash, host `https://app.atomiq.exchange`), Open Graph (`og:title`, `og:description`, `og:url`, `og:image`, `og:type=website`), Twitter card (`summary_large_image`). Interim `og:image` = existing `logo512.png`; recommend a dedicated 1200×630 `og-image.png` (follow-up).
- **JSON-LD** (`<script type="application/ld+json">`): `Organization` + `WebSite` (site-wide), `WebApplication`, and `BreadcrumbList` per landing page. No `FAQPage`.
- **`build/sitemap.xml`** — generated from the token-pair matrix + the home page `/`. (`/about` and `/faq` are out of scope for now — omitted.) Excludes utility/private routes.
- **`public/robots.txt`** — add `Sitemap: https://app.atomiq.exchange/sitemap.xml`; `Disallow` utility routes (`/history`, `/scan`, `/gas`); keep everything else allowed.
- **noindex** on utility routes (`/history`, `/scan`, `/scan/2`, `/gas`) — set client-side (these stay SPA-only); belt-and-suspenders with robots.txt for non-JS crawlers. (Small addition to those page components.)

## 10. Build pipeline

- Add dev dep for transpiling the static template only: `esbuild` (or `tsx`). No headless browser, no Vite SSR, no bundling of `navMenu.js` (it is plain JS in `public/`).
- New `scripts/build-seo.mjs`, wired as `"build": "vite build && node scripts/build-seo.mjs"`:
  1. Read Vite's build manifest (`build/.vite/manifest.json`; enable `build.manifest: true` in `vite.config.ts`) to get the hashed main CSS filename.
  2. Resolve smart-chain token identifiers from the SDK token definitions.
  3. For each token pair: `renderToStaticMarkup(<LandingPage route=…/>)`, wrap in an HTML document template (`<head>` from §9 + `<link>` to the hashed CSS + `<script defer src="/navMenu.js">`), write `build/swap/<slug>/index.html`.
  4. Generate `build/sitemap.xml`.
- `public/navMenu.js` is copied to `build/navMenu.js` by Vite automatically (static asset) — no step needed.
- The static template must remain free of SDK/env/browser-global imports (enforced by the View/wrapper split). If a transitive import unexpectedly pulls a browser global under raw Node, the fallback is to render this one step via Vite SSR (`ssrLoadModule`) — but the design intent is raw Node.

## 11. Hosting / Cloudflare (required)

Today: Azure Storage static website + Cloudflare proxy with a blanket SPA rewrite (everything → `index.html`). A blanket rewrite would clobber the generated files, so the `/swap/` directory must be **whitelisted/excluded** from the SPA rewrite.

- **Decided:** all generated pages live under `/swap/` (`build/swap/<slug>/index.html`). Add an exception to the Cloudflare SPA rule so requests under `/swap/` are served from the Azure origin instead of being rewritten to `/index.html`. No Cloudflare Worker, no generated allowlist.
- `sitemap.xml`, `robots.txt`, `navMenu.js`, and `/assets/*` are real files served from origin as usual.
- **URL shape:** clean `/swap/<slug>` (no extension, no trailing slash); canonical matches exactly. This relies on the origin serving `swap/<slug>/index.html` for the directory path — verify Azure static-website subdirectory-index behaviour with a one-off check before launch; if it does not serve subdirectory indexes, fall back to flat files `build/swap/<slug>.html` served at `/swap/<slug>.html` (same `/swap/` whitelist, `.html` in canonical).

## 12. Link-graph fixes

- `src/pages/AboutPage.tsx:45`: `/FAQPage?tabOpen=6` → `/faq?tabOpen=6` (broken href; trivial correctness fix).
- `src/pages/SwapForGas.tsx:64`: `/FAQPage?tabOpen=11` → `/faq?tabOpen=11`.
- Internal links: each landing page links to related sibling token-pair pages (e.g. same chain, reverse direction) and to the home page `/`, forming a crawlable link graph among the generated pages. (`/about` and `/faq` linking deferred with their static rendering.)

## 13. Testing & verification

- **App regression (production nav):** desktop + mobile menu expand/collapse, "More" dropdown open/close, click-outside close, close-on-link-click, `is-active` highlight, syncing spinner, action-count badge, Settings modal open. This is the main blast radius — the navbar is shipping code.
- **Static output:** `npm run build` produces `build/swap/<slug>/index.html` for every token pair; each has correct `<head>` (title/desc/canonical/OG/JSON-LD), visible H1 + FAQ text in raw HTML (verify with JS disabled / `curl`), working CTA href with correct token identifiers, and the menu works via `/navMenu.js`.
- **Crawlability:** `sitemap.xml` valid and lists the home page + all token-pair pages; `robots.txt` references the sitemap; landing pages render correctly when served at their `/swap/<slug>` path after the Cloudflare `/swap/` whitelist is in place.
- **Typecheck:** `npm run typecheck` clean.

## 14. File change list

New:
- `src/seo/routes.ts` — token-pair matrix (enumerated from `smartChainTokenArray`).
- `src/seo/content.ts` — per-token/per-chain content overrides (intro, extraFaqs).
- `src/seo/LandingPage.tsx` — static landing page component.
- `src/seo/seoHead.ts` — `<head>`/JSON-LD builders.
- `src/components/layout/MainNavigationView.tsx` — presentational nav.
- `src/components/layout/SocialFooterView.tsx` — presentational footer.
- `public/navMenu.js` — plain-JS menu interactivity (shared, no build).
- `scripts/build-seo.mjs` — prerender + sitemap.

Modified:
- `src/components/layout/MainNavigation.tsx` — becomes wrapper; remove unused `FEConstants` import; renders the View.
- `src/components/layout/SocialFooter.tsx` — becomes wrapper around the View.
- `index.html` — add `<script defer src="/navMenu.js">`.
- `src/pages/AboutPage.tsx`, `src/pages/SwapForGas.tsx` — fix FAQ links.
- utility page components (`/history`, `/scan`, `/gas`) — add client-side `noindex`.
- `vite.config.ts` — `build.manifest: true`.
- `package.json` — `build` script + dev dep (`esbuild`/`tsx`).
- `public/robots.txt` — sitemap + disallows.
- Cloudflare SPA rule — whitelist `/swap/` (infra, outside this repo).

## 15. Out of scope / future

- Static rendering of the `/about` and `/faq` pages (and including them in the sitemap + internal links).
- Garden-style interactive swap-widget mock on landing pages.
- SDK/wallet code-splitting in the live app (valuable for Core Web Vitals; separate, higher-risk effort).
- Dedicated 1200×630 OG image.
- More token pairs (just matrix entries).
