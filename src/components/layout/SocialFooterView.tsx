import { OverlayTrigger, Tooltip } from 'react-bootstrap';

const socialLink = [
  { link: 'https://twitter.com/atomiqlabs', image: 'twitter.png', title: 'Twitter' },
  { link: 'https://github.com/atomiqlabs', image: 'github.png', title: 'GitHub' },
  { link: 'https://t.me/+_MQNtlBXQ2Q1MGEy', image: 'telegram.png', title: 'Telegram' },
  { link: 'https://t.me/atomiq_support', image: 'telegram-support.png', title: 'Talk to support' },
];

// `noTooltip` is used by the prerendered SEO landing pages, which ship no React runtime —
// so the JS-driven react-bootstrap Tooltip can never fire there anyway. Those pages render
// plain links with no tooltip. The app (with React) uses the OverlayTrigger overlay.
export function SocialFooterView(props: { isHorizontal: boolean; noTooltip?: boolean }) {
  return (
    <div className={`social-footer ${props.isHorizontal ? 'is-horizontal pt-3' : ''}`}>
      {socialLink.map(({ link, image, title }) =>
        props.noTooltip ? (
          <a key={link} href={link} target="_blank" rel="noreferrer" className="social-footer__link">
            <img className="social-footer__icon" src={`/icons/socials/${image}`} alt={title} />
          </a>
        ) : (
          <OverlayTrigger
            key={link}
            placement={props.isHorizontal ? 'top' : 'left'}
            overlay={<Tooltip id={`social-tooltip-${title}`}>{title}</Tooltip>}
          >
            <a href={link} target="_blank" rel="noreferrer" className="social-footer__link">
              <img className="social-footer__icon" src={`/icons/socials/${image}`} alt={title} />
            </a>
          </OverlayTrigger>
        )
      )}
    </div>
  );
}
