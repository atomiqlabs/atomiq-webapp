import { MainNavigationView, NavItem } from '../components/layout/MainNavigationView';
import { SiteFooterView } from '../components/layout/SiteFooterView';
import {
  APP_ORIGIN, HERO, BENEFITS, ESCROW_HEADING, ESCROW_STEPS, SUPPORTED_CHAINS, POPULAR_ROUTES, HOME_FAQS,
} from './homeContent';

// Swap/Explorer navigate to the app (absolute, cross-subdomain); Docs/SDK/legal are external.
const NAV_ITEMS: NavItem[] = [
  { link: `${APP_ORIGIN}/`, icon: 'swap-nav', title: 'Swap' },
  { link: `${APP_ORIGIN}/explorer`, icon: 'Explorer', title: 'Explorer' },
  { link: 'https://docs.atomiq.exchange/', icon: 'book', title: 'Docs', external: true },
  { link: 'https://npmjs.com/@atomiqlabs/sdk', icon: 'embed2', title: 'SDK', external: true },
  { link: 'https://www.atomiqlabs.com/terms-of-service', icon: 'file-text', title: 'Terms of Service', external: true },
  { link: 'https://www.atomiqlabs.com/privacy-cookie-policy', icon: 'user', title: 'Privacy Policy', external: true },
];

// Copied from LandingPage.tsx so the landing buttons match the app's primary CTA look.
const CTA_CLASS =
  'btn base-button base-button--primary base-button--large w-100 d-flex align-items-center justify-content-center text-white text-decoration-none';
const LAUNCH_CLASS =
  'btn base-button base-button--primary base-button--smaller d-inline-flex align-items-center text-white text-decoration-none';
const CARD_CLASS = 'bg-white/10 rounded-2xl p-4';

export function LandingHome() {
  return (
    <div className="App d-flex flex-column">
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

      <div className="flex-fill text-white container text-start mt-4 mt-md-5 mb-5">
        <h1 className="page-title">{HERO.headline}</h1>

        <div className={`${CARD_CLASS} mb-3`}>
          <p className="mb-4">{HERO.subhead}</p>
          <a href={HERO.primaryCta.href} className={CTA_CLASS}>
            {HERO.primaryCta.label}
          </a>
          <a href={HERO.secondaryCta.href} className="d-inline-block mt-3 text-white" target="_blank" rel="noreferrer">
            {HERO.secondaryCta.label}
          </a>
        </div>

        <h2 className="page-title mt-5">Supported chains</h2>
        <div className={`${CARD_CLASS} mb-3`}>
          <ul className="d-flex flex-wrap gap-3 mb-0 list-unstyled">
            {SUPPORTED_CHAINS.map((c) => (
              <li key={c} className="fw-semibold">{c}</li>
            ))}
          </ul>
        </div>

        <h2 className="page-title mt-5">Why swap with Atomiq</h2>
        <div className="row">
          {BENEFITS.map((b) => (
            <div className="col-12 col-md-6 col-lg-3 pb-3" key={b.title}>
              <div className={`${CARD_CLASS} height-100`}>
                <h3 className="fs-5 fw-semibold mb-2">{b.title}</h3>
                <p className="mb-0 text-white text-opacity-75">{b.text}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="page-title mt-5">{ESCROW_HEADING}</h2>
        <div className="row">
          {ESCROW_STEPS.map((step, i) => (
            <div className="col-12 col-md-6 col-lg-3 pb-3" key={i}>
              <div className={`${CARD_CLASS} height-100`}>
                <div className="fs-4 fw-bold mb-2">{i + 1}</div>
                <p className="mb-0 text-white text-opacity-75">{step}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="page-title mt-5">Popular swap routes</h2>
        <div className={`${CARD_CLASS} mb-3`}>
          <ul className="mb-0 ps-3 d-flex flex-column gap-1">
            {POPULAR_ROUTES.map((r) => (
              <li key={r.slug}>
                <a href={`/swap/${r.slug}`} className="text-white">
                  {r.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <h2 className="page-title mt-5">FAQ</h2>
        <div className="seo-faqs">
          {HOME_FAQS.map((faq, i) => (
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

      <SiteFooterView noTooltip />
    </div>
  );
}
