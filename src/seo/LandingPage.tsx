import { MainNavigationView, NavItem } from '../components/layout/MainNavigationView';
import { SiteFooterView } from '../components/layout/SiteFooterView';
import { BENEFITS, APP_ORIGIN } from './homeContent';
import type {ResolvedRoute, SeoToken} from './types';

const NAV_ITEMS: NavItem[] = [
  { link: `${APP_ORIGIN}/`, icon: 'swap-nav', title: 'Swap' },
  { link: `${APP_ORIGIN}/explorer`, icon: 'Explorer', title: 'Explorer' },
  { link: 'https://docs.atomiq.exchange/', icon: 'book', title: 'Docs', external: true },
  { link: 'https://npmjs.com/@atomiqlabs/sdk', icon: 'embed2', title: 'SDK', external: true },
  { link: 'https://www.atomiqlabs.com/terms-of-service', icon: 'file-text', title: 'Terms of Service', external: true },
  { link: 'https://www.atomiqlabs.com/privacy-cookie-policy', icon: 'user', title: 'Privacy Policy', external: true },
];

// Reuse the app's swap-CTA look (BaseButton `--primary`: the purple gradient) so the
// landing buttons match the rest of the app. These are plain anchors because the static
// pages ship no React runtime; the classes carry the styling.
const CTA_CLASS =
  'btn base-button base-button--primary base-button--large w-100 d-flex align-items-center justify-content-center text-white text-decoration-none';
const LAUNCH_CLASS =
  'btn base-button base-button--primary base-button--smaller d-inline-flex align-items-center text-white text-decoration-none';
// Translucent card surface (matches the About page's `bg-white/10` cards) on a plain div,
// which sidesteps the bootstrap `.card` background winning the cascade.
const CARD_CLASS = 'bg-white/10 rounded-2xl p-4';

function prettyToken(token: SeoToken): string {
  if(token.isBtcSide) {
    return token.chainName;
  } else {
    return token.ticker+" on "+token.chainName;
  }
}

export function LandingPage(props: { route: ResolvedRoute; siblings: ResolvedRoute[] }) {
  const { route, siblings } = props;
  const counterpartyChain = route.from.isBtcSide ? route.to.chainName : route.from.chainName;

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
        currentPath={`/swap/${route.slug}`}
        networkBadge={{ show: false, label: '' }}
        noTooltip
      />

      <div className="flex-fill text-white container text-start mt-4 mt-md-5 mb-5">
        <h1 className="page-title">{route.h1}</h1>

        <div className={`${CARD_CLASS} mb-3`}>
          <p className="mb-4">{route.intro}</p>
          <a href={route.ctaHref} className={CTA_CLASS}>
            Swap {route.from.ticker} to {route.to.ticker}
          </a>
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

        <h2 className="page-title mt-5">What you need</h2>
        <div className={`${CARD_CLASS} mb-3`}>
          <p className="mb-0">
            A Bitcoin wallet and a {counterpartyChain} wallet. Connect both in the app to begin your swap.
          </p>
        </div>

        <h2 className="page-title mt-5">FAQ</h2>
        {/* Native <details> accordion: matches the main FAQ look with zero JS, and keeps
            every answer in the crawlable HTML so the SEO signal is preserved. */}
        <div className="seo-faqs">
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

        <h2 className="page-title mt-5">Other swap routes</h2>
        <div className={`${CARD_CLASS} mb-3`}>
          <ul className="mb-0 ps-3 d-flex flex-column gap-1">
            {siblings.map((sibling) => (
              <li key={sibling.slug}>
                <a href={`/swap/${sibling.slug}`} className="text-white">
                  {prettyToken(sibling.from)} → {prettyToken(sibling.to)}
                </a>
              </li>
            ))}
            <li className="mt-2">
              <a href={`${APP_ORIGIN}/`} className="text-white">
                Open the atomiq.exchange app
              </a>
            </li>
          </ul>
        </div>
      </div>

      <SiteFooterView noTooltip />
    </div>
  );
}
