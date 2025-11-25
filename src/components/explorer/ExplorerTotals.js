import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Collapse, Dropdown } from 'react-bootstrap';
import { FEConstants } from '../../FEConstants';
import { shortenNumber } from '../../utils/Utils';
import { useIsMobile } from '../../hooks/utils/useIsMobile';
export function ExplorerTotals({ title, count, getDifference, loading = false, timeframes = ['24h', '7d', '30d'], shortenOnMobile = false, breakdownData = [], isUsd = false, }) {
    const [displayTimeframe, setDisplayTimeframe] = useState(timeframes[0]);
    const [isExpanded, setIsExpanded] = useState(false);
    const isMobile = useIsMobile();
    const toggleExpanded = () => {
        setIsExpanded((prev) => !prev);
    };
    const difference = getDifference(displayTimeframe);
    const formatCount = (value) => {
        if (value == null)
            return '';
        if (shortenOnMobile && isMobile) {
            const shortenedNumber = shortenNumber(value);
            return isUsd ? '$' + shortenedNumber : shortenedNumber;
        }
        return isUsd ? FEConstants.USDollar.format(value) : value.toLocaleString('en-US');
    };
    const formatDifference = (diff) => {
        if (diff == null)
            return null;
        return '+' + formatCount(diff);
    };
    return (_jsxs("div", { className: `explorer-totals ${isExpanded ? 'is-expanded' : ''}`, children: [_jsxs("div", { className: "explorer-totals__header", children: [_jsxs("div", { className: "explorer-totals__header__content", children: [_jsx("div", { className: "explorer-totals__header__content__title", children: title }), _jsxs("div", { className: `explorer-totals__header__content__count ${loading ? 'is-loading' : ''}`, children: [_jsx("div", { className: "sc-amount", children: loading ? '' : formatCount(count) }), _jsx("div", { className: "sc-difference", children: loading ? ('') : (_jsxs(_Fragment, { children: [formatDifference(difference), _jsxs(Dropdown, { onSelect: (eventKey) => setDisplayTimeframe(eventKey), children: [_jsx(Dropdown.Toggle, { variant: "dark", size: "sm", children: displayTimeframe }), _jsx(Dropdown.Menu, { children: timeframes.map((timeframe) => (_jsx(Dropdown.Item, { eventKey: timeframe, active: timeframe === displayTimeframe, children: timeframe }, timeframe))) })] })] })) })] })] }), !loading && (_jsx("div", { className: "explorer-totals__more cursor-pointer", onClick: toggleExpanded, children: _jsx("i", { className: `icon icon-caret-down ${isExpanded ? 'is-rotated' : ''}` }) }))] }), _jsx(Collapse, { in: isExpanded, children: _jsx("div", { className: "explorer-totals__body", children: breakdownData
                        .filter((item) => item.value !== 0)
                        .map((item, index) => (_jsxs("div", { className: "explorer-totals__body__item", children: [item.icon && _jsx("img", { className: "sc-image", src: item.icon, alt: item.name }), _jsx("div", { className: "sc-name", children: item.name }), _jsx("div", { className: "sc-amount", children: formatCount(item.value) })] }, index))) }) })] }));
}
