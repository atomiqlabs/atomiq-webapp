import type { SeoToken } from './types';

export const BTC_SIDE: SeoToken[] = [
  { key: 'bitcoin', ticker: 'BTC', chainKey: 'bitcoin', chainName: 'Bitcoin', literalId: 'BITCOIN', isBtcSide: true },
  { key: 'lightning', ticker: 'BTC', chainKey: 'lightning', chainName: 'Lightning Network', literalId: 'LIGHTNING', isBtcSide: true },
];

// Mirrors the mainnet entries of smartChainTokenArray (src/utils/Tokens.ts:49).
// Curate here: comment a line out to drop that token's pages.
export const SMART_CHAIN_TOKENS: SeoToken[] = [
  { key: 'sol-solana',     ticker: 'SOL',     chainKey: 'solana',   chainName: 'Solana',   sdkPath: ['SOLANA', 'SOL'],     isBtcSide: false },
  { key: 'usdc-solana',    ticker: 'USDC',    chainKey: 'solana',   chainName: 'Solana',   sdkPath: ['SOLANA', 'USDC'],    isBtcSide: false },
  { key: 'wbtc-solana',    ticker: 'WBTC',    chainKey: 'solana',   chainName: 'Solana',   sdkPath: ['SOLANA', 'WBTC'],    isBtcSide: false },
  { key: 'bonk-solana',    ticker: 'BONK',    chainKey: 'solana',   chainName: 'Solana',   sdkPath: ['SOLANA', 'BONK'],    isBtcSide: false },
  { key: 'strk-starknet',  ticker: 'STRK',    chainKey: 'starknet', chainName: 'Starknet', sdkPath: ['STARKNET', 'STRK'],  isBtcSide: false },
  { key: 'eth-starknet',   ticker: 'ETH',     chainKey: 'starknet', chainName: 'Starknet', sdkPath: ['STARKNET', 'ETH'],   isBtcSide: false },
  { key: 'wbtc-starknet',  ticker: 'WBTC',    chainKey: 'starknet', chainName: 'Starknet', sdkPath: ['STARKNET', 'WBTC'],  isBtcSide: false },
  { key: 'strkbtc-starknet', ticker: 'strkBTC', chainKey: 'starknet', chainName: 'Starknet', sdkPath: ['STARKNET', 'strkBTC'], isBtcSide: false },
  { key: 'usdc-starknet',  ticker: 'USDC',    chainKey: 'starknet', chainName: 'Starknet', sdkPath: ['STARKNET', 'USDC'],  isBtcSide: false },
  { key: 'cbtc-citrea',    ticker: 'cBTC',    chainKey: 'citrea',   chainName: 'Citrea',   sdkPath: ['CITREA', 'CBTC'],    isBtcSide: false },
  { key: 'usdc-citrea',    ticker: 'USDC',    chainKey: 'citrea',   chainName: 'Citrea',   sdkPath: ['CITREA', 'USDC'],    isBtcSide: false },
];
