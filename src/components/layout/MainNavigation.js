import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import classNames from 'classnames';
import { Navbar, Container, Nav, Badge, NavDropdown } from 'react-bootstrap';
import Icon from 'react-icons-kit';
import { FEConstants } from '../../FEConstants';
import { BitcoinNetwork } from '@atomiqlabs/sdk';
import { WalletConnections } from '../../wallets/WalletConnections';
import { angleDown } from 'react-icons-kit/fa/angleDown';
import { close } from 'react-icons-kit/fa/close';
import { useLocation } from 'react-router-dom';
import { SocialFooter } from './SocialFooter';
// TODO Icons
const navItems = [
    { link: '/', icon: 'swap-nav', title: 'Swap' },
    { link: '/about', icon: 'Swap-History', title: 'Swap History' },
    { link: '/faq', icon: 'Explorer', title: 'Explorer' },
    { link: '/more', icon: 'info', title: 'About' },
    { link: '/more-daco', icon: 'quesitons', title: 'FAQs' },
];
export function MainNavigation({ affiliateLink }) {
    const location = useLocation();
    const [isOpen, setIsOpen] = React.useState(false);
    const collapseRef = React.useRef(null);
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (collapseRef.current &&
                !collapseRef.current.contains(event.target) &&
                !event
                    .composedPath()
                    .some((el) => el.classList?.contains('navbar-toggler'))) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    return (_jsx(Container, { className: "max-width-100", children: _jsx("div", { children: _jsxs(Navbar, { expand: "lg", collapseOnSelect: true, className: "main-navigation", children: [isOpen && _jsx("div", { className: "main-navigation__overlay" }), _jsx(Navbar.Brand, { href: "/", children: _jsxs("div", { className: "d-flex flex-row", style: { fontSize: '1.5rem' }, children: [_jsx("img", { src: "/main_logo.png", className: "main-navigation__logo is-desktop" }), _jsx("img", { src: "/logo192.png", className: "main-navigation__logo is-mobile" }), FEConstants.bitcoinNetwork !== BitcoinNetwork.MAINNET ? (_jsx(Badge, { className: "main-navigation__network ms-2 my-0 align-items-center font-smallest", bg: "danger", children: "DEVNETO" })) : ('')] }) }), _jsx(Navbar.Toggle, { "aria-controls": "basic-navbar-nav", onClick: () => setIsOpen(!isOpen) }), _jsx("div", { className: "main-navigation__wallet", children: _jsx(WalletConnections, {}) }), _jsx(Navbar.Collapse, { ref: collapseRef, in: isOpen, role: "navigation", id: "basic-navbar-nav", className: classNames('main-navigation__collapse', { show: isOpen }), children: _jsxs(Nav, { className: "main-navigation__nav", children: [_jsxs("div", { className: "main-navigation__nav__mobile-header", children: [_jsx(Nav.Link, { href: "/", children: _jsx("img", { src: "/main_logo.png", className: "main-navigation__nav__logo", alt: "logo" }) }), _jsx("div", { className: "main-navigation__nav__close", onClick: () => setIsOpen(false), children: _jsx(Icon, { size: 20, icon: close }) })] }), navItems.map((item, index) => (_jsxs(Nav.Link, { href: item.link, className: classNames('main-navigation__nav__item', {
                                        'is-active': location.pathname === item.link,
                                        'is-mobile': index >= 3,
                                    }), children: [item.icon && (_jsx("span", { className: `main-navigation__nav__item__icon icon icon-${item.icon}` })), _jsx("span", { className: "main-navigation__nav__item__text", children: item.title })] }, item.link))), _jsx(NavDropdown, { className: "main-navigation__more", title: _jsxs("span", { className: "main-navigation__more__label", children: [_jsx("span", { className: "main-navigation__more__text", children: "More" }), _jsx(Icon, { icon: angleDown, size: 20, className: "main-navigation__more__icon" })] }), menuVariant: "dark", children: navItems.slice(3).map((item) => (_jsxs(NavDropdown.Item, { href: item.link, children: [_jsx(Icon, { size: 16, icon: item.icon, className: "me-2 main-navigation__item__icon" }), item.title] }, item.link))) }), _jsx(SocialFooter, { affiliateLink: affiliateLink })] }) })] }) }) }));
}
