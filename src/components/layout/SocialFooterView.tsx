import * as React from 'react';

const socialLink = [
  { link: 'https://twitter.com/atomiqlabs', image: 'twitter.png', title: 'Twitter' },
  { link: 'https://github.com/atomiqlabs', image: 'github.png', title: 'GitHub' },
  { link: 'https://t.me/+_MQNtlBXQ2Q1MGEy', image: 'telegram.png', title: 'Telegram' },
  { link: 'https://t.me/atomiq_support', image: 'telegram-support.png', title: 'Talk to support' },
];

export function SocialFooterView(props: { isHorizontal: boolean }) {
  return (
    <div className={`social-footer ${props.isHorizontal ? 'is-horizontal pt-3' : ''}`}>
      {socialLink.map(({ link, image, title }) => (
        <a key={link} href={link} target="_blank" rel="noreferrer" className="social-footer__link" title={title}>
          <img className="social-footer__icon" src={`/icons/socials/${image}`} alt={title} />
        </a>
      ))}
    </div>
  );
}
