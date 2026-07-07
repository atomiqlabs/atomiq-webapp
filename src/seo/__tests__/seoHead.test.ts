import { describe, it, expect } from 'vitest';
import { renderHead, renderLandingHead, ORIGIN } from '../seoHead';
import type { ResolvedRoute } from '../types';

const fixture: ResolvedRoute = {
  slug: 'bitcoin-to-usdc-solana',
  from: { key: 'bitcoin', ticker: 'BTC', chainKey: 'bitcoin', chainName: 'Bitcoin', tokenId: 'BITCOIN', isBtcSide: true, token: null as any },
  to: { key: 'usdc-solana', ticker: 'USDC', chainKey: 'solana', chainName: 'Solana', tokenId: 'SOLANA:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', isBtcSide: false, token: null as any },
  title: 'Swap BTC to USDC on Solana | Atomiq',
  description: 'desc',
  h1: 'Swap BTC to USDC on Solana',
  intro: 'intro',
  faqs: [],
  tokenInId: 'BITCOIN',
  tokenOutId: 'SOLANA:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  ctaHref: '/?tokenIn=BITCOIN&tokenOut=SOLANA:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
};

describe('renderHead', () => {
  const head = renderHead(fixture);
  it('emits title, description, canonical', () => {
    expect(head).toContain('<title>Swap BTC to USDC on Solana | Atomiq</title>');
    expect(head).toContain(`<link rel="canonical" href="${ORIGIN}/swap/bitcoin-to-usdc-solana"/>`);
    expect(head).toContain('<meta name="description" content="desc"/>');
  });
  it('emits og + twitter', () => {
    expect(head).toContain('property="og:title"');
    expect(head).toContain('name="twitter:card" content="summary_large_image"');
  });
  it('emits WebApplication + BreadcrumbList JSON-LD, no FAQPage', () => {
    expect(head).toContain('"@type":"WebApplication"');
    expect(head).toContain('"@type":"BreadcrumbList"');
    expect(head).not.toContain('FAQPage');
  });
  it('canonicalizes to the www marketing origin', () => {
    expect(ORIGIN).toBe('https://www.atomiq.exchange');
  });
});

describe('renderLandingHead', () => {
  const head = renderLandingHead();
  it('uses the www canonical origin at the root', () => {
    expect(head).toContain(`<link rel="canonical" href="${ORIGIN}/"/>`);
  });
  it('emits a title and description', () => {
    expect(head).toContain('<title>');
    expect(head).toContain('<meta name="description"');
  });
  it('emits Organization + WebSite JSON-LD, no route schema', () => {
    expect(head).toContain('"@type":"Organization"');
    expect(head).toContain('"@type":"WebSite"');
    expect(head).not.toContain('WebApplication');
    expect(head).not.toContain('BreadcrumbList');
  });
});
