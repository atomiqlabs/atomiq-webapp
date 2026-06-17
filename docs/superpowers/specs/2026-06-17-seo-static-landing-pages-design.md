# SEO static landing pages — design spec

Date: 2026-06-17
Status: draft (pending review)
Repo: `atomiq-webapp`

## 1. Goal

Make Atomiq discoverable in search for route-specific queries ("trustless swap SOL to BTC", "bridge Bitcoin to Solana", "swap BTC to Starknet") by adding crawlable, route-specific landing pages — without making the interactive SPA itself server-rendered or crawlable. The pattern is Garden Finance's route landing pages, minus the live widget mock: a static, on-brand page per route with real SEO content and a single CTA that hands off to the existing swap app with the route pre-selected.

## 2. Approach (decided)

Generate **standalone static HTML files**, one per swap route, from a route matrix. The pages:

- ship **no React runtime and are never hydrated** — they are plain HTML + the shared compiled CSS + one small shared menu script;
- reuse the app's real chrome (navbar, footer) via a presentational-component split, so they look identical to the app and never drift;
- contain real crawlable content (H1, route copy, supported tokens, trust model, fees note, wallet requirements, FAQ) plus internal links;
- carry a single **"Launch App" / "Swap"** CTA that deep-links into the existing swap page with the route pre-selected via query params (already supported — see §7).

Rejected alternatives (for the record): prerendering the live SPA via headless browser (react-snap / puppeteer snapshot), and a full SSG framework migration (vite-react-ssg / Next). Both fight the app's heavy wallet/SDK/polyfill graph and hydration; the static-files approach shares nothing with the app runtime and is far lower risk.

## 3. Non-goals

- The main app page (`/`) and all existing routes stay **exactly as they are** (behaviour-wise).
- No SSR/hydration of the swap UI.
- No Garden-style interactive/mocked swap widget on landing pages (CTA only for v1; mock is a possible future enhancement).
- No FAQPage JSON-LD (Google deprecated FAQ rich results as of 2026-05-07); visible FAQ text is for relevance/long-tail only.

## 4. Architecture overview

```
Route matrix (src/seo/routes.ts)
        │  drives ↓
        ├── landing page content + per-route FAQ + CTA query params
        ├── sitemap.xml entries
        └── Cloudflare passthrough allowlist (generated artifact)

Presentational components (shared, logic-free)
        ├── MainNavigationView  ← rendered by app wrapper AND static template
        ├── SocialFooterView     ← rendered by app wrapper AND static template
        └── navMenu.ts           ← single source of menu interactivity (event delegation)

Build pipeline (scripts/build-seo.mjs, runs after `vite build`)
        ├── esbuild/tsx transpile of the static template (raw Node, no Vite SSR)
        ├── renderToStaticMarkup(<LandingPage route=…/>) per route
        ├── inject hashed CSS <link> (from Vite manifest) + <script defer src="/navMenu.js">
        ├── write build/swap/<slug>/index.html
        ├── emit build/navMenu.js (esbuild IIFE bundle of navMenu.ts)
        └── emit build/sitemap.xml  (+ updated public/robots.txt copied by vite)
```

The static template's import graph contains **only** React, react-bootstrap, react-icons-kit, the presentational View components, and the route matrix — no `@atomiqlabs/sdk`, no `ChainsConfig`, no `WalletConnector`, no `SettingsModal`, no env. That is what makes a raw-Node `renderToStaticMarkup` viable (see §6, §8).

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
  - Markup uses the existing `main-navigation__*` SCSS classes and carries the `data-*` hooks that `navMenu.ts` drives (see §5.3). Header comment documents the navMenu contract.
  - The react-bootstrap `Navbar`/`Navbar.Collapse`/`NavDropdown` stateful wrappers are replaced with plain semantic elements styled by the same classes, so identical DOM renders in both contexts and the shared script drives it.

