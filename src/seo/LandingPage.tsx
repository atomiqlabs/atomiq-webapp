import * as React from 'react';
import { MainNavigationView, NavItem } from '../components/layout/MainNavigationView';
import { SocialFooterView } from '../components/layout/SocialFooterView';
import type { ResolvedRoute } from './types';

const NAV_ITEMS: NavItem[] = [
  { link: '/', icon: 'swap-nav', title: 'Swap' },
  { link: '/explorer', icon: 'Explorer', title: 'Explorer' },
  { link: 'https://docs.atomiq.exchange/', icon: 'book', title: 'Docs', external: true },
];

export function LandingPage(props: { route: ResolvedRoute; siblingSlugs: string[] }) {
  const { route, siblingSlugs } = props;
  return (
    <div className="App d-flex flex-column">
      <MainNavigationView
        navItems={NAV_ITEMS}
        walletSlot={<a href="/" className="btn btn-primary main-navigation__launch">Launch App</a>}
        currentPath={`/swap/${route.slug}`}
        networkBadge={{ show: false, label: '' }}
      />

      <main className="d-flex flex-grow-1 flex-column mt-4 mt-md-5 container text-white text-start">
        <h1 className="page-title">{route.h1}</h1>
        <p className="lead">{route.intro}</p>
        <p>
          <a href={route.ctaHref} className="btn btn-primary btn-lg">
            Swap {route.from.ticker} to {route.to.ticker}
          </a>
        </p>

        <h2 className="mt-5">Why swap with Atomiq</h2>
        <ul>
          <li><strong>Trustless &amp; atomic:</strong> you keep custody throughout; reclaim funds if a swap does not complete.</li>
          <li><strong>No custodial bridge or CEX:</strong> no deposits, no withdrawals, no counterparty risk.</li>
          <li><strong>Bitcoin light-client security:</strong> swaps are verified against Bitcoin proof-of-work.</li>
          <li><strong>RFQ pricing:</strong> competitive market-maker quotes, no AMM slippage.</li>
        </ul>

        <h2 className="mt-5">What you need</h2>
        <p>
          A Bitcoin wallet and a {route.from.isBtcSide ? route.to.chainName : route.from.chainName} wallet. Connect both in the app to begin.
        </p>

        <h2 className="mt-5">FAQ</h2>
        {route.faqs.map((faq, i) => (
          <section key={i} className="mb-3">
            <h3>{faq.question}</h3>
            <div>{faq.answer}</div>
          </section>
        ))}

        <h2 className="mt-5">Other swap routes</h2>
        <ul>
          {siblingSlugs.map((slug) => (
            <li key={slug}><a href={`/swap/${slug}`}>{slug.replace(/-/g, ' ')}</a></li>
          ))}
          <li><a href="/">Open the Atomiq app</a></li>
        </ul>
      </main>

      <SocialFooterView isHorizontal={false} />
    </div>
  );
}
