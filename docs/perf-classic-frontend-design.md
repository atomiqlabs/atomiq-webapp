# Classic front-end performance — design (DEFERRED)

Date: 2026-07-13. Repo: `atomiq-webapp`. **Status: deferred** — split out of the main bundle-weight epic (`docs/perf-epic-design.md`) so that work can proceed independently. This doc collects the standard front-end perf fixes that have nothing to do with the SDK/tree-shaking story. Schedule after (or alongside) the bundle epic.

Why separate: the main epic (Layers 1–2 of `perf-epic-design.md`) attacks the ~1.19 MB of eager JS and fixes **LCP**. The items here fix the *other* half of the failing Core Web Vitals (**CLS**) plus landing-mobile and some cheap wins. A fully Passing CWV assessment needs both, but they don't block each other.

## Items

### CLS — app layout stability (target lab CLS < 0.1)

App CLS is 0.55–0.67 (desktop) / 1.02 (mobile) lab, 0.39 field — real layout shift as content and fonts settle. Half of the failing CWV. Fixes:
- `font-display: swap` on every `@font-face` in `assets/fonts/WorkSans/style.css` and `assets/fonts/scandia/{medium,regular}/style.css` (removes the FOIT-then-reflow). WorkSans is TTF-only; a woff2 conversion is a separate weight optimization, not required here.
- Stabilize the conditional loading/error overlay in `App.tsx:29-43` so toggling it doesn't push routed content down (absolutely-position it or reserve its height).
- Reserve stable dimensions for the swap-card region and add explicit `width`/`height` (or `aspect-ratio`) to any dimensionless images.
- Confirm the exact shifting nodes from a fresh **Incognito** Lighthouse trace on `app.atomiq.exchange` (the existing DevTools JSON exports lack node-level data). Note: once the bundle epic renders tokens from static metadata, the biggest swap-card reflow is already gone — re-measure after that lands.

### Route-splitting (app)

`App.tsx` statically imports every route, so a first-time visitor downloads `history`, `gas`, `faq`, `about`, `explorer`, `scan/*`, `NotFound` even though only the index (`SwapNew`) is shown. Convert the non-index routes to `React.lazy` under a `<Suspense>` boundary, keeping `SwapNew` eager. Pulls `qr-scanner` (only used under `/scan`) off the initial chunk. Free, no behavior change.

### Landing mobile (target ≥ 90)

The `www.atomiq.exchange` marketing homepage scores 76 on mobile, dominated by ~2,980 ms render-blocking on the full app CSS bundle plus unmanaged fonts/images (799 KB of images). Fixes: inline critical CSS / load the sheet non-blocking; `preload` the above-fold font + `font-display: swap`; explicit image dimensions + WebP/AVIF responsive sizes; lazy-load below-fold images.

**OPEN QUESTION (blocks this item):** the marketing homepage is generated to a *separate build folder* in the `atomiq-webapp` repo (per Marci), not the tracked `src/`. The in-`src/` `LandingPage.tsx` / `build-seo.tsx` produce the `/swap/*` **SEO** pages on the *app* domain, which are a different artifact. Need the exact source path of the `www` homepage before this can be planned to file level. `[TODO: get marketing-folder path from Marci]`

### Dedup (starknet ×3, @noble versions)

The current bundle contains `starknet` **three times** and multiple duplicate versions of `@noble/*` (different versions pulled by different deps — visible in `npm ls`). Collapse each to a single resolved version (Vite `resolve.dedupe`, and/or aligning the dep versions). Pure byte deletion, independent of everything else. `@noble` is fully tree-shakeable, so this is purely a duplication fix, not a usage one.

### Cache headers — verify only

The team already configured Cloudflare cache rules. Confirm with `curl -sI`: hashed assets (`assets/*.js`, `*.css`, fonts) return a long `max-age … immutable`; the HTML document returns a short/no-cache policy so deploys are picked up. No code change; if wrong, flag to the team.

## Sequencing (when resumed)

All independent. CLS and route-split and dedup and cache-verify can run anytime. Landing mobile waits on the marketing-folder path. Re-measure CLS *after* the bundle epic's static-token render lands, since that removes the largest shift.
