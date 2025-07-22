import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import classNames from "classnames";
import { Navbar, Container, Nav, Badge, NavDropdown } from "react-bootstrap";
import Icon from "react-icons-kit";
import { FEConstants } from "../../FEConstants";
import { BitcoinNetwork } from "@atomiqlabs/sdk";
import { WalletConnectionsSummary } from "../../wallets/WalletConnectionsSummary";
import { NFCSwitch } from "../../nfc/NFCSwitch";
import { repeat } from "react-icons-kit/fa/repeat";
import { history } from "react-icons-kit/fa/history";
import { angleDown } from "react-icons-kit/fa/angleDown";
import { question } from "react-icons-kit/fa/question";
import { useLocation } from "react-router-dom";
// TODO Icons
const navItems = [
    { link: "/", icon: repeat, title: "Swap" },
    { link: "/about", icon: history, title: "Swap history" },
    { link: "/faq", icon: question, title: "Explorer" },
    { link: "/more", icon: question, title: "Zblunk" },
    { link: "/more", icon: question, title: "Haw" },
    { link: "/more", icon: question, title: "Mew" },
];
export function MainNavigation() {
    const location = useLocation();
    return (_jsx(Container, { className: "max-width-100", children: _jsxs(Navbar, { collapseOnSelect: true, className: "main-navigation", children: [_jsx(Navbar.Brand, { href: "/", className: "d-flex flex-column", children: _jsxs("div", { className: "d-flex flex-row", style: { fontSize: "1.5rem" }, children: [_jsx("img", { src: "/main_logo.png", className: "main-navigation__logo" }), FEConstants.bitcoinNetwork !== BitcoinNetwork.MAINNET ? (_jsx(Badge, { className: "ms-2 d-flex align-items-center", bg: "danger", children: "DEVNETO" })) : ("")] }) }), _jsx(Navbar.Collapse, { role: "navigation", id: "basic-navbar-nav", children: _jsxs(Nav, { className: "main-navigation__nav", children: [navItems.slice(0, 3).map((item) => (_jsxs(Nav.Link, { href: item.link, className: classNames("main-navigation__nav__item", {
                                    "is-active": location.pathname === item.link,
                                }), children: [_jsx(Icon, { size: 20, icon: item.icon, className: "main-navigation__item__icon" }), _jsx("span", { className: "main-navigation__item__text", children: item.title })] }, item.link))), _jsx(NavDropdown, { className: "main-navigation__more", title: _jsxs("span", { className: "main-navigation__more__label", children: [_jsx("span", { className: "main-navigation__more__text", children: "More" }), _jsx(Icon, { icon: angleDown, size: 20, className: "main-navigation__more__icon" })] }), menuVariant: "dark", children: navItems.slice(3).map((item) => (_jsxs(NavDropdown.Item, { href: item.link, children: [_jsx(Icon, { size: 16, icon: item.icon, className: "me-2 main-navigation__item__icon" }), item.title] }, item.link))) }), _jsx(NFCSwitch, {})] }) }), _jsx("div", { className: "ms-auto", children: _jsx(WalletConnectionsSummary, {}) })] }) }));
}
