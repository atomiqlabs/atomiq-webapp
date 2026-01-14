import * as React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
const socialLink = [
  {
    link: 'https://twitter.com/atomiqlabs',
    image: 'twitter.png',
    title: 'Twitter',
  },
  {
    link: 'https://github.com/atomiqlabs',
    image: 'github.png',
    title: 'GitHub',
  },
  {
    link: 'https://docs.atomiq.exchange/',
    image: 'gitbook.png',
    title: 'GitBook',
  },
  {
    link: 'https://t.me/+_MQNtlBXQ2Q1MGEy',
    image: 'telegram.png',
    title: 'Telegram',
  },
];

export function SocialFooter(props: {}) {
  const location = useLocation();
  const isTablePage = location.pathname === '/history' || location.pathname === '/explorer';

  return (
    <div className={`social-footer ${isTablePage ? 'is-horizontal' : ''}`}>
      {socialLink.map(({ link, image, title }) => (
        <OverlayTrigger
          key={link}
          placement="left"
          overlay={<Tooltip id="referral-tooltip">{title}</Tooltip>}
        >
          <a href={link} target="_blank" className="social-footer__link">
            <img className="social-footer__icon" src={`/icons/socials/${image}`} alt={title} />
          </a>
        </OverlayTrigger>
      ))}

      {/* TODO what about this?*/}
      {/*<Col className="d-flex justify-content-end">*/}
      {/*  <a*/}
      {/*    href="https://t.me/atomiq_support"*/}
      {/*    target="_blank"*/}
      {/*    className="ms-auto d-flex flex-row align-items-center text-white text-decoration-none hover-opacity-75 font-small"*/}
      {/*  >*/}
      {/*    <img className="social-icon me-1" src="/icons/socials/telegram.png" />*/}
      {/*    Talk to support*/}
      {/*  </a>*/}
      {/*</Col>*/}
    </div>
  );
}
