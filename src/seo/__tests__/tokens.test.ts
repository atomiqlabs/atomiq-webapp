import { describe, it, expect } from 'vitest';
import { BTC_SIDE, SMART_CHAIN_TOKENS } from '../tokens';

describe('token catalog', () => {
  it('has bitcoin and lightning on the BTC side with literal token ids', () => {
    const keys = BTC_SIDE.map((t) => t.key);
    expect(keys).toEqual(['bitcoin', 'lightning']);
    expect(BTC_SIDE.find((t) => t.key === 'bitcoin')!.tokenId).toBe('BITCOIN');
    expect(BTC_SIDE.find((t) => t.key === 'lightning')!.tokenId).toBe('LIGHTNING');
  });

  it('derives smart-chain token metadata from the SDK token table', () => {
    const usdcSol = SMART_CHAIN_TOKENS.find((t) => t.key === 'usdc-solana');
    expect(usdcSol).toBeDefined();
    expect(usdcSol!.ticker).toBe('USDC');
    expect(usdcSol!.chainName).toBe('Solana');
    // tokenId is the SDK '<chainId>:<address>' identifier the app consumes
    expect(usdcSol!.tokenId).toMatch(/^SOLANA:.+/);
    const keys = SMART_CHAIN_TOKENS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length); // unique
  });
});
