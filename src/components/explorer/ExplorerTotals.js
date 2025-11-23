import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Collapse, Dropdown } from 'react-bootstrap';
export function ExplorerTotals({ title, count, getDifference, loading = false, timeframes = ['24h', '7d', '30d'], shortenOnMobile = false, breakdownData = [], }) {
    const [displayTimeframe, setDisplayTimeframe] = useState(timeframes[0]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    const toggleExpanded = () => {
        setIsExpanded((prev) => !prev);
    };
    const difference = getDifference(displayTimeframe);
    const shortenNumber = (value) => {
        const absValue = Math.abs(value);
        if (absValue >= 1000000000) {
            return (value / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
        }
        if (absValue >= 1000000) {
            return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (absValue >= 1000) {
            return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        return value.toString();
    };
    const formatCount = (value) => {
        if (value == null)
            return '';
        if (typeof value === 'string') {
            if (shortenOnMobile && isMobile && value.startsWith('$')) {
                const numericValue = parseFloat(value.replace(/[$,]/g, ''));
                if (!isNaN(numericValue)) {
                    return '$' + shortenNumber(numericValue);
                }
            }
            return value;
        }
        if (shortenOnMobile && isMobile) {
            return shortenNumber(value);
        }
        return value.toLocaleString('en-US');
    };
    const formatDifference = (diff) => {
        if (diff == null)
            return null;
        if (typeof diff === 'string') {
            if (shortenOnMobile && isMobile && diff.startsWith('$')) {
                const numericValue = parseFloat(diff.replace(/[$,]/g, ''));
                if (!isNaN(numericValue)) {
                    return '+$' + shortenNumber(numericValue);
                }
            }
            return `+${diff}`;
        }
        if (shortenOnMobile && isMobile) {
            return '+' + shortenNumber(diff);
        }
        return `+${diff.toLocaleString('en-US')}`;
    };
    return (_jsxs("div", { className: `explorer-totals ${isExpanded ? 'is-expanded' : ''}`, children: [_jsxs("div", { className: "explorer-totals__header", children: [_jsxs("div", { className: "explorer-totals__header__content", children: [_jsx("div", { className: "explorer-totals__header__content__title", children: title }), _jsxs("div", { className: `explorer-totals__header__content__count ${loading ? 'is-loading' : ''}`, children: [_jsx("div", { className: "sc-amount", children: loading ? '' : formatCount(count) }), _jsx("div", { className: "sc-difference", children: loading ? ('') : (_jsxs(_Fragment, { children: [formatDifference(difference), _jsxs(Dropdown, { onSelect: (eventKey) => setDisplayTimeframe(eventKey), children: [_jsx(Dropdown.Toggle, { variant: "dark", size: "sm", children: displayTimeframe }), _jsx(Dropdown.Menu, { children: timeframes.map((timeframe) => (_jsx(Dropdown.Item, { eventKey: timeframe, active: timeframe === displayTimeframe, children: timeframe }, timeframe))) })] })] })) })] })] }), !loading && (_jsx("div", { className: "explorer-totals__more cursor-pointer", onClick: toggleExpanded, children: _jsx("i", { className: `icon icon-caret-down ${isExpanded ? 'is-rotated' : ''}` }) }))] }), _jsx(Collapse, { in: isExpanded, children: _jsx("div", { className: "explorer-totals__body", children: breakdownData
                        .filter((item) => item.value !== 0)
                        .map((item, index) => (_jsxs("div", { className: "explorer-totals__body__item", children: [item.icon && _jsx("img", { className: "sc-image", src: item.icon, alt: item.name }), _jsx("div", { className: "sc-name", children: item.name }), _jsx("div", { className: "sc-amount", children: item.isUsd
                                    ? `$${item.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    : item.value.toLocaleString('en-US') })] }, index))) }) })] }));
}
