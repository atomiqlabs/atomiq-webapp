import * as React from 'react';
import type { ComposedRoute, FaqItem, SeoRoute, SeoToken } from './types';
import { BASE_FAQS } from './baseFaqs';

function display(token: SeoToken, withChain: boolean): string {
  if (token.chainKey === 'bitcoin') return 'BTC';
  if (token.chainKey === 'lightning') return 'Lightning BTC';
  return withChain ? `${token.ticker} on ${token.chainName}` : token.ticker;
}

const CHAIN_FAQS: Record<string, FaqItem> = {
  solana: {
    question: 'What is Solana?',
    answer: React.createElement('p', null,
      'Solana is a high-performance, low-fee smart-contract blockchain. Atomiq lets you move native Bitcoin in and out of the Solana ecosystem trustlessly, without a custodial bridge or centralized exchange.'),
  },
  starknet: {
    question: 'What is Starknet?',
    answer: React.createElement('p', null,
      'Starknet is an Ethereum layer-2 ZK-rollup. Atomiq enables trustless, atomic swaps between native Bitcoin and Starknet assets, secured by a Bitcoin light client and on-chain contracts.'),
  },
  citrea: {
    question: 'What is Citrea?',
    answer: React.createElement('p', null,
      'Citrea is a Bitcoin rollup. Atomiq lets you swap between native Bitcoin and Citrea assets trustlessly.'),
  },
};

const LIGHTNING_FAQ: FaqItem = {
  question: 'What is the Lightning Network?',
  answer: React.createElement('p', null,
    'The Lightning Network is a Bitcoin layer-2 for instant, low-fee payments. Atomiq supports Lightning as a swap leg, so you can move between Lightning BTC and smart-chain assets in seconds.'),
};

export function composeRoute(route: SeoRoute): ComposedRoute {
  const from = display(route.from, false);
  const to = display(route.to, true);
  const fromFull = display(route.from, true);

  const title = `Swap ${from} to ${to} | atomiq.exchange`;
  const h1 = `Swap ${from} to ${to}`;
  const description =
    `Swap ${fromFull} to ${to} trustlessly via atomiq.exchange — a non-custodial, atomic cross-chain DEX. ` +
    `No centralized exchange, no custodial bridge: just connect your wallets and swap.`;
  const intro =
    `atomiq.exchange lets you swap ${fromFull} to ${to} in a fully trustless, atomic way. ` +
    `Swaps are secured by a Bitcoin light client and on-chain smart contracts, so you keep custody of your funds the entire time and can always reclaim them if a swap does not complete.`;

  const extras: FaqItem[] = [];
  const scChain = route.from.isBtcSide ? route.to.chainKey : route.from.chainKey;
  if (CHAIN_FAQS[scChain]) extras.push(CHAIN_FAQS[scChain]);
  if (route.from.chainKey === 'lightning' || route.to.chainKey === 'lightning') extras.push(LIGHTNING_FAQ);

  return { ...route, title, description, h1, intro, faqs: [...extras, ...BASE_FAQS] };
}
