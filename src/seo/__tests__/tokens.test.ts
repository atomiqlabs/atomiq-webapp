import { describe, it, expect } from 'vitest';
import { BTC_SIDE, SMART_CHAIN_TOKENS } from '../tokens';

describe('token catalog', () => {
  it('has bitcoin and lightning on the BTC side with literal ids', () => {
    const keys = BTC_SIDE.map((t) => t.key);
    expect(keys).toEqual(['bitcoin', 'lightning']);
    expect(BTC_SIDE.find((t) => t.key === 'bitcoin')!.literalId).toBe('BITCOIN');
    expect(BTC_SIDE.find((t) => t.key === 'lightning')!.literalId).toBe('LIGHTNING');
  });

  it('smart-chain tokens carry a unique key and sdkPath', () => {
    const usdcSol = SMART_CHAIN_TOKENS.find((t) => t.key === 'usdc-solana');
    expect(usdcSol).toBeDefined();
    expect(usdcSol!.sdkPath).toEqual(['SOLANA', 'USDC']);
    expect(usdcSol!.chainName).toBe('Solana');
    const keys = SMART_CHAIN_TOKENS.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length); // unique
  });
});
