import { MainNavigationView, NavItem } from '../components/layout/MainNavigationView';
import { SiteFooterView } from '../components/layout/SiteFooterView';
import { BENEFITS, APP_ORIGIN, DOCS_URL, appSwapHref, routeChipLabel } from './homeContent';
import { TokenIcons } from '../utils/TokenIcons';
import type { ResolvedRoute } from './types';

// Swap/Explorer navigate to the app (absolute, cross-subdomain); Docs/SDK/legal are external.
const NAV_ITEMS: NavItem[] = [
  { link: `${APP_ORIGIN}/`, icon: 'swap-nav', title: 'Swap' },
  { link: `${APP_ORIGIN}/explorer`, icon: 'Explorer', title: 'Explorer' },
  { link: 'https://docs.atomiq.exchange/', icon: 'book', title: 'Docs', external: true },
  { link: 'https://npmjs.com/@atomiqlabs/sdk', icon: 'embed2', title: 'SDK', external: true },
  { link: 'https://www.atomiqlabs.com/terms-of-service', icon: 'file-text', title: 'Terms of Service', external: true },
  { link: 'https://www.atomiqlabs.com/privacy-cookie-policy', icon: 'user', title: 'Privacy Policy', external: true },
];

const LAUNCH_CLASS =
  'btn base-button base-button--primary base-button--smaller d-inline-flex align-items-center text-white text-decoration-none';

export function LandingPage(props: { route: ResolvedRoute; siblings: ResolvedRoute[] }) {
  const { route, siblings } = props;
  const counterpartyChain = route.from.isBtcSide ? route.to.chainName : route.from.chainName;

  return (
    <div className="App d-flex flex-column mk-home">
      <MainNavigationView
        navItems={NAV_ITEMS}
        walletSlot={
          <div className="d-flex justify-content-end">
            <a href={`${APP_ORIGIN}/`} className={LAUNCH_CLASS}>
              Launch App
            </a>
          </div>
        }
        currentPath={`/swap/${route.slug}`}
        networkBadge={{ show: false, label: '' }}
        noTooltip
      />

      {/* ---------- hero ---------- */}
      <section className="mk-hero">
        <div className="mk-wrap">
          <div className="mk-hero__inner">
            <span className="mk-eyebrow">{route.from.ticker} → {route.to.ticker}</span>
            <h1 className="mk-display mk-section__title">{route.h1}</h1>
            <p className="mk-hero__sub">{route.intro}</p>
            <div className="mk-cta">
              <a href={appSwapHref(route.from.tokenId, route.to.tokenId)} className="mk-btn mk-btn--primary">
                Swap {route.from.ticker} to {route.to.ticker}
              </a>
              <a href={DOCS_URL} className="mk-btn mk-btn--ghost" target="_blank" rel="noreferrer">
                Read Docs
                <span className="mk-btn__arrow" aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- why atomiq ---------- */}
      <section className="mk-section">
        <div className="mk-wrap">
          <div className="mk-section__head">
            <span className="mk-eyebrow">Why atomiq</span>
            <h2 className="mk-display mk-section__title">Why swap with Atomiq</h2>
          </div>
          <div className="mk-grid">
            {BENEFITS.map((b) => (
              <div className="mk-card" key={b.title}>
                <h3 className="mk-card__title">{b.title}</h3>
                <p className="mk-card__text">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- what you need ---------- */}
      <section className="mk-section">
        <div className="mk-wrap">
          <div className="mk-section__head">
            <span className="mk-eyebrow">Before you start</span>
            <h2 className="mk-display mk-section__title">What you need</h2>
          </div>
          <div className="mk-note">
            A Bitcoin wallet and a {counterpartyChain} wallet. Connect both in the app to begin your swap.
          </div>
        </div>
      </section>

      {/* ---------- other swap routes → sibling SEO pages (internal linking, popular-route chip style) ---------- */}
      <section className="mk-section">
        <div className="mk-wrap">
          <div className="mk-section__head">
            <span className="mk-eyebrow">Keep exploring</span>
            <h2 className="mk-display mk-section__title">Other swap routes</h2>
          </div>
          <div className="mk-routes">
            {siblings.map((sibling) => (
              <a className="mk-route" href={`/swap/${sibling.slug}`} key={sibling.slug}>
                <img src={TokenIcons[sibling.from.token.ticker]} alt="" aria-hidden="true" />
                <span>{routeChipLabel(sibling.from, sibling.to)}</span>
                <span className="mk-route__arrow" aria-hidden="true">→</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="mk-section">
        <div className="mk-wrap">
          <div className="mk-section__head">
            <span className="mk-eyebrow">Good to know</span>
            <h2 className="mk-display mk-section__title">FAQ</h2>
          </div>
          {/* Native <details> accordion: matches the main FAQ look with zero JS, and keeps
              every answer in the crawlable HTML so the SEO signal is preserved. */}
          <div className="seo-faqs mk-faq">
            {route.faqs.map((faq, i) => (
              <details key={i} open={i === 0}>
                <summary>
                  <span className="seo-faq-number">{i + 1}.</span>
                  <span>{faq.question}</span>
                  <span className="seo-faq-arrow icon icon-caret-down" aria-hidden="true" />
                </summary>
                <div className="seo-faq-answer faq-answer">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <SiteFooterView
        noTooltip
        popularRoutes={siblings.map((s) => ({ slug: s.slug, label: routeChipLabel(s.from, s.to) }))}
      />
    </div>
  );
}
