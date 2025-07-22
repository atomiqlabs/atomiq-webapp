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
        <a key={link} href={link} target="_blank" className="social-footer__link">
          <img className="social-footer__icon" src={`/icons/socials/${image}`} alt={title} />
        </a>
      ))}

      {/* TODO not tested*/}
      {affiliateLink != null && affiliateLink !== '' ? (
        <OverlayTrigger
          overlay={
            <Tooltip id="referral-tooltip">
              <span>Swap fee reduced to 0.2%, thanks to being referred to atomiq.exchange!</span>
            </Tooltip>
          }
        >
          <div className="font-small text-white opacity-75 d-flex align-items-center ">
            <Icon icon={heart} className="d-flex align-items-center me-1" />
            <span className="text-decoration-dotted">Using referral link</span>
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
