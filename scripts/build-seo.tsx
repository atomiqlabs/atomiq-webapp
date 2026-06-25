import * as fs from 'fs';
import * as path from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import * as React from 'react';
import { buildRoutes } from '../src/seo/routes';
import { composeRoute } from '../src/seo/content';
import { renderHead, ORIGIN } from '../src/seo/seoHead';
import { LandingPage } from '../src/seo/LandingPage';
import type { ResolvedRoute } from '../src/seo/types';

const BUILD = path.resolve('build');

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
  console.log('Using CSS asset:', css);
  const routes = buildRoutes();
  const composed = routes.map(composeRoute);

  const resolved: ResolvedRoute[] = composed.map((c) => ({
    ...c,
    tokenInId: c.from.tokenId,
    tokenOutId: c.to.tokenId,
    ctaHref: `/?tokenIn=${c.from.tokenId}&tokenOut=${c.to.tokenId}`,
  }));

  for (const route of resolved) {
    const siblings = resolved
      .filter((r) => r.slug !== route.slug && (
        r.from.key === route.to.key || r.to.key === route.from.key ||
        r.from.chainKey === route.from.chainKey || r.to.chainKey === route.to.chainKey
      ))
      .sort((a, b) => siblingScore(a, route) - siblingScore(b, route))
      .slice(0, 8);

    const body = renderToStaticMarkup(React.createElement(LandingPage, { route, siblings }));
    const dir = path.join(BUILD, 'swap', route.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), htmlDocument(route, body, css));
  }

  const urls = ['/', ...resolved.map((r) => `/swap/${r.slug}`)];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${ORIGIN}${u}</loc></url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(BUILD, 'sitemap.xml'), sitemap);

  console.log(`Generated ${resolved.length} landing pages + sitemap (${urls.length} urls).`);
}

main();
