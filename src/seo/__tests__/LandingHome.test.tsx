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
  it('links popular routes with relative /swap paths', () => {
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
