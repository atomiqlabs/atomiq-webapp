import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Icon from 'react-icons-kit';
import * as React from 'react';
import classNames from 'classnames';
import { useQuoteAmountsAndAddress } from "../swaps/useQuoteAmountsAndAddress";
import { TokenIcons } from "../tokens/Tokens";
export function StepByStep(props) {
    const { input, output, address } = useQuoteAmountsAndAddress(props.quote);
    return (_jsxs("div", { className: "swap-steps", children: [_jsxs("div", { className: "swap-steps__data", children: [_jsx("div", { className: "swap-steps__data__arrow icon icon-arrow-right" }), _jsx("div", { className: "swap-steps__data__in", children: input && (_jsxs("div", { className: "swap-steps-wallet", children: [_jsxs("div", { className: "swap-steps-wallet__icon", children: [_jsx("img", { src: TokenIcons[input.amount.token.ticker], alt: "Source", className: "swap-steps-wallet__icon__img" }), input.chain.chain.icon && (_jsx("img", { src: input.chain.chain.icon, alt: "Chain", className: "swap-steps-wallet__icon__currency" }))] }), _jsxs("div", { className: "swap-steps-wallet__ammounts", children: [_jsx("div", { className: "swap-steps-wallet__ammounts__original", children: input.amount.toString() }), input.usdValue && (_jsx("div", { className: "swap-steps-wallet__ammounts__dolars", children: input.usdValue }))] })] })) }), _jsx("div", { className: "swap-steps__data__out", children: output && (_jsxs("div", { className: "swap-steps-wallet", children: [_jsxs("div", { className: "swap-steps-wallet__icon", children: [_jsx("img", { src: TokenIcons[output.amount.token.ticker], alt: "Destination", className: "swap-steps-wallet__icon__img" }), output.chain.chain.icon && (_jsx("img", { src: output.chain.chain.icon, alt: "Chain", className: "swap-steps-wallet__icon__currency" }))] }), _jsxs("div", { className: "swap-steps-wallet__ammounts", children: [_jsx("div", { className: "swap-steps-wallet__ammounts__original", children: output.amount.toString() }), output.amount.usdValue && (_jsx("div", { className: "swap-steps-wallet__ammounts__dolars", children: output.usdValue }))] })] })) })] }), address && output && (_jsxs("div", { className: "swap-steps__address", children: [_jsxs("div", { children: ["Destination ", output.chain.chain.name ?? '', " Wallet Address:"] }), _jsx("div", { children: address.short })] })), _jsx("div", { className: "swap-steps__indicator", children: props.steps.map((step, index) => {
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
                                }), style: props.steps.length > 2
                                    ? index === 0
                                        ? {
                                            left: `23%`,
                                        }
                                        : {
                                            right: `24%`,
                                        }
                                    : {}, children: [...Array(props.steps.length > 2 ? 5 : 8)].map((_, dotIndex) => (_jsx("div", { className: "swap-steps__dot" }, dotIndex))) }))] }, index.toString()));
                }) })] }));
}
