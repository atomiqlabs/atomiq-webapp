import type { ResolvedRoute } from './types';

export const ATOMIQ_LABS_PAGE = 'https://www.atomiqlabs.com';
export const ORIGIN = 'https://app.atomiq.exchange';
const OG_IMAGE = `${ORIGIN}/logo512.png`;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderHead(route: ResolvedRoute): string {
  const url = `${ORIGIN}/swap/${route.slug}`;
  const t = esc(route.title);
  const d = esc(route.description);
  // No FAQPage schema: Google deprecated FAQ rich results (2026-05-07), so visible FAQ
  // text on the page carries the relevance signal instead. (seoHead.test.ts asserts this.)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', name: 'atomiq labs', url: ATOMIQ_LABS_PAGE, logo: OG_IMAGE },
      { '@type': 'WebSite', name: 'atomiq.exchange', url: ORIGIN },
      { '@type': 'WebApplication', name: route.title, url, applicationCategory: 'FinanceApplication', operatingSystem: 'Web' },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'atomiq.exchange', item: ORIGIN },
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
