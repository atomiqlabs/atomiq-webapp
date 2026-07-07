import { SocialFooterView } from './SocialFooterView';
import { POPULAR_ROUTES } from '../../seo/homeContent';
import { ORIGIN } from '../../seo/seoHead';

type FooterLink = { label: string; href: string };
type FooterColumn = { title: string; links: FooterLink[] };
type PopularRoutesHrefMode = 'relative' | 'absolute';

// Column links mirror the atomiqlabs.com footer; all are external, so they carry absolute URLs.
const COLUMNS: FooterColumn[] = [
  {
    title: 'Quick Links',
    links: [
      { label: 'About us', href: 'https://www.atomiqlabs.com/about' },
      { label: 'Contact us', href: 'mailto:info@atomiqlabs.com' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'FAQs', href: 'https://www.atomiqlabs.com/resources#faq' },
      { label: 'Docs', href: 'https://docs.atomiq.exchange/' },
      { label: 'Audits', href: 'https://github.com/atomiqlabs/atomiq-readme/tree/main/audits' },
      { label: 'SDK', href: 'https://npmjs.com/@atomiqlabs/sdk' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: 'https://www.atomiqlabs.com/terms-of-service' },
      { label: 'Privacy Policy', href: 'https://www.atomiqlabs.com/privacy-cookie-policy' },
      { label: 'Cookie Policy', href: 'https://www.atomiqlabs.com/privacy-cookie-policy' },
    ],
  },
];

function popularRouteHref(slug: string, mode: PopularRoutesHrefMode): string {
  const path = `/swap/${slug}/`;
  return mode === 'absolute' ? `${ORIGIN}${path}` : path;
}

// The "Popular routes" column defaults to the site-wide POPULAR_ROUTES (used on the
// landing). Swap pages pass their own sibling routes so the footer mirrors the on-page
// "Other swap routes" list. Both keep the /swap/<slug>/ SEO links for internal equity.
export function SiteFooterView(props: {
  noTooltip?: boolean;
  popularRoutes?: { slug: string; label: string }[];
  popularRoutesHrefMode?: PopularRoutesHrefMode;
  hideSocialLinks?: boolean;
  showTopAccentBorder?: boolean;
}) {
  const popularRoutes = props.popularRoutes ?? POPULAR_ROUTES;
  const popularRoutesHrefMode = props.popularRoutesHrefMode ?? 'relative';
  return (
    <footer
      className={`site-footer${props.showTopAccentBorder ? ' site-footer--with-top-accent' : ''} text-white container pt-5 pb-4`}
    >
      <div className="row">
        {COLUMNS.map((col) => (
          <div className="col-6 col-md-3 col-lg-3 pb-3" key={col.title}>
            <h3 className="fs-6 fw-semibold mb-3">{col.title}</h3>
            <ul className="list-unstyled mb-0">
              {col.links.map((l) => (
                <li className="mb-2" key={l.label}>
                  <a
                    href={l.href}
                    className="text-white text-opacity-75 text-decoration-none"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="col-6 col-md-3 col-lg-3 pb-3 site-footer__popular">
          <h3 className="fs-6 fw-semibold mb-3">Popular routes</h3>
          <ul className="list-unstyled mb-0">
            {popularRoutes.map((r) => (
              <li className="mb-2" key={r.slug}>
                <a
                  href={popularRouteHref(r.slug, popularRoutesHrefMode)}
                  className="text-white text-opacity-75 text-decoration-none"
                >
                  {r.label}
                </a>
              </li>
            ))}
          </ul>

          {props.hideSocialLinks ? null : (
            <div className="site-footer__social">
              <SocialFooterView isHorizontal noTooltip={props.noTooltip} />
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
