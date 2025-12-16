import * as React from 'react';
import classNames from 'classnames';
import { Navbar, Container, Nav, Badge, NavDropdown } from 'react-bootstrap';
import Icon from 'react-icons-kit';
import { FEConstants } from '../../FEConstants';
import { BitcoinNetwork, SwapType } from '@atomiqlabs/sdk';
import { WalletConnector } from '../wallets/WalletConnector';
import { angleDown } from 'react-icons-kit/fa/angleDown';
import { close } from 'react-icons-kit/fa/close';
import { useLocation } from 'react-router-dom';
import { SocialFooter } from './SocialFooter';
import { SwapperContext } from '../../context/SwapperContext';
import { useAnchorNavigate } from '../../hooks/navigation/useAnchorNavigate';
import {ChainsConfig} from "../../data/ChainsConfig";

export function MainNavigation(props: {}) {
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [actionRequiredCount, setActionRequiredCount] = React.useState<number>(0);
  const collapseRef = React.useRef<HTMLDivElement>(null);
  const { swapper } = React.useContext(SwapperContext);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        collapseRef.current &&
        !collapseRef.current.contains(event.target as Node) &&
        !event
          .composedPath()
          .some((el) => (el as HTMLElement).classList?.contains('navbar-toggler'))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  React.useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    if (swapper == null) {
      return;
    }

    const updateActionCount = async () => {
      const swaps = await swapper.getActionableSwaps();
      const initiated = swaps.filter((swap) => swap.isInitiated());
      const notTrusted = initiated.filter(
        (swap) =>
          swap.getType() !== SwapType.TRUSTED_FROM_BTC &&
          swap.getType() !== SwapType.TRUSTED_FROM_BTCLN
      );
      const requiresAction = notTrusted.filter((swap) => swap.requiresAction());
      setActionRequiredCount(requiresAction.length);
    };

    updateActionCount();

    const listener = () => {
      updateActionCount();
    };
    swapper.on('swapState', listener);

    return () => {
      swapper.off('swapState', listener);
    };
  }, [swapper]);

  const navItems = [
    { link: '/', icon: 'swap-nav', title: 'Swap' },
    {
      link: '/history',
      icon: 'Swap-History',
      title: 'Swap History',
      count: actionRequiredCount > 0 ? actionRequiredCount : undefined,
    },
    { link: '/explorer', icon: 'Explorer', title: 'Explorer' },
    { link: '/about', icon: 'info', title: 'About' },
    { link: '/faq', icon: 'quesitons', title: 'FAQs' },
  ];

  const anchorNavigate = useAnchorNavigate();

  return (
    <Container className="max-width-100">
      <div>
        <Navbar expand="lg" collapseOnSelect className="main-navigation">
          {isOpen && <div className="main-navigation__overlay" />}
          <Navbar.Brand href="/">
            <div className="d-flex flex-row" style={{ fontSize: '1.5rem' }}>
              <img src="/main_logo.png" className="main-navigation__logo is-desktop" />
              <img src="/logo192.png" className="main-navigation__logo is-mobile" />

              {ChainsConfig.BITCOIN.network !== BitcoinNetwork.MAINNET ? (
                <Badge
                  className="main-navigation__network ms-2 my-0 align-items-center font-smallest"
                  bg="danger"
                >
                  {BitcoinNetwork[ChainsConfig.BITCOIN.network]}
                </Badge>
              ) : (
                ''
              )}
            </div>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" onClick={() => setIsOpen(!isOpen)} />
          {actionRequiredCount > 0 && (
            <div className="main-navigation__alert">{actionRequiredCount}</div>
          )}
          <div className="main-navigation__wallet">
            <WalletConnector />
          </div>
          <Navbar.Collapse
            ref={collapseRef}
            in={isOpen}
            role="navigation"
            id="basic-navbar-nav"
            className={classNames('main-navigation__collapse', { show: isOpen })}
          >
            <Nav className="main-navigation__nav">
              <div className="main-navigation__nav__mobile-header">
                <Nav.Link href="/">
                  <img src="/main_logo.png" className="main-navigation__nav__logo" alt="logo" />
                </Nav.Link>
                <div className="main-navigation__nav__close" onClick={() => setIsOpen(false)}>
                  <Icon size={20} icon={close} />
                </div>
              </div>

              {navItems.map((item, index) => (
                <Nav.Link
                  key={item.link}
                  href={item.link}
                  onClick={anchorNavigate}
                  className={classNames('main-navigation__nav__item', {
                    'is-active': location.pathname === item.link,
                    'is-mobile': index >= 3,
                  })}
                >
                  {item.icon && (
                    <span
                      className={`main-navigation__nav__item__icon icon icon-${item.icon}`}
                    ></span>
                  )}
                  <span className="main-navigation__nav__item__text">{item.title}</span>
                  {item.count && (
                    <div className="main-navigation__nav__item__count">{item.count}</div>
                  )}
                </Nav.Link>
              ))}

              <NavDropdown
                className="main-navigation__more"
                title={
                  <span className="main-navigation__more__label">
                    <span className="main-navigation__more__text">More</span>
                    <Icon icon={angleDown} size={20} className="main-navigation__more__icon" />
                  </span>
                }
                menuVariant="dark"
              >
                {navItems.slice(3).map((item) => (
                  <NavDropdown.Item key={item.link} href={item.link} onClick={anchorNavigate}>
                    <span
                      className={`me-2 main-navigation__item__icon icon icon-${item.icon}`}
                    ></span>
                    {item.title}
                  </NavDropdown.Item>
                ))}
              </NavDropdown>
              <SocialFooter />
            </Nav>
          </Navbar.Collapse>
        </Navbar>
      </div>
    </Container>
  );
}
