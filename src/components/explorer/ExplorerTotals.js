import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Badge, Collapse } from 'react-bootstrap';
export function ExplorerTotals({ title, count, getDifference, loading = false, timeframes = ['24h', '7d', '30d'], }) {
    const [displayTimeframeIndex, setDisplayTimeframeIndex] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);
    const changeTimeframe = () => {
        setDisplayTimeframeIndex((prevState) => (prevState + 1) % timeframes.length);
    };
    const toggleExpanded = () => {
        setIsExpanded((prev) => !prev);
    };
    const displayTimeframe = timeframes[displayTimeframeIndex];
    const difference = getDifference(displayTimeframe);
    const formatDifference = (diff) => {
        if (diff == null)
            return null;
        if (typeof diff === 'string')
            return `+${diff}`;
        return `+${diff}`;
    };
    return (_jsxs("div", { className: `explorer-totals ${isExpanded ? 'is-expanded' : ''}`, children: [_jsxs("div", { className: "explorer-totals__header", children: [_jsxs("div", { className: "explorer-totals__header__content", children: [_jsx("div", { className: "explorer-totals__header__content__title", children: title }), _jsxs("div", { className: "explorer-totals__header__content__count", children: [_jsx("div", { className: "sc-amount", children: loading ? '...' : count }), _jsx("div", { className: "sc-difference cursor-pointer", onClick: changeTimeframe, children: loading ? ('...') : (_jsxs(_Fragment, { children: [formatDifference(difference), _jsx(Badge, { className: "font-smallest text-dark", bg: "light", children: displayTimeframe })] })) })] })] }), _jsx("div", { className: "explorer-totals__more cursor-pointer", onClick: toggleExpanded, children: _jsx("i", { className: `icon icon-caret-down ${isExpanded ? 'is-rotated' : ''}` }) })] }), _jsx(Collapse, { in: isExpanded, children: _jsx("div", { className: "explorer-totals__body", children: "Body content will go here" }) })] }));
}
