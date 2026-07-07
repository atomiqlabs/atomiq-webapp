import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SiteFooterView } from '../SiteFooterView';
import { ORIGIN } from '../../../seo/seoHead';

describe('SiteFooterView', () => {
  const html = renderToStaticMarkup(<SiteFooterView noTooltip />);
  it('renders link columns and socials', () => {
    expect(html).toContain('Quick Links');
    expect(html).toContain('Resources');
    expect(html).toContain('Legal');
    expect(html).toContain('Popular routes');
    expect(html).toContain('href="https://docs.atomiq.exchange/"');
    expect(html).toContain('href="https://twitter.com/atomiqlabs"'); // from SocialFooterView
  });
  it('uses relative /swap route links (same www origin)', () => {
    expect(html).toMatch(/href="\/swap\/[a-z0-9-]+\/"/);
    expect(html).not.toContain('href="https://app.atomiq.exchange/swap/');
  });

  it('can use absolute popular-route links to the marketing site', () => {
    const absoluteHtml = renderToStaticMarkup(
      <SiteFooterView noTooltip popularRoutesHrefMode="absolute" />
    );
    expect(absoluteHtml).toMatch(new RegExp(`href="${ORIGIN}/swap/[a-z0-9-]+/"`));
    expect(absoluteHtml).not.toContain('href="https://app.atomiq.exchange/swap/');
  });
});
