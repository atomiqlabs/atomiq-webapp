import { describe, it, expect } from 'vitest';
import {
  APP_ORIGIN, HERO, BENEFITS, ESCROW_STEPS, SUPPORTED_CHAINS, POPULAR_ROUTES, HOME_FAQS,
} from '../homeContent';
import { buildRoutes } from '../routes';

describe('homeContent', () => {
  it('APP_ORIGIN is the app subdomain and the hero CTA points at it', () => {
    expect(APP_ORIGIN).toBe('https://app.atomiq.exchange/');
    expect(HERO.primaryCta.href).toBe('https://app.atomiq.exchange/');
  });
  it('has four benefits and four escrow steps', () => {
    expect(BENEFITS).toHaveLength(4);
    expect(ESCROW_STEPS).toHaveLength(4);
  });
  it('supported chains include Bitcoin and Solana', () => {
    expect(SUPPORTED_CHAINS).toContain('Bitcoin');
    expect(SUPPORTED_CHAINS).toContain('Solana');
  });
  it('popular routes are non-empty and all resolve to real slugs', () => {
    const valid = new Set(buildRoutes().map((r) => r.slug));
    expect(POPULAR_ROUTES.length).toBeGreaterThan(0);
    for (const r of POPULAR_ROUTES) expect(valid.has(r.slug)).toBe(true);
  });
  it('popular routes deep-link into the app with the pair prefilled', () => {
    for (const r of POPULAR_ROUTES) {
      expect(r.appHref.startsWith(APP_ORIGIN)).toBe(true);
      expect(r.appHref).toContain(`tokenIn=${r.route.from.tokenId}`);
      expect(r.appHref).toContain(`tokenOut=${r.route.to.tokenId}`);
    }
  });
  it('home FAQs reuse the three base FAQs', () => {
    expect(HOME_FAQS).toHaveLength(3);
  });
  it('copy uses no em or en dashes', () => {
    const blob = JSON.stringify([HERO, BENEFITS, ESCROW_STEPS]);
    expect(blob).not.toMatch(/[–—]/);
  });
});
