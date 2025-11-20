import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Badge, Button, Card, Col, Placeholder, Row } from 'react-bootstrap';
import { FEConstants } from '../FEConstants';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackendDataPaginatedList } from '../components/list/BackendDataPaginatedList';
import ValidatedInput from '../components/ValidatedInput';
import { TransactionEntry } from '../components/history/TransactionEntry';
import { explorerSwapToProps } from '../adapters/transactionAdapters';
const timeframes = ['24h', '7d', '30d'];
export function SwapExplorer() {
    const refreshTable = useRef(null);
    const [displayTimeframeIndex, setDisplayTimeframeIndex] = useState(0);
    const changeTimeframe = () => setDisplayTimeframeIndex((prevState) => (prevState + 1) % timeframes.length);
    const displayTimeframe = timeframes[displayTimeframeIndex];
    const [statsLoading, setStatsLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [search, setSearch] = useState();
    const searchRef = useRef();
    useEffect(() => {
        const abortController = new AbortController();
        setStatsLoading(true);
        fetch(FEConstants.statsUrl + '/GetStats', {
            signal: abortController.signal,
        })
            .then((resp) => {
            return resp.json();
        })
            .then((obj) => {
            setStats(obj);
            setStatsLoading(false);
        })
            .catch((e) => {
            console.error(e);
            setStatsLoading(false);
        });
        return () => abortController.abort();
    }, []);
    const additionalData = useMemo(() => {
        const additionalData = {};
        if (search != null)
            additionalData.search = search;
        return additionalData;
    }, [search]);
    return (_jsxs("div", { className: "container", children: [_jsxs(Row, { children: [_jsx(Col, { xs: 12, md: 6, className: "pb-3", children: _jsxs(Card, { className: "px-3 pt-3 bg-dark bg-opacity-25 height-100 border-0", children: [_jsx("span", { className: "", children: "Total swaps" }), _jsx("div", { className: 'flex-row align-items-baseline' + (statsLoading ? '' : ' d-flex'), children: statsLoading ? (_jsx("h3", { children: _jsx(Placeholder, { xs: 6 }) })) : (_jsxs(_Fragment, { children: [_jsx("h3", { className: "", children: stats?.totalSwapCount }), _jsxs("h6", { className: "ms-1 text-success d-flex flex-row align-items-center cursor-pointer", onClick: changeTimeframe, children: [_jsxs("span", { children: ["+", stats?.timeframes?.[displayTimeframe]?.count] }), _jsx(Badge, { className: "font-smallest ms-1 text-dark", bg: "light", children: displayTimeframe })] })] })) })] }) }), _jsx(Col, { xs: 12, md: 6, className: "pb-3", children: _jsxs(Card, { className: "px-3 pt-3 bg-dark bg-opacity-25 height-100 border-0", children: [_jsx("span", { children: "Total volume" }), _jsx("div", { className: 'flex-row align-items-baseline' + (statsLoading ? '' : ' d-flex'), children: statsLoading ? (_jsx("h3", { children: _jsx(Placeholder, { xs: 6 }) })) : (_jsxs(_Fragment, { children: [_jsx("h3", { className: "", children: stats?.totalUsdVolume == null
                                                    ? null
                                                    : FEConstants.USDollar.format(stats.totalUsdVolume) }), _jsxs("h6", { className: "ms-1 text-success d-flex flex-row align-items-center cursor-pointer", onClick: changeTimeframe, children: [_jsxs("span", { children: ["+", stats?.timeframes?.[displayTimeframe]?.volumeUsd == null
                                                                ? null
                                                                : FEConstants.USDollar.format(stats?.timeframes?.[displayTimeframe]?.volumeUsd)] }), _jsx(Badge, { className: "font-smallest ms-1 text-dark", bg: "light", children: displayTimeframe })] })] })) })] }) })] }), _jsx("h1", { className: "page-title", children: "Explorer" }), _jsxs("div", { className: "d-flex flex-row mb-3", children: [_jsx(ValidatedInput, { className: "width-300px", type: 'text', placeholder: 'Search by tx ID or wallet address', inputRef: searchRef }), _jsx(Button, { className: "ms-2", onClick: () => {
                            const val = searchRef.current.getValue();
                            if (val === '') {
                                setSearch(null);
                            }
                            else {
                                setSearch(val);
                            }
                        }, children: "Search" })] }), _jsxs("div", { className: "transactions-table", children: [_jsx("div", { className: "transactions-table__head", children: _jsxs(Row, { className: "transaction-entry gx-1 gy-1", children: [_jsx(Col, { md: 4, sm: 12, className: "is-token", children: "From" }), _jsx(Col, { md: 3, sm: 12, className: "is-token", children: "To" }), _jsx(Col, { md: 1, sm: 12, className: "is-value is-right", children: "Value" }), _jsx(Col, { md: 2, sm: 12, className: "d-flex text-end flex-column is-date is-right", children: "Date" }), _jsx(Col, { md: 2, sm: 12, className: "d-flex text-end flex-column is-status", children: "Status" })] }) }), _jsx(BackendDataPaginatedList, { renderer: (row) => _jsx(TransactionEntry, { ...explorerSwapToProps(row) }), endpoint: FEConstants.statsUrl + '/GetSwapList', itemsPerPage: 10, refreshFunc: refreshTable, additionalData: additionalData })] })] }));
}
