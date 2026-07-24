import type { SeoRoute, SeoToken } from './types';
import {BTC_SIDE, SMART_CHAIN_TOKENS, toSeoToken} from './tokens';
import {Token} from "@atomiqlabs/sdk";

// Slugs to omit (curation). e.g. 'bonk-solana-to-bitcoin'.
const EXCLUDE = new Set<string>([]);

export function pairTokens(f: Token, t: Token): SeoRoute {
  const from = toSeoToken(f);
  const to = toSeoToken(t);
  return pair(from, to);
}

function pair(from: SeoToken, to: SeoToken): SeoRoute {
  return { slug: `${from.key}-to-${to.key}`, from, to };
}

export function buildRoutes(): SeoRoute[] {
  const routes: SeoRoute[] = [];
  for (const btc of BTC_SIDE) {
    for (const sc of SMART_CHAIN_TOKENS) {
      routes.push(pair(btc, sc)); // BTC -> token
      routes.push(pair(sc, btc)); // token -> BTC
    }
  }
  return routes.filter((r) => !EXCLUDE.has(r.slug));
}
