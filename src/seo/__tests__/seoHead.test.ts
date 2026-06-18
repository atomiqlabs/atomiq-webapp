import { describe, it, expect } from 'vitest';
import { renderHead, ORIGIN } from '../seoHead';
import type { ResolvedRoute } from '../types';

const fixture: ResolvedRoute = {
  slug: 'bitcoin-to-usdc-solana',
  from: { key: 'bitcoin', ticker: 'BTC', chainKey: 'bitcoin', chainName: 'Bitcoin', literalId: 'BITCOIN', isBtcSide: true },
  to: { key: 'usdc-solana', ticker: 'USDC', chainKey: 'solana', chainName: 'Solana', sdkPath: ['SOLANA', 'USDC'], isBtcSide: false },
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
});
