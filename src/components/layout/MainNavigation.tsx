import * as React from 'react';
import classNames from 'classnames';
import { Navbar, Container, Nav, Badge, NavDropdown } from 'react-bootstrap';
import Icon from 'react-icons-kit';
import { FEConstants } from '../../FEConstants';
import { BitcoinNetwork, Swapper } from '@atomiqlabs/sdk';
import { WalletConnections } from '../../wallets/WalletConnections';
import { NFCSwitch } from '../../nfc/NFCSwitch';
import { repeat } from 'react-icons-kit/fa/repeat';
import { history } from 'react-icons-kit/fa/history';
import { angleDown } from 'react-icons-kit/fa/angleDown';
import { question } from 'react-icons-kit/fa/question';
import { close } from 'react-icons-kit/fa/close';
import { useLocation } from 'react-router-dom';
import { SocialFooter } from './SocialFooter';
import { BaseButton } from '../BaseButton';

// TODO Icons
const navItems = [
  { link: '/', icon: repeat, title: 'Swap' },
  { link: '/about', icon: history, title: 'Swap History' },
  { link: '/faq', icon: question, title: 'Explorer' },
  { link: '/more', icon: question, title: 'About' },
  { link: '/more-daco', icon: question, title: 'FAQs' },
];

interface MainNavigationProps {
  affiliateLink?: string;
}

export function MainNavigation({ affiliateLink }: MainNavigationProps) {
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);
  const collapseRef = React.useRef<HTMLDivElement>(null);

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

  return (
    <Container className="max-width-100">
      <div>
        <Navbar expand="lg" collapseOnSelect className="main-navigation">
          {isOpen && <div className="main-navigation__overlay" />}
          <Navbar.Brand href="/">
            <div className="d-flex flex-row" style={{ fontSize: '1.5rem' }}>
              <img src="/main_logo.png" className="main-navigation__logo is-desktop" />
              <img src="/logo192.png" className="main-navigation__logo is-mobile" />
              {/*TODO not sure what is this*/}
              {FEConstants.bitcoinNetwork !== BitcoinNetwork.MAINNET ? (
                <Badge
                  className="main-navigation__network ms-2 my-0 align-items-center font-smallest"
                  bg="danger"
                >
                  DEVNETO
                </Badge>
              ) : (
                ''
              )}
            </div>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" onClick={() => setIsOpen(!isOpen)} />
          <div className="main-navigation__wallet">
            <WalletConnections />
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
                  className={classNames('main-navigation__nav__item', {
                    'is-active': location.pathname === item.link,
                    'is-mobile': index >= 3,
                  })}
                >
                  {/*TODO ADD count BADGE*/}
                  <Icon size={20} icon={item.icon} className="main-navigation__nav__item__icon" />
                  <span className="main-navigation__nav__item__text">{item.title}</span>
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
                  <NavDropdown.Item key={item.link} href={item.link}>
                    <Icon size={16} icon={item.icon} className="me-2 main-navigation__item__icon" />
                    {item.title}
                  </NavDropdown.Item>
                ))}
              </NavDropdown>
              <SocialFooter affiliateLink={affiliateLink} />
            </Nav>
          </Navbar.Collapse>
        </Navbar>
      </div>
    </Container>
  );
}
