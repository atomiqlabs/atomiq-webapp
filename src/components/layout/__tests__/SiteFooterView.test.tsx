import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SiteFooterView } from '../SiteFooterView';

describe('SiteFooterView', () => {
  const html = renderToStaticMarkup(<SiteFooterView />);
  it('renders link columns, socials, and copyright', () => {
    expect(html).toContain('Quick Links');
    expect(html).toContain('Resources');
    expect(html).toContain('Legal');
    expect(html).toContain('Company');
    expect(html).toContain('href="https://docs.atomiq.exchange/"');
    expect(html).toContain('href="https://twitter.com/atomiqlabs"'); // from SocialFooterView
    expect(html).toContain('All rights reserved');
  });
  it('uses relative /swap route links (same www origin)', () => {
    expect(html).toMatch(/href="\/swap\/[a-z0-9-]+"/);
    expect(html).not.toContain('href="https://app.atomiq.exchange/swap/');
  });
});
