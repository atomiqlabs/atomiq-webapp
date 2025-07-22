import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
export function SocialFooter({ affiliateLink }) {
    return (_jsxs("div", { className: "social-footer", children: [socialLink.map(({ link, image, title }) => (_jsx("a", { href: link, target: "_blank", className: "social-footer__link", children: _jsx("img", { className: "social-footer__icon", src: `/icons/socials/${image}`, alt: title }) }, link))), affiliateLink != null && affiliateLink !== '' ? (_jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "referral-tooltip", children: _jsx("span", { children: "Swap fee reduced to 0.2%, thanks to being referred to atomiq.exchange!" }) }), children: _jsxs("div", { className: "font-small text-white opacity-75 d-flex align-items-center ", children: [_jsx(Icon, { icon: heart, className: "d-flex align-items-center me-1" }), _jsx("span", { className: "text-decoration-dotted", children: "Using referral link" })] }) })) : ('')] }));
}
