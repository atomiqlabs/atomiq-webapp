import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LandingHome } from '../LandingHome';
import { APP_ORIGIN, HOME_FAQS } from '../homeContent';

describe('LandingHome', () => {
  const html = renderToStaticMarkup(<LandingHome />);
  it('renders exactly one h1 with the hero headline', () => {
    expect((html.match(/<h1/g) || []).length).toBe(1);
    expect(html).toContain('Swap fully trustlessly between Bitcoin');
  });
  it('points the primary CTA, Launch App, and Swap nav at the app subdomain', () => {
    expect(html).toContain(`href="${APP_ORIGIN}/"`);
  });
  it('deep-links popular-route chips into the app, keeping /swap SEO links in the footer', () => {
    // On-page chips prefill the app; the footer keeps the /swap SEO links for internal equity.
    expect(html).toContain(`href="${APP_ORIGIN}?tokenIn=`);
    expect(html).toMatch(/href="\/swap\/[a-z0-9-]+"/);
    expect(html).not.toContain(`href="${APP_ORIGIN}/swap/`);
  });
  it('renders one FAQ <details> per base FAQ', () => {
    expect((html.match(/<details/g) || []).length).toBe(HOME_FAQS.length);
  });
  it('renders the full site footer', () => {
    expect(html).toContain('Quick Links');
    expect(html).toContain('All rights reserved');
  });
});
