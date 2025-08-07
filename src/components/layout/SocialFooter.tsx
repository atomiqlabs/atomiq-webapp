import * as React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import Icon from 'react-icons-kit';
import { heart } from 'react-icons-kit/fa/heart';
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

interface SocialFooterProps {
  affiliateLink?: string;
}

export function SocialFooter({ affiliateLink }: SocialFooterProps) {
  return (
    <div className="social-footer">
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

      {affiliateLink != null && affiliateLink !== '' ? (
        <OverlayTrigger
          placement="left"
          overlay={
            <Tooltip id="referral-tooltip">
              <span>Swap fee reduced to 0.2%, thanks to being referred to atomiq.exchange!</span>
            </Tooltip>
          }
        >
          <div className="social-footer__link gap-2 d-flex is-info">
            <span className="text-decoration-dotted">Using referral link</span>
            <Icon icon={heart} className="social-footer__icon" />
          </div>
        </OverlayTrigger>
      ) : (
        ''
      )}

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
