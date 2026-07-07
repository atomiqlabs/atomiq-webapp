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
import { LANDING_CSS } from '../src/seo/landingStyles';
import type { ResolvedRoute } from '../src/seo/types';

const OUT = path.resolve('build-marketing'); // marketing Vite build + generated static pages
const MARKETING_SHELL = 'marketing.html';

function cssHrefs(): string[] {
  const manifestPath = path.join(OUT, '.vite', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entry =
    manifest[MARKETING_SHELL] ??
    Object.values(manifest).find((e: any) => e.css?.length || e.file?.endsWith('.css'));

  const css =
    (entry as any)?.css ?? ((entry as any)?.file?.endsWith('.css') ? [(entry as any).file] : []);
  if (!css.length) throw new Error('No marketing CSS assets found in Vite manifest');
  return css.map((href: string) => '/' + href);
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

function htmlDocument(headHtml: string, body: string, css: string[], headExtra = ''): string {
  const stylesheetLinks = css
    .map((href) => `<link rel="stylesheet" href="${href}" />`)
    .join('\n    ');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.ico" />
    ${stylesheetLinks}
    ${headHtml}
    ${headExtra}
  </head>
  <body>
    <div id="root" class="background">${body}</div>
    <script defer src="/navMenu.js"></script>
  </body>
</html>`;
}

function removeMarketingShell(): void {
  const shellPath = path.join(OUT, MARKETING_SHELL);
  if (fs.existsSync(shellPath)) fs.unlinkSync(shellPath);
}

function main() {
  const css = cssHrefs();
  console.log('Using CSS assets:', css.join(', '));

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
      .filter(
        (r) =>
          r.slug !== route.slug &&
          (r.from.key === route.to.key ||
            r.to.key === route.from.key ||
            r.from.chainKey === route.from.chainKey ||
            r.to.chainKey === route.to.chainKey)
      )
      .sort((a, b) => siblingScore(a, route) - siblingScore(b, route))
      .slice(0, 8);

    const body = renderToStaticMarkup(React.createElement(LandingPage, { route, siblings }));
    const dir = path.join(OUT, 'swap', route.slug);
    fs.mkdirSync(dir, { recursive: true });
    // Swap pages share the landing's .mk-home look, so they get the same inline stylesheet.
    fs.writeFileSync(
      path.join(dir, 'index.html'),
      htmlDocument(renderHead(route), body, css, `<style>${LANDING_CSS}</style>`)
    );
  }

  // Landing page at the marketing root. Its bespoke stylesheet ships inline and scoped
  // (.mk-home) so it stays self-contained and never touches the app or the /swap pages.
  const landingBody = renderToStaticMarkup(React.createElement(LandingHome));
  fs.writeFileSync(
    path.join(OUT, 'index.html'),
    htmlDocument(renderLandingHead(), landingBody, css, `<style>${LANDING_CSS}</style>`)
  );

  removeMarketingShell();

  // One sitemap + robots on the canonical www origin.
  const urls = ['/', ...resolved.map((r) => `/swap/${r.slug}`)];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${ORIGIN}${u}</loc></url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemap);
  fs.writeFileSync(
    path.join(OUT, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`
  );

  console.log(
    `Generated ${resolved.length} swap pages + landing + sitemap/robots into build-marketing/.`
  );
}

main();
