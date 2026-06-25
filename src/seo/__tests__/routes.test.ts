import { describe, it, expect } from 'vitest';
import { buildRoutes } from '../routes';

describe('buildRoutes', () => {
  const routes = buildRoutes();

  it('creates both directions for each btc-side x smart-chain pair', () => {
    const slugs = routes.map((r) => r.slug);
    expect(slugs).toContain('bitcoin-to-usdc-solana');
    expect(slugs).toContain('usdc-solana-to-bitcoin');
    expect(slugs).toContain('lightning-to-sol-solana');
    expect(slugs).toContain('strkbtc-starknet-to-lightning');
  });

  it('produces unique slugs and no btc-to-btc pairs', () => {
    const slugs = routes.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(routes.every((r) => r.from.isBtcSide !== r.to.isBtcSide)).toBe(true);
  });

  it('slug equals from.key-to-to.key', () => {
    const r = routes.find((x) => x.slug === 'bitcoin-to-usdc-solana')!;
    expect(r.from.key).toBe('bitcoin');
    expect(r.to.key).toBe('usdc-solana');
  });
});
