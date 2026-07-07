import type {FaqItem, SeoRoute, SeoToken} from './types';
import { BASE_FAQS } from './baseFaqs';
import { BTC_SIDE, SMART_CHAIN_TOKENS } from './tokens';
import {pairTokens} from './routes';
import {Tokens} from "../utils/SwapperFactory";

// The app / deep-link origin. The marketing site lives on www.atomiq.exchange (see seoHead ORIGIN);
// every app-directed link is absolute to this subdomain.
export const APP_ORIGIN = 'https://app.atomiq.exchange/';
export const DOCS_URL = 'https://docs.atomiq.exchange/';

export const HERO = {
  headline: 'Swap fully trustlessly between Bitcoin & other chains',
  subhead:
    'Unlock fully trustless swaps between Bitcoin and other chains. Enjoy secure, efficient transactions with no intermediaries, fully non-custodial.',
  primaryCta: { label: 'Swap now', href: APP_ORIGIN },
  secondaryCta: { label: 'Read Docs', href: DOCS_URL },
};

export const BENEFITS: { title: string; text: string }[] = [
  { title: 'Trustless & atomic', text: 'You keep custody the entire time and can always reclaim your funds if a swap does not complete.' },
  { title: 'No bridge or CEX', text: 'No custodial bridge and no centralized exchange: no deposits, no withdrawals, no counterparty risk.' },
  { title: 'Bitcoin-secured', text: 'Swaps are verified against Bitcoin proof-of-work via an on-chain Bitcoin light client.' },
  { title: 'RFQ pricing', text: 'Competitive quotes straight from market makers, with no AMM pools and no slippage.' },
];

export const ESCROW_HEADING = "The atomiq escrow, secured by Bitcoin's proof of work";
export const ESCROW_STEPS: string[] = [
  'Tokens are locked in a smart contract vault on the smart chain (e.g. Solana).',
  'To unlock the vault and get access to the tokens, the counterparty must send a valid Bitcoin transaction.',
  'The smart contract verifies the transaction using a Bitcoin light client, which saves Bitcoin transaction data on the smart chain.',
  'If the Bitcoin payment is confirmed, the vault releases the funds. If not, the trade does not go through and you receive your tokens back.',
];

// Unique chain names in display order (BTC side first). Derived so it cannot drift.
export const SUPPORTED_CHAINS: string[] = Array.from(
  new Set([...BTC_SIDE, ...SMART_CHAIN_TOKENS].map((t) => t.chainName)),
);

export type PopularRoute = { slug: string; label: string, route: SeoRoute };
// Up to nine BTC -> smart-chain routes (currently all of them, incl. Citrea), straight
// from buildRoutes() so every slug is real.
export const POPULAR_ROUTES: PopularRoute[] = [
  pairTokens(Tokens.BITCOIN.BTC, Tokens.STARKNET.strkBTC),
  pairTokens(Tokens.STARKNET.strkBTC, Tokens.BITCOIN.BTC),
  pairTokens(Tokens.BITCOIN.BTC, Tokens.STARKNET.WBTC),
  pairTokens(Tokens.STARKNET.WBTC, Tokens.BITCOIN.BTC),
  pairTokens(Tokens.BITCOIN.BTC, Tokens.SOLANA.SOL),
  pairTokens(Tokens.SOLANA.SOL, Tokens.BITCOIN.BTC),
  pairTokens(Tokens.BITCOIN.BTC, Tokens.SOLANA.USDC),
  pairTokens(Tokens.SOLANA.USDC, Tokens.BITCOIN.BTC),
  pairTokens(Tokens.BITCOIN.BTCLN, Tokens.SOLANA.SOL),
  pairTokens(Tokens.SOLANA.SOL, Tokens.BITCOIN.BTCLN),
]
  .slice(0, 9)
  .map((r) => ({
    slug: r.slug,
    label: r.from.isBtcSide ? `${r.from.ticker} to ${r.to.ticker} on ${r.to.chainName}` : `${r.from.ticker} on ${r.from.chainName} to ${r.to.ticker}`,
    route: r
  }));

export const HOME_FAQS: FaqItem[] = BASE_FAQS;
