import type { ReactNode } from 'react';

export type SeoToken = {
  key: string;          // unique slug part, e.g. 'usdc-solana' | 'bitcoin' | 'lightning'
  ticker: string;       // 'USDC', 'BTC'
  chainKey: string;     // 'solana' | 'starknet' | 'citrea' | 'bitcoin' | 'lightning'
  chainName: string;    // 'Solana', 'Starknet', 'Citrea', 'Bitcoin', 'Lightning Network'
  tokenId: string;      // app swap identifier: '<chainId>:<address>' for smart-chain tokens, 'BITCOIN'/'LIGHTNING' for the BTC side
  isBtcSide: boolean;
};

export type SeoRoute = {
  slug: string;     // 'bitcoin-to-usdc-solana'
  from: SeoToken;
  to: SeoToken;
};

export type FaqItem = { question: string; answer: ReactNode };

export type ComposedRoute = SeoRoute & {
  title: string;
  description: string;
  h1: string;
  intro: string;
  faqs: FaqItem[];
};

export type ResolvedRoute = ComposedRoute & {
  tokenInId: string;   // resolved at build via SDK
  tokenOutId: string;
  ctaHref: string;     // '/?tokenIn=...&tokenOut=...'
};
