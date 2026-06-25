import { describe, it, expect } from 'vitest';
import { composeRoute } from '../content';
import { buildRoutes } from '../routes';

describe('composeRoute', () => {
  const routes = buildRoutes();
  const btcToUsdcSol = routes.find((r) => r.slug === 'bitcoin-to-usdc-solana')!;

  it('builds a title, description, h1 with token + chain context', () => {
    const c = composeRoute(btcToUsdcSol);
    expect(c.title).toBe('Swap BTC to USDC on Solana | Atomiq');
    expect(c.h1).toBe('Swap BTC to USDC on Solana');
    expect(c.description.length).toBeGreaterThan(40);
  });

  it('includes chain-specific extra FAQ for Solana targets', () => {
    const c = composeRoute(btcToUsdcSol);
    const questions = c.faqs.map((f) => f.question);
    expect(questions.some((q) => /What is Solana/i.test(q))).toBe(true);
    expect(c.faqs.length).toBeGreaterThanOrEqual(3); // base + extras
  });

  it('includes Lightning extra FAQ for lightning routes', () => {
    const r = routes.find((x) => x.slug === 'lightning-to-sol-solana')!;
    const c = composeRoute(r);
    expect(c.faqs.map((f) => f.question).some((q) => /Lightning/i.test(q))).toBe(true);
  });
});
