import * as React from 'react';
import { MainNavigationView, NavItem } from '../components/layout/MainNavigationView';
import { SocialFooterView } from '../components/layout/SocialFooterView';
import type { ResolvedRoute } from './types';

const NAV_ITEMS: NavItem[] = [
  { link: '/', icon: 'swap-nav', title: 'Swap' },
  { link: '/explorer', icon: 'Explorer', title: 'Explorer' },
  { link: 'https://docs.atomiq.exchange/', icon: 'book', title: 'Docs', external: true },
];

// The global `.btn` rule is display:flex (full-width); these inline styles keep the
// landing buttons sized/aligned sensibly outside the app's narrow panels, and give the
// cards the app's translucent surface without relying on Tailwind JIT scanning this file.
const cardStyle: React.CSSProperties = { background: 'rgba(255, 255, 255, 0.08)' };
const launchStyle: React.CSSProperties = { display: 'inline-flex' };

function prettySlug(slug: string): string {
  return slug.replace(/-to-/g, ' → ').replace(/-/g, ' ');
}

export function LandingPage(props: { route: ResolvedRoute; siblingSlugs: string[] }) {
  const { route, siblingSlugs } = props;
  const counterpartyChain = route.from.isBtcSide ? route.to.chainName : route.from.chainName;

  return (
    <div className="App d-flex flex-column">
      <MainNavigationView
        navItems={NAV_ITEMS}
        walletSlot={
          <div className="d-flex justify-content-end">
            <a href="/" className="btn btn-primary" style={launchStyle}>
              Launch App
            </a>
          </div>
        }
        currentPath={`/swap/${route.slug}`}
        networkBadge={{ show: false, label: '' }}
      />

      <div className="d-flex flex-grow-1 flex-column mt-4 mt-md-5">
        <div className="container text-white text-start" style={{ maxWidth: 744 }}>
          <h1 className="page-title">{route.h1}</h1>

          <div className="card border-0 p-4 mb-4" style={cardStyle}>
            <p className="mb-4">{route.intro}</p>
            <a href={route.ctaHref} className="btn btn-primary">
              Swap {route.from.ticker} to {route.to.ticker}
            </a>
          </div>

          <h2 className="page-title fs-4">Why swap with Atomiq</h2>
          <div className="card border-0 p-4 mb-4" style={cardStyle}>
            <ul className="mb-0 ps-3 d-flex flex-column gap-2">
              <li><strong>Trustless &amp; atomic:</strong> you keep custody throughout; reclaim your funds if a swap does not complete.</li>
              <li><strong>No custodial bridge or CEX:</strong> no deposits, no withdrawals, no counterparty risk.</li>
              <li><strong>Bitcoin light-client security:</strong> swaps are verified against Bitcoin proof-of-work.</li>
              <li><strong>RFQ pricing:</strong> competitive market-maker quotes, no AMM slippage.</li>
            </ul>
          </div>

          <h2 className="page-title fs-4">What you need</h2>
          <div className="card border-0 p-4 mb-4" style={cardStyle}>
            <p className="mb-0">A Bitcoin wallet and a {counterpartyChain} wallet. Connect both in the app to begin your swap.</p>
          </div>

          <h2 className="page-title fs-4">FAQ</h2>
          <div className="d-flex flex-column gap-3 mb-4">
            {route.faqs.map((faq, i) => (
              <div key={i} className="card border-0 p-4" style={cardStyle}>
                <h3 className="fs-5 fw-semibold mb-2">{faq.question}</h3>
                <div className="text-white text-opacity-75 seo-faq-answer">{faq.answer}</div>
              </div>
            ))}
          </div>

          <h2 className="page-title fs-4">Other swap routes</h2>
          <div className="card border-0 p-4 mb-5" style={cardStyle}>
            <ul className="mb-0 ps-3 d-flex flex-column gap-1">
              {siblingSlugs.map((slug) => (
                <li key={slug}>
                  <a href={`/swap/${slug}`}>{prettySlug(slug)}</a>
                </li>
              ))}
              <li className="mt-2">
                <a href="/">Open the Atomiq app</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <SocialFooterView isHorizontal={false} />
    </div>
  );
}