- **`MainNavigation.tsx`** (wrapper, app-only) — keeps all current logic: `useContext(SwapperContext)`, action-count effect, `useLocation`, `useAnchorNavigate`, the `ChainsConfig`/`BitcoinNetwork` badge value, `WalletConnector`, `SettingsModal` + `settingsOpened` state. Calls `initNavMenu()` in a `useEffect`. Renders `<MainNavigationView … />`. **Remove the now-unused `FEConstants` import** (confirmed unused).

### 5.2 SocialFooter: View + wrapper split

- **`SocialFooterView.tsx`** — props `{ isHorizontal: boolean }`; renders the existing markup/classes. Tooltips are optional and degrade gracefully without JS (or are dropped in the static path).
- **`SocialFooter.tsx`** (wrapper) — uses `useLocation()` to compute `isHorizontal` (today's `isTablePage` logic) and renders the View.

### 5.3 navMenu.ts (centralized menu interactivity)

- New `src/components/layout/navMenu.ts` — single source of truth for: mobile hamburger toggle, click-outside-to-close, close-on-link-click, and the "More" dropdown. Written with **event delegation** on `document` (matching `data-*` hooks / classes) so it is robust to React mount order and re-renders, and works identically on React-rendered and static DOM. Exposes `initNavMenu()` (idempotent; safe to call once).
- **App:** imported and invoked in `MainNavigation`'s `useEffect`.
- **Static pages:** referenced as `<script defer src="/navMenu.js"></script>`; the build emits `build/navMenu.js` as a standalone esbuild IIFE that self-runs on `DOMContentLoaded`.
- **Documentation:** `MainNavigationView` header comment enumerates the `data-*` hooks and notes both load paths, so the arrangement is discoverable from the component. Realistic size ~25–40 lines.

## 6. Landing page template + content

- **`src/seo/LandingPage.tsx`** — presentational page component, props `{ route }`. Renders, inside the same `App`/`background` wrapper classes the app uses:
  - `<MainNavigationView>` with the static props from §5.1 (Launch App CTA in `walletSlot`, no settings, `currentPath` = page path, no `onNavClick`).
  - Hero: `<h1>` (e.g. "Swap BTC to SOL"), route description paragraph, primary CTA button/link → deep link (see §7).
  - Sections: supported tokens for the route, trust model (trustless/atomic/non-custodial, Bitcoin light-client verification, refund path), fees note (RFQ / competitive market-maker pricing, no AMM slippage), wallet requirements.
  - FAQ section (see §6.1), rendered **expanded** as plain `<section>` blocks (no collapsing accordion → fully crawlable, no JS).
  - `<SocialFooterView isHorizontal={false}/>` plus an internal-links block (all sibling landing pages, `/about`, `/faq`, app `/`).
  - `<head>` content via the SEO helper (§8 / §9): title, meta description, canonical, OG/Twitter, JSON-LD.

### 6.1 FAQ composition (per-route)

- Landing FAQ = a curated **base set** reused from `src/data/FAQContent.tsx` (e.g. "Do I have to trust anyone?", "Why should you use atomiq.exchange?", "Are you audited?") + the route's **`extraFaqs`** from the matrix (e.g. "What is Solana?", "What is the Lightning Network?").
- Function-form answers in `FAQContent` (which take `anchorNavigate`) are rendered with a no-op handler; their `href`s remain real links. `extraFaqs` answers are authored as plain strings/JSX in the matrix.

## 7. CTA deep-link (route pre-selection)

The swap page already reads URL params (`src/hooks/pages/useSwapPage.ts:348`): `tokenIn`, `tokenOut`, `exactIn`, `amount`. Token identifier format (`src/utils/Tokens.ts:108`): on-chain BTC = `BITCOIN`, Lightning = `LIGHTNING`, smart-chain token = `<chainId>:<address>`.

CTA URL shape: `/?tokenIn=<id>&tokenOut=<id>` (e.g. `/?tokenIn=BITCOIN&tokenOut=SOLANA:<sol-address>`). Smart-chain addresses are **resolved at build time** from the SDK token list (`toTokenIdentifier(Tokens.SOLANA.SOL)` etc.) inside the build script, so the matrix references tokens symbolically and addresses never get hardcoded or drift. No app change is required for pre-selection.

## 8. Route matrix

New `src/seo/routes.ts` exporting `SeoRoute[]`:

```ts
type SeoRoute = {
  slug: string;            // e.g. 'btc-to-solana' → /swap/btc-to-solana
  from: TokenKey;          // symbolic, resolved to identifier at build
  to: TokenKey;
  title: string;           // <title> + OG title
  description: string;     // meta description + OG description
  h1: string;
  intro: string;           // hero paragraph
  extraFaqs?: { question: string; answer: string }[];
};
```

Initial routes (from the SEO doc; tokens resolved at build):

- `btc-to-solana` (BITCOIN → SOLANA:SOL)
- `solana-to-btc` (SOLANA:SOL → BITCOIN)
- `btc-to-starknet` (BITCOIN → STARKNET:STRK)
- `starknet-to-btc` (STARKNET:STRK → BITCOIN)
- `btc-to-citrea` (BITCOIN → CITREA:cBTC)
- `citrea-to-btc` (CITREA:cBTC → BITCOIN)
- `lightning-to-solana` (LIGHTNING → SOLANA:SOL)
- `lightning-to-starknet` (LIGHTNING → STARKNET:STRK)

Adding a route is a single matrix entry (drives page, sitemap, allowlist, internal links). The exact `TokenKey` set and any `STARKNET`/Citrea token choices (STRK vs strkBTC/WBTC) are confirmed against the SDK token list during implementation.

## 9. SEO metadata, structured data, sitemap, robots

- **Per-page `<head>`** (built into the static HTML, not Helmet — there is no React runtime on these pages): `<title>`, `<meta name="description">`, `<link rel="canonical">` (absolute, no trailing slash, host `https://app.atomiq.exchange`), Open Graph (`og:title`, `og:description`, `og:url`, `og:image`, `og:type=website`), Twitter card (`summary_large_image`). Interim `og:image` = existing `logo512.png`; recommend a dedicated 1200×630 `og-image.png` (follow-up).
- **JSON-LD** (`<script type="application/ld+json">`): `Organization` + `WebSite` (site-wide), `WebApplication`, and `BreadcrumbList` per landing page. No `FAQPage`.
- **`build/sitemap.xml`** — generated from the matrix + `/`, `/about`, `/faq`. Excludes utility/private routes.
- **`public/robots.txt`** — add `Sitemap: https://app.atomiq.exchange/sitemap.xml`; `Disallow` utility routes (`/history`, `/scan`, `/gas`); keep everything else allowed.
- **noindex** on utility routes (`/history`, `/scan`, `/scan/2`, `/gas`) — set client-side (these stay SPA-only); belt-and-suspenders with robots.txt for non-JS crawlers. (Small addition to those page components.)

## 10. Build pipeline

- Add dev deps: `esbuild` (or `tsx`) for transpiling the static template; no headless browser, no Vite SSR.
- New `scripts/build-seo.mjs`, wired as `"build": "vite build && node scripts/build-seo.mjs"`:
  1. Read Vite's build manifest (`build/.vite/manifest.json`; enable `build.manifest: true` in `vite.config.ts`) to get the hashed main CSS filename.
  2. Resolve smart-chain token identifiers from the SDK token list.
  3. For each route: `renderToStaticMarkup(<LandingPage route=…/>)`, wrap in an HTML document template (`<head>` from §9 + `<link>` to the hashed CSS + `<script defer src="/navMenu.js">`), write `build/swap/<slug>/index.html`.
  4. Bundle `src/components/layout/navMenu.ts` → `build/navMenu.js` (esbuild, IIFE, minified).
  5. Generate `build/sitemap.xml`.
- The static template must remain free of SDK/env/browser-global imports (enforced by the View/wrapper split). If a transitive import unexpectedly pulls a browser global under raw Node, the fallback is to render this one step via Vite SSR (`ssrLoadModule`) — but the design intent is raw Node.

## 11. Hosting / Cloudflare passthrough (required)

Today: Azure Storage static website + Cloudflare proxy with a blanket SPA rewrite (everything → `index.html`). A blanket rewrite would clobber the prerendered files, so the rewrite must become a **true fallback**.

- **Recommended:** a small Cloudflare **Worker** as the routing brain:
  - request path in the generated SEO allowlist (`/swap/<slug>`, `/about`, `/faq`) → fetch origin `…/<path>/index.html`, return it;
  - real asset (extension, `/assets/*`, `/sitemap.xml`, `/robots.txt`, `/navMenu.js`) → pass through to Azure;
  - everything else (`/`, `/history`, `/scan`, unknown) → serve root `/index.html` (today's behaviour).
  - The allowlist is emitted by the build so the Worker stays in sync.
- **Lighter alternative:** exclude `/swap/*`, `/about`, `/faq` from the rewrite and rely on Azure serving subdirectory `index.html`. Azure Storage's trailing-slash/subdirectory-index behaviour is **not asserted here** — verify with a one-off test before relying on it; the Worker avoids the question entirely.
- **URL shape (decided):** clean `/swap/btc-to-solana` (no extension, no trailing slash); build output at `build/swap/<slug>/index.html`; canonical matches exactly.

## 12. Link-graph fixes (carried over)

- `src/pages/AboutPage.tsx:45`: `/FAQPage?tabOpen=6` → `/faq?tabOpen=6`.
- `src/pages/SwapForGas.tsx:64`: `/FAQPage?tabOpen=11` → `/faq?tabOpen=11`.
- Add crawlable internal links to `/about`, `/faq`, and all landing pages (footer internal-links block in the shared chrome + landing-page internal-links section). Nothing links to the landing pages today.

## 13. Testing & verification

- **App regression (production nav):** desktop + mobile menu expand/collapse, "More" dropdown open/close, click-outside close, close-on-link-click, `is-active` highlight, syncing spinner, action-count badge, Settings modal open. This is the main blast radius — the navbar is shipping code.
- **Static output:** `npm run build` produces `build/swap/<slug>/index.html` for every route; each has correct `<head>` (title/desc/canonical/OG/JSON-LD), visible H1 + FAQ text in raw HTML (verify with JS disabled / `curl`), working CTA href with correct token identifiers, and the menu works via `/navMenu.js`.
- **Crawlability:** `sitemap.xml` valid and lists all public routes; `robots.txt` references the sitemap; no `noindex` on landing pages; landing pages render correctly when served at their clean path (post-Cloudflare config).
- **Typecheck:** `npm run typecheck` clean.

## 14. File change list

New:
- `src/seo/routes.ts` — route matrix.
- `src/seo/LandingPage.tsx` — static landing page component.
- `src/seo/seoHead.ts` (or similar) — `<head>`/JSON-LD builders.
- `src/components/layout/MainNavigationView.tsx` — presentational nav.
- `src/components/layout/SocialFooterView.tsx` — presentational footer.
- `src/components/layout/navMenu.ts` — menu interactivity (shared).
- `scripts/build-seo.mjs` — prerender + sitemap + navMenu bundle.

Modified:
- `src/components/layout/MainNavigation.tsx` — becomes wrapper; remove `FEConstants` import; call `initNavMenu()`.
- `src/components/layout/SocialFooter.tsx` — becomes wrapper around the View.
- `src/pages/AboutPage.tsx`, `src/pages/SwapForGas.tsx` — fix FAQ links.
- utility page components — add client-side `noindex`.
- `vite.config.ts` — `build.manifest: true`.
- `package.json` — `build` script + dev deps (`esbuild`/`tsx`).
- `public/robots.txt` — sitemap + disallows.
- Cloudflare Worker / config — passthrough allowlist (infra, outside this repo unless we store the Worker here).

## 15. Out of scope / future

- Garden-style interactive swap-widget mock on landing pages.
- SDK/wallet code-splitting in the live app (valuable for Core Web Vitals; separate, higher-risk effort).
- Dedicated 1200×630 OG image.
- More routes / token pairs (just matrix entries).
