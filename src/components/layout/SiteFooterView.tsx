import { SocialFooterView } from './SocialFooterView';
import { POPULAR_ROUTES } from '../../seo/homeContent';

type FooterLink = { label: string; href: string };
type FooterColumn = { title: string; links: FooterLink[] };

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
  }
];

export function SiteFooterView(props: { noTooltip?: boolean }) {
  return (
    <footer className="site-footer text-white container pt-5 pb-4">
      <div className="row">
        {COLUMNS.map((col) => (
          <div className="col-6 col-md-3 col-lg-3 pb-3" key={col.title}>
            <h3 className="fs-6 fw-semibold mb-3">{col.title}</h3>
            <ul className="list-unstyled mb-0">
              {col.links.map((l) => (
                <li className="mb-2" key={l.label}>
                  <a href={l.href} className="text-white text-opacity-75 text-decoration-none" target="_blank" rel="noreferrer">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="col-6 col-md-3 col-lg-3 pb-3">
          <h3 className="fs-6 fw-semibold mb-3">Popular routes</h3>
          <ul className="list-unstyled mb-0">
            {POPULAR_ROUTES.map((r) => (
              <li className="mb-2" key={r.slug}>
                <a href={`/swap/${r.slug}/`} className="text-white text-opacity-75 text-decoration-none">
                  {r.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="d-flex flex-column flex-md-row align-items-center justify-content-between pt-3 mt-3">
        <SocialFooterView isHorizontal noTooltip={props.noTooltip} />
        <div className="site-footer__copyright text-white text-opacity-50 mt-3 mt-md-0">
          atomiq labs. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
