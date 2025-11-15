import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SwapType } from '@atomiqlabs/sdk';
import { useContext, useEffect, useState } from 'react';
import { SwapperContext } from '../context/SwapperContext';
import { HistoryEntry } from '../components/history/HistoryEntry';
import { ArrayDataPaginatedList } from '../components/list/ArrayDataPaginatedList';
import { Col, Row } from 'react-bootstrap';
const SHOW_FILTER = false;
export function History() {
    const { swapper } = useContext(SwapperContext);
    const [swaps, setSwaps] = useState([]);
    useEffect(() => {
        if (swapper == null)
            return;
        swapper.getAllSwaps().then((swaps) => {
            setSwaps(swaps
                .filter((swap) => swap.isInitiated() &&
                swap.getType() !== SwapType.TRUSTED_FROM_BTC &&
                swap.getType() !== SwapType.TRUSTED_FROM_BTCLN)
                .sort((a, b) => {
                const _a = a.requiresAction();
                const _b = b.requiresAction();
                if (_a === _b)
                    return b.createdAt - a.createdAt;
                if (_a)
                    return -1;
                if (_b)
                    return 1;
            }));
        });
        const listener = (swap) => {
            if (!swap.isInitiated())
                return;
            if (swap.getType() === SwapType.TRUSTED_FROM_BTC ||
                swap.getType() === SwapType.TRUSTED_FROM_BTCLN)
                return;
            setSwaps((swaps) => {
                if (swaps.includes(swap))
                    return [...swaps];
                return [swap, ...swaps];
            });
        };
        swapper.on('swapState', listener);
        return () => {
            swapper.off('swapState', listener);
            setSwaps([]);
            console.log('History: Set swaps to []');
        };
    }, [swapper]);
    return (_jsx("div", { className: "history-page", children: _jsxs("div", { className: "container", children: [_jsx("div", { className: "history-page__title", children: _jsx("h2", { children: "Your Swap History" }) }), SHOW_FILTER && (_jsxs("div", { className: "history-page__filter", children: [_jsx("div", { className: "history-page__filter__title", children: "Filter by chain:" }), _jsxs("div", { className: "history-page__filter__items", children: [_jsxs("button", { className: "sc-item is-selected", children: [_jsx("img", { src: '/icons/chains/solana.svg', alt: "solana" }), "Solana"] }), _jsxs("button", { className: "sc-item", children: [_jsx("img", { src: '/icons/chains/bitcoin.svg', alt: "bitcoin" }), "Bitcoin"] })] })] })), _jsxs("div", { className: "history-table", children: [_jsx("div", { className: "history-table__head", children: _jsxs(Row, { className: "history-entry gx-1 gy-1", children: [_jsx(Col, { md: 4, sm: 12, className: "is-token", children: "From" }), _jsx(Col, { md: 3, sm: 12, className: "is-token", children: "To" }), _jsx(Col, { md: 1, sm: 12, className: "is-value is-right", children: "Value" }), _jsx(Col, { md: 2, sm: 12, className: "d-flex text-end flex-column is-date is-right", children: "Date" }), _jsx(Col, { md: 1, sm: 12, className: "d-flex text-end flex-column is-status", children: "Status" })] }) }), _jsx(ArrayDataPaginatedList, { renderer: (row) => {
                                return _jsx(HistoryEntry, { swap: row });
                            }, data: swaps, itemsPerPage: 100 })] })] }) }));
}
