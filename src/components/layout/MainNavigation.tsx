import * as React from 'react';
import classNames from 'classnames';
import { Navbar, Container, Nav, Badge, NavDropdown } from 'react-bootstrap';
import Icon from 'react-icons-kit';
import { FEConstants } from '../../FEConstants';
import { BitcoinNetwork, Swapper } from '@atomiqlabs/sdk';
import { WalletConnectionsSummary } from '../../wallets/WalletConnectionsSummary';
import { NFCSwitch } from '../../nfc/NFCSwitch';
import { repeat } from 'react-icons-kit/fa/repeat';
import { history } from 'react-icons-kit/fa/history';
import { angleDown } from 'react-icons-kit/fa/angleDown';
import { question } from 'react-icons-kit/fa/question';
import { useLocation } from 'react-router-dom';

// TODO Icons
const navItems = [
  { link: '/', icon: repeat, title: 'Swap' },
  { link: '/about', icon: history, title: 'Swap history' },
  { link: '/faq', icon: question, title: 'Explorer' },
  { link: '/more', icon: question, title: 'Zblunk' },
  { link: '/more', icon: question, title: 'Haw' },
  { link: '/more', icon: question, title: 'Mew' },
];

export function MainNavigation() {
  const location = useLocation();
  return (
    <Container className="max-width-100">
      <Navbar collapseOnSelect className="main-navigation">
        {/* LOGO */}
        <Navbar.Brand href="/" className="d-flex flex-column">
          <div className="d-flex flex-row" style={{ fontSize: '1.5rem' }}>
            <img src="/main_logo.png" className="main-navigation__logo" />
            {/*TODO not sure what is this*/}
            {FEConstants.bitcoinNetwork !== BitcoinNetwork.MAINNET ? (
              <Badge className="ms-2 d-flex align-items-center" bg="danger">
                DEVNETO
              </Badge>
            ) : (
              ''
            )}
          </div>
        </Navbar.Brand>

        {/* NAVIGATION ITEMS */}
        {/*<div className="d-flex flex-column">*/}
        {/*  <Navbar.Toggle aria-controls="basic-navbar-nav" className="ms-3" />*/}
        {/*</div>*/}

        <Navbar.Collapse role="navigation" id="basic-navbar-nav">
          <Nav className={'main-navigation__nav'}>
            {navItems.slice(0, 3).map((item) => (
              <Nav.Link
                key={item.link}
                href={item.link}
                className={classNames('main-navigation__nav__item', {
                  'is-active': location.pathname === item.link,
                })}
              >
                {/*TODO ADD count BADGE*/}
                <Icon size={20} icon={item.icon} className="main-navigation__item__icon" />
                <span className="main-navigation__item__text">{item.title}</span>
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
            <NFCSwitch />
          </Nav>
          {/*TODO not sure what is this*/}
          {/*<Nav*/}
          {/*  className="d-none d-lg-flex me-auto text-start"*/}
          {/*  navbarScroll*/}
          {/*  style={{ maxHeight: "100px" }}*/}
          {/*>*/}
          {/*  {navItems.map((item) => (*/}
          {/*    <Nav.Link*/}
          {/*      key={item.link}*/}
          {/*      href={item.link}*/}
          {/*      className="d-flex flex-row align-items-center"*/}
          {/*    >*/}
          {/*      <Icon icon={item.icon} className="d-flex me-1" />*/}
          {/*      <span>{item.title}</span>*/}
          {/*    </Nav.Link>*/}
          {/*  ))}*/}
          {/*  <NFCSwitch />*/}
          {/*</Nav>*/}
        </Navbar.Collapse>
        {/* WALLET */}
        <div className="ms-auto">
          {/* TODO Wallet*/}
          <WalletConnectionsSummary />
        </div>
      </Navbar>
    </Container>
  );
}
