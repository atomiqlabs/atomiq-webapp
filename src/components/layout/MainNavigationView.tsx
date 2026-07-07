import * as React from 'react';
import classNames from 'classnames';
import { Badge } from 'react-bootstrap';
import { Icon } from 'react-icons-kit';
import { angleDown } from 'react-icons-kit/fa/angleDown';
import { close } from 'react-icons-kit/fa/close';
import { SocialFooterView } from './SocialFooterView';

// Menu open/close is driven by public/navMenu.js (loaded via <script> in index.html
// and on static pages) using the data-nav-* hooks below. Do NOT add React state for
// the mobile toggle / dropdown — keep this component presentational. navMenu.js also
// creates/removes the .main-navigation__overlay backdrop when the menu opens/closes.
export type NavItem = {
  link: string;
  icon?: string;
  title: React.ReactNode;
  count?: number;
  external?: boolean;
  onClick?: (e: React.MouseEvent) => void;
};

export function MainNavigationView(props: {
  navItems: NavItem[];
  walletSlot: React.ReactNode;
  currentPath: string;
  networkBadge: { show: boolean; label: string };
  actionRequiredCount?: number;
  onNavClick?: (e: React.MouseEvent) => void;
  noTooltip?: boolean;
  ellipsisText?: string;
}) {
  const { navItems, walletSlot, currentPath, networkBadge, onNavClick } = props;
  const actionRequiredCount = props.actionRequiredCount ?? 0;
  const primary = navItems.slice(0, 3);
  const more = navItems.slice(3);

  // Internal links use onNavClick (SPA navigation); items with an explicit onClick
  // (e.g. Settings) use that; external links navigate normally in a new tab.
  const clickHandler = (item: NavItem) => item.onClick ?? (item.external ? undefined : onNavClick);
  const externalAttrs = (item: NavItem) =>
    item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  const renderLink = (item: NavItem, mobileOnly: boolean) => (
    <a
      key={item.link}
      href={item.link}
      onClick={clickHandler(item)}
      {...externalAttrs(item)}
      className={classNames('nav-link', 'main-navigation__nav__item', {
        'is-active': currentPath === item.link,
        'is-mobile': mobileOnly,
      })}
    >
      {item.icon && <span className={`main-navigation__nav__item__icon icon icon-${item.icon}`} />}
      <span className="main-navigation__nav__item__text">{item.title}</span>
      {item.count ? <div className="main-navigation__nav__item__count">{item.count}</div> : null}
    </a>
  );

  return (
    <div className="container max-width-100">
      <div>
        <nav className="main-navigation navbar navbar-expand-lg">
          <a className="navbar-brand" href="/">
            <div className="d-flex flex-row" style={{ fontSize: '1.5rem' }}>
              <img src="/main_logo.png" className="main-navigation__logo is-desktop" alt="atomiq" />
              <img src="/logo192.png" className="main-navigation__logo is-mobile" alt="atomiq" />
              {networkBadge.show && (
                <Badge className="main-navigation__network ms-2 my-0 align-items-center font-smallest" bg="danger">
                  {networkBadge.label}
                </Badge>
              )}
            </div>
          </a>

          <button type="button" className="navbar-toggler" data-nav-toggle aria-label="Toggle navigation">
            <span className="navbar-toggler-icon" />
          </button>

          {actionRequiredCount > 0 && (
            <div className="main-navigation__alert">{actionRequiredCount}</div>
          )}

          <div className="main-navigation__wallet">{walletSlot}</div>

          <div className="main-navigation__collapse navbar-collapse" data-nav-collapse role="navigation">
            <div className="main-navigation__nav navbar-nav">
              <div className="main-navigation__nav__mobile-header">
                <a className="nav-link" href="/" onClick={onNavClick}>
                  <img src="/main_logo.png" className="main-navigation__nav__logo" alt="logo" />
                </a>
                <div className="main-navigation__nav__close" data-nav-toggle>
                  <Icon size={20} icon={close} />
                </div>
              </div>

              {primary.map((item) => renderLink(item, false))}
              {more.map((item) => renderLink(item, true))}

              {more.length > 0 && (
                <div className="main-navigation__more dropdown" data-nav-dropdown>
                  <button type="button" className="dropdown-toggle" data-nav-dropdown-toggle>
                    <span className="main-navigation__more__label">
                      <span className="main-navigation__more__text">{props.ellipsisText ?? "More"}</span>
                      <Icon icon={angleDown} size={20} className="main-navigation__more__icon" />
                    </span>
                  </button>
                  <div className="dropdown-menu dropdown-menu-dark">
                    {more.map((item) => (
                      <a
                        key={item.link}
                        href={item.link}
                        onClick={clickHandler(item)}
                        {...externalAttrs(item)}
                        className="dropdown-item"
                      >
                        {item.icon && <span className={`me-2 main-navigation__item__icon icon icon-${item.icon}`} />}
                        {item.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <SocialFooterView isHorizontal={false} noTooltip={props.noTooltip} />
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
