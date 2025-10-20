import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Icon from 'react-icons-kit';
import * as React from 'react';
import classNames from 'classnames';
export function StepByStep(props) {
    return (_jsxs("div", { className: "swap-steps", children: [_jsxs("div", { className: "swap-steps__data", children: [_jsx("div", { className: "swap-steps__data__arrow icon icon-arrow-right" }), _jsx("div", { className: "swap-steps__data__in", children: props.sourceWallet && (_jsxs("div", { className: "swap-steps-wallet", children: [_jsxs("div", { className: "swap-steps-wallet__icon", children: [_jsx("img", { src: props.sourceWallet.icon, alt: "Source", className: "swap-steps-wallet__icon__img" }), props.sourceWallet.chainIcon && (_jsx("img", { src: props.sourceWallet.chainIcon, alt: "Chain", className: "swap-steps-wallet__icon__currency" }))] }), _jsxs("div", { className: "swap-steps-wallet__ammounts", children: [_jsx("div", { className: "swap-steps-wallet__ammounts__original", children: props.sourceWallet.amount }), props.sourceWallet.dollarValue && (_jsx("div", { className: "swap-steps-wallet__ammounts__dolars", children: props.sourceWallet.dollarValue }))] })] })) }), _jsx("div", { className: "swap-steps__data__out", children: props.destinationWallet && (_jsxs("div", { className: "swap-steps-wallet", children: [_jsxs("div", { className: "swap-steps-wallet__icon", children: [_jsx("img", { src: props.destinationWallet.icon, alt: "Destination", className: "swap-steps-wallet__icon__img" }), props.destinationWallet.chainIcon && (_jsx("img", { src: props.destinationWallet.chainIcon, alt: "Chain", className: "swap-steps-wallet__icon__currency" }))] }), _jsxs("div", { className: "swap-steps-wallet__ammounts", children: [_jsx("div", { className: "swap-steps-wallet__ammounts__original", children: props.destinationWallet.amount }), props.destinationWallet.dollarValue && (_jsx("div", { className: "swap-steps-wallet__ammounts__dolars", children: props.destinationWallet.dollarValue }))] })] })) })] }), props.destinationWallet.address && (_jsxs("div", { className: "swap-steps__address", children: [_jsx("div", { children: "Destination Bitcoin Wallet Address:" }), _jsxs("div", { children: [props.destinationWallet.address.slice(0, 5), "...", props.destinationWallet.address.slice(-5)] })] })), _jsx("div", { className: "swap-steps__indicator", children: props.steps.map((step, index) => {
                    return (_jsxs(React.Fragment, { children: [_jsxs("div", { className: classNames('swap-steps__indicator__step', {
                                    'text-light text-opacity-50': step.type === 'disabled',
                                    'text-light': step.type === 'loading',
                                }), children: [_jsx("div", { className: classNames('swap-steps__indicator__icon', {
                                            'is-failed': step.type === 'failed',
                                            'is-success': step.type === 'success',
                                            'is-loading': step.type === 'loading',
                                        }), children: _jsx(Icon, { size: 20, icon: step.icon }) }), _jsx("div", { className: classNames('swap-steps__indicator__text', {
                                            'loading-glow': step.type === 'loading',
                                        }), children: step.text })] }), index < props.steps.length - 1 && (_jsx("div", { className: classNames('swap-steps__dots', {
                                    'is-loading': step.type === 'loading',
                                    'is-success': step.type === 'success',
                                }), children: [...Array(8)].map((_, dotIndex) => (_jsx("div", { className: "swap-steps__dot" }, dotIndex))) }))] }, index.toString()));
                }) })] }));
}
