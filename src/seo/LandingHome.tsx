import { MainNavigationView, NavItem } from '../components/layout/MainNavigationView';
import { SiteFooterView } from '../components/layout/SiteFooterView';
import {
  APP_ORIGIN, HERO, BENEFITS, ESCROW_HEADING, ESCROW_STEPS, SUPPORTED_CHAINS, POPULAR_ROUTES, HOME_FAQS,
} from './homeContent';

import {TokenIcons} from "../utils/TokenIcons";

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

// Colored chain logos (copied into the marketing bundle via build/icons). Keyed by the
// derived chainName so this stays in step with SUPPORTED_CHAINS; a chain without a mapped
// icon still renders as a text-only chip.
const CHAIN_ICONS: Record<string, string> = {
  Bitcoin: '/icons/chains/BITCOIN.svg',
  'Lightning Network': '/icons/chains/LIGHTNING.svg',
  Solana: '/icons/chains/SOLANA.svg',
  Starknet: '/icons/chains/STARKNET.svg',
  Citrea: '/icons/chains/CITREA.svg',
};

export function LandingHome() {
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
        currentPath="/"
        networkBadge={{ show: false, label: '' }}
        noTooltip
      />

      {/* ---------- hero ---------- */}
      <section className="mk-hero">
        <div className="mk-wrap">
          <div className="mk-hero__inner">
            <span className="mk-eyebrow">Trustless cross-chain DEX</span>
            <h1 className="mk-display mk-hero__title">{HERO.headline}</h1>
            <p className="mk-hero__sub">{HERO.subhead}</p>
            <div className="mk-cta">
              <a href={HERO.primaryCta.href} className="mk-btn mk-btn--primary">
                {HERO.primaryCta.label}
              </a>
              <a href={HERO.secondaryCta.href} className="mk-btn mk-btn--ghost" target="_blank" rel="noreferrer">
                {HERO.secondaryCta.label}
                <span className="mk-btn__arrow" aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>

        {/* Full-bleed lab scene from the company page; the supported-chains strip sits
            below it (see .mk-chains) so it never overlaps the flasks. */}
        <div className="mk-hero__scene" aria-hidden="true">
          <img className="mk-hero__scene-img" src="/hero-lab.svg" alt="" />
        </div>

        <div className="mk-wrap">
          <div className="mk-chains">
            <div className="mk-chains__label">Supported chains</div>
            <ul className="mk-chains__row list-unstyled mb-0">
              {SUPPORTED_CHAINS.map((c) => (
                <li key={c} className="mk-chain">
                  {CHAIN_ICONS[c] && <img src={CHAIN_ICONS[c]} alt="" aria-hidden="true" />}
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- why atomiq ---------- */}
      <section className="mk-section">
        <div className="mk-wrap">
          <div className="mk-section__head">
            <span className="mk-eyebrow">Why atomiq</span>
            <h2 className="mk-display mk-section__title">Swap between Bitcoin &amp; other chains with zero slippage</h2>
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

      {/* ---------- escrow reaction chain ---------- */}
      <section className="mk-section">
        <div className="mk-wrap">
          <div className="mk-section__head">
            <span className="mk-eyebrow">How it works</span>
            <h2 className="mk-display mk-section__title">{ESCROW_HEADING}</h2>
          </div>
          <div className="mk-steps">
            {ESCROW_STEPS.map((step, i) => (
              <div className="mk-step" key={step}>
                <div className="mk-step__num"><span>{i + 1}</span></div>
                <p className="mk-step__text">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- popular routes ---------- */}
      <section className="mk-section">
        <div className="mk-wrap">
          <div className="mk-section__head">
            <span className="mk-eyebrow">Start here</span>
            <h2 className="mk-display mk-section__title">Popular swap routes</h2>
          </div>
          <div className="mk-routes">
            {POPULAR_ROUTES.map((r) => (
              <a className="mk-route" href={`/swap/${r.slug}/`} key={r.slug}>
                <img src={TokenIcons[r.route.from.token.ticker]} alt="" aria-hidden="true" />
                <span>{r.label}</span>
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
            <h2 className="mk-display mk-section__title">Frequently asked questions</h2>
          </div>
          <div className="seo-faqs mk-faq">
            {HOME_FAQS.map((faq, i) => (
              <details key={faq.question} open={i === 0}>
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

      {/* ---------- closing CTA ---------- */}
      <section className="mk-section" style={{ paddingTop: 0 }}>
        <div className="mk-wrap">
          <div className="mk-band">
            <h2 className="mk-display mk-band__title">Ready to swap trustlessly?</h2>
            <p className="mk-band__sub">
              Keep custody the whole time. No bridge, no CEX, no counterparty risk. Open the app and swap in minutes.
            </p>
            <a href={`${APP_ORIGIN}/`} className="mk-btn mk-btn--primary">
              {HERO.primaryCta.label}
            </a>
          </div>
        </div>
      </section>

      <SiteFooterView noTooltip />
    </div>
  );
}
