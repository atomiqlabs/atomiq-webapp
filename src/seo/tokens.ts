import { SwapperFactory } from '@atomiqlabs/sdk';
import { SolanaInitializerV2 } from '@atomiqlabs/chain-solana';
import { StarknetInitializer } from '@atomiqlabs/chain-starknet';
import { CitreaInitializer, BotanixInitializer, AlpenInitializer, GoatInitializer } from '@atomiqlabs/chain-evm';
import type { SeoToken } from './types';

// Single source of truth for token metadata: the SDK's own token table (the same
// SwapperFactory.Tokens the app uses). Building the factory is cheap and side-effect-free
// — no Swapper is initialized — so it is safe in the raw-Node build environment too.
const Factory = new SwapperFactory([
  SolanaInitializerV2, StarknetInitializer, CitreaInitializer, BotanixInitializer, AlpenInitializer, GoatInitializer,
] as any);
const Tokens: any = Factory.Tokens;

export const BTC_SIDE: SeoToken[] = [
  { key: 'bitcoin',   ticker: 'BTC', chainKey: 'bitcoin',   chainName: 'Bitcoin',           tokenId: 'BITCOIN',   isBtcSide: true },
  { key: 'lightning', ticker: 'BTC', chainKey: 'lightning', chainName: 'Lightning Network', tokenId: 'LIGHTNING', isBtcSide: true },
];

// Curated set of smart-chain tokens to generate pages for, as [chainId, SDK token key]
// into Factory.Tokens. Ticker/name/identifier are read from the SDK so this list can never
// drift from the canonical token table. Comment a line out to drop that token's pages.
const CURATED: [string, string][] = [
  ['SOLANA', 'SOL'],
  ['SOLANA', 'USDC'],
  ['SOLANA', 'WBTC'],
  // ['SOLANA', 'BONK'],
  ['STARKNET', 'STRK'],
  ['STARKNET', 'ETH'],
  ['STARKNET', 'WBTC'],
  ['STARKNET', 'strkBTC'],
  ['STARKNET', 'USDC'],
  ['CITREA', 'CBTC'],
  // ['CITREA', 'USDC'],
];

// 'SOLANA' -> 'Solana'. Works for every curated chain; the BTC side sets its names above.
function chainNameOf(chainId: string): string {
  return chainId.charAt(0) + chainId.slice(1).toLowerCase();
}

export const SMART_CHAIN_TOKENS: SeoToken[] = CURATED.map(([chainId, tokenKey]) => {
  const t = Tokens[chainId]?.[tokenKey];
  if (t == null) throw new Error(`Unknown SDK token ${chainId}.${tokenKey}`);
  return {
    key: `${t.ticker.toLowerCase()}-${chainId.toLowerCase()}`,
    ticker: t.ticker,
    chainKey: chainId.toLowerCase(),
    chainName: chainNameOf(chainId),
    tokenId: `${t.chainId}:${t.address}`,
    isBtcSide: false,
  };
});
