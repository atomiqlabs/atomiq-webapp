import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LandingPage } from '../LandingPage';
import type { ResolvedRoute } from '../types';

const route: ResolvedRoute = {
  slug: 'bitcoin-to-usdc-solana',
  from: { key: 'bitcoin', ticker: 'BTC', chainKey: 'bitcoin', chainName: 'Bitcoin', tokenId: 'BITCOIN', isBtcSide: true },
  to: { key: 'usdc-solana', ticker: 'USDC', chainKey: 'solana', chainName: 'Solana', tokenId: 'SOLANA:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', isBtcSide: false },
  title: 'Swap BTC to USDC on Solana | Atomiq',
  description: 'desc',
  h1: 'Swap BTC to USDC on Solana',
  intro: 'Swap BTC to USDC on Solana trustlessly.',
  faqs: [{ question: 'What is Solana?', answer: <p>Solana is fast.</p> }],
  tokenInId: 'BITCOIN',
  tokenOutId: 'SOLANA:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  ctaHref: '/?tokenIn=BITCOIN&tokenOut=SOLANA:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
};

describe('LandingPage', () => {
  const html = renderToStaticMarkup(<LandingPage route={route} siblingSlugs={['usdc-solana-to-bitcoin']} />);
  it('renders the h1 and intro', () => {
    expect(html).toContain('<h1');
    expect(html).toContain('Swap BTC to USDC on Solana');
    expect(html).toContain('trustlessly');
  });
  it('renders the CTA deep-link', () => {
    // renderToStaticMarkup HTML-encodes & as &amp; in attributes
    expect(html).toContain(`href="${route.ctaHref.replace(/&/g, '&amp;')}"`);
  });
  it('renders FAQ text expanded (crawlable, no accordion)', () => {
    expect(html).toContain('What is Solana?');
    expect(html).toContain('Solana is fast.');
  });
  it('links to sibling pages and home', () => {
    expect(html).toContain('href="/swap/usdc-solana-to-bitcoin"');
    expect(html).toContain('href="/"');
  });
});
