import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {Token} from '@atomiqlabs/sdk';
import {TokenResolver, Tokens} from '../tokenMeta.generated';
import {Factory} from '../../utils/SwapperFactory';

// Drift guard: regenerates tokenMeta.generated.ts into a temp path and diffs it against
// the committed file. Fails CI if someone edits the SDK token tables (or hand-edits the
// generated file) without re-running `npx tsx scripts/genTokens.ts`.
describe('tokenMeta.generated.ts', () => {
  it('has no drift from what scripts/genTokens.ts currently produces', () => {
    const repoRoot = process.cwd();
    const committedPath = path.resolve(repoRoot, 'src/data/tokenMeta.generated.ts');
    const tmpPath = path.join(os.tmpdir(), `tokenMeta.generated.drift-check.${process.pid}.ts`);

    try {
      execFileSync('npx', ['tsx', 'scripts/genTokens.ts', tmpPath], {
        cwd: repoRoot,
        stdio: 'pipe',
      });
      const committed = fs.readFileSync(committedPath, 'utf8');
      const fresh = fs.readFileSync(tmpPath, 'utf8');
      expect(fresh).toBe(committed);
    } finally {
      fs.rmSync(tmpPath, { force: true });
    }
  }, 30000);

  it('mirrors the factory tokens and token resolvers', () => {
    expect(Object.keys(Tokens)).toEqual(Object.keys(Factory.Tokens));
    expect(Object.keys(TokenResolver)).toEqual(Object.keys(Factory.TokenResolver));

    for (const [chainId, factoryTokens] of Object.entries(Factory.Tokens)) {
      const generatedTokens = Tokens[chainId];
      expect(Object.keys(generatedTokens)).toEqual(Object.keys(factoryTokens));

      for (const [ticker, factoryToken] of Object.entries(factoryTokens)) {
        const generatedToken = generatedTokens[ticker];
        expect(Object.keys(generatedToken)).toEqual(Object.keys(factoryToken));
        for (const [property, value] of Object.entries(factoryToken)) {
          if (typeof value !== 'function') {
            expect(generatedToken[property]).toEqual(value);
          }
        }
        expect(generatedToken.toString()).toBe(factoryToken.toString());
        expect(generatedToken.equals(factoryToken)).toBe(true);
        expect(factoryToken.equals(generatedToken)).toBe(true);
      }
    }

    for (const [chainId, factoryResolver] of Object.entries(Factory.TokenResolver)) {
      const generatedResolver = TokenResolver[chainId];
      for (const factoryToken of Object.values(Factory.Tokens[chainId]) as Token[]) {
        expect(generatedResolver.getToken(factoryToken.address)).toBe(
          Tokens[chainId][factoryResolver.getToken(factoryToken.address).ticker],
        );
      }
      expect(generatedResolver.getToken('unknown-token-address')).toBeUndefined();
    }
  });
});
