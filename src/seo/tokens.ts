import type { SeoToken } from './types';
import {Tokens} from "../utils/SwapperFactory";
import {SCToken} from "@atomiqlabs/sdk";

export const BTC_SIDE: SeoToken[] = [
  { key: 'bitcoin',   ticker: 'BTC', chainKey: 'bitcoin',   chainName: 'Bitcoin',           tokenId: 'BITCOIN',   isBtcSide: true },
  { key: 'lightning', ticker: 'BTC', chainKey: 'lightning', chainName: 'Lightning Network', tokenId: 'LIGHTNING', isBtcSide: true },
];

// Curated set of smart-chain tokens to generate pages for, as [chainId, SDK token key]
// into Factory.Tokens. Ticker/name/identifier are read from the SDK so this list can never
// drift from the canonical token table. Comment a line out to drop that token's pages.
const CURATED: SCToken[] = [
  Tokens.SOLANA.SOL,
  Tokens.SOLANA.USDC,
  Tokens.SOLANA.WBTC,
  Tokens.STARKNET.STRK,
  Tokens.STARKNET.ETH,
  Tokens.STARKNET.WBTC,
  Tokens.STARKNET.strkBTC,
  Tokens.STARKNET.USDC,
  Tokens.CITREA.CBTC
];

// 'SOLANA' -> 'Solana'. Works for every curated chain; the BTC side sets its names above.
function chainNameOf(chainId: string): string {
  return chainId.charAt(0) + chainId.slice(1).toLowerCase();
}

export const SMART_CHAIN_TOKENS: SeoToken[] = CURATED.map((t) => {
  return {
    key: `${t.ticker.toLowerCase()}-${t.chainId.toLowerCase()}`,
    ticker: t.ticker,
    chainKey: t.chainId.toLowerCase(),
    chainName: chainNameOf(t.chainId),
    tokenId: `${t.chainId}:${t.address}`,
    isBtcSide: false,
  };
});
