import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Col, Row } from 'react-bootstrap';
import { FEConstants } from '../FEConstants';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackendDataPaginatedList } from '../components/list/BackendDataPaginatedList';
import ValidatedInput from '../components/ValidatedInput';
import { TransactionEntry } from '../components/history/TransactionEntry';
import { explorerSwapToProps } from '../adapters/transactionAdapters';
import { ExplorerTotals } from '../components/explorer/ExplorerTotals';
import { BaseButton } from '../components/common/BaseButton';
export function SwapExplorer() {
    const refreshTable = useRef(null);
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
    return (_jsxs("div", { className: "container", children: [_jsxs("div", { className: "explorer-totals-wrapper", children: [_jsx(ExplorerTotals, { title: "Total swaps", count: stats?.totalSwapCount, getDifference: (timeframe) => stats?.timeframes?.[timeframe]?.count, loading: statsLoading }), _jsx(ExplorerTotals, { title: "Total volume", count: stats?.totalUsdVolume == null ? null : FEConstants.USDollar.format(stats.totalUsdVolume), getDifference: (timeframe) => stats?.timeframes?.[timeframe]?.volumeUsd == null
                            ? null
                            : FEConstants.USDollar.format(stats?.timeframes?.[timeframe]?.volumeUsd), loading: statsLoading })] }), _jsx("h1", { className: "page-title", children: "Explorer" }), _jsxs("div", { className: "explorer-filter", children: [_jsx("div", { className: "explorer-filter__buttons", children: "TODO" }), _jsxs("div", { className: "explorer-filter__search", children: [_jsx(ValidatedInput, { type: 'text', placeholder: 'Search by tx ID or wallet address', inputRef: searchRef, onSubmit: () => {
                                    const val = searchRef.current.getValue();
                                    if (val === '') {
                                        setSearch(null);
                                    }
                                    else {
                                        setSearch(val);
                                    }
                                } }), _jsx(BaseButton, { variant: "primary", customIcon: "search", textSize: "sm", onClick: () => {
                                    const val = searchRef.current.getValue();
                                    if (val === '') {
                                        setSearch(null);
                                    }
                                    else {
                                        setSearch(val);
                                    }
                                } })] })] }), _jsxs("div", { className: "transactions-table", children: [_jsx("div", { className: "transactions-table__head", children: _jsxs(Row, { className: "transaction-entry gx-1 gy-1", children: [_jsx(Col, { md: 4, sm: 12, className: "is-token", children: "From" }), _jsx(Col, { md: 3, sm: 12, className: "is-token", children: "To" }), _jsx(Col, { md: 1, sm: 12, className: "is-value is-right", children: "Value" }), _jsx(Col, { md: 2, sm: 12, className: "d-flex text-end flex-column is-date is-right", children: "Date" }), _jsx(Col, { md: 2, sm: 12, className: "d-flex text-end flex-column is-status", children: "Status" })] }) }), _jsx(BackendDataPaginatedList, { renderer: (row) => _jsx(TransactionEntry, { ...explorerSwapToProps(row) }), endpoint: FEConstants.statsUrl + '/GetSwapList', itemsPerPage: 10, refreshFunc: refreshTable, additionalData: additionalData })] })] }));
}
