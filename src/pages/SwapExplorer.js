import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Col, Dropdown, Form, Row } from 'react-bootstrap';
import { FEConstants } from '../FEConstants';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackendDataPaginatedList } from '../components/list/BackendDataPaginatedList';
import ValidatedInput from '../components/ValidatedInput';
import { TransactionEntry } from '../components/history/TransactionEntry';
import { explorerSwapToProps } from '../adapters/transactionAdapters';
import { ExplorerTotals } from '../components/explorer/ExplorerTotals';
import { BaseButton } from '../components/common/BaseButton';
const CHAINS = ['BITCOIN', 'LIGHTNING', 'SOLANA', 'STARKNET', 'BOTANIX'];
const formatChainName = (chain) => {
    return chain.charAt(0) + chain.slice(1).toLowerCase();
};
const getChainIcon = (chain) => {
    const iconMap = {
        BITCOIN: '/icons/chains/BITCOIN.svg',
        LIGHTNING: '/icons/chains/LIGHTNING.svg',
        SOLANA: '/icons/chains/SOLANA.svg',
        STARKNET: '/icons/chains/STARKNET.svg',
        BOTANIX: '/icons/chains/BITCOIN.svg', // Using Bitcoin icon for Botanix
    };
    return iconMap[chain];
};
export function SwapExplorer() {
    const refreshTable = useRef(null);
    const [selectedChains, setSelectedChains] = useState([]);
    const [showChainDropdown, setShowChainDropdown] = useState(false);
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
    const toggleChain = (chain) => {
        setSelectedChains((prev) => prev.includes(chain) ? prev.filter((c) => c !== chain) : [...prev, chain]);
    };
    const additionalData = useMemo(() => {
        const additionalData = {};
        if (search != null)
            additionalData.search = search;
        if (selectedChains.length > 0)
            additionalData.chain = selectedChains;
        return additionalData;
    }, [search, selectedChains]);
    return (_jsxs("div", { className: "container", children: [_jsxs("div", { className: "explorer-totals-wrapper", children: [_jsx(ExplorerTotals, { title: "Total swaps", count: stats?.totalSwapCount, getDifference: (timeframe) => stats?.timeframes?.[timeframe]?.count, loading: statsLoading }), _jsx(ExplorerTotals, { title: "Total volume", count: stats?.totalUsdVolume == null ? null : FEConstants.USDollar.format(stats.totalUsdVolume), getDifference: (timeframe) => stats?.timeframes?.[timeframe]?.volumeUsd == null
                            ? null
                            : FEConstants.USDollar.format(stats?.timeframes?.[timeframe]?.volumeUsd), loading: statsLoading })] }), _jsx("h1", { className: "page-title", children: "Explorer" }), _jsxs("div", { className: "explorer-filter", children: [_jsx("div", { className: "explorer-filter__buttons", children: _jsxs(Dropdown, { show: showChainDropdown, onToggle: (val) => setShowChainDropdown(val), autoClose: "outside", children: [_jsxs(Dropdown.Toggle, { id: "chain-filter-dropdown", children: [selectedChains.length > 0 && (_jsx("span", { className: "sc-count", children: selectedChains.length })), "All chains", selectedChains.length > 0 && (_jsx("span", { className: "clear-filter icon icon-circle-x-clear", onClick: (e) => {
                                                e.stopPropagation();
                                                setSelectedChains([]);
                                            } }))] }), showChainDropdown && (_jsx("div", { className: "currency-dropdown__overlay", onClick: () => setShowChainDropdown(false) })), _jsx(Dropdown.Menu, { children: CHAINS.map((chain) => {
                                        const icon = getChainIcon(chain);
                                        return (_jsx(Dropdown.Item, { as: "div", onClick: (e) => {
                                                e.preventDefault();
                                                toggleChain(chain);
                                            }, children: _jsx(Form.Check, { type: "checkbox", id: `chain-${chain}`, label: _jsxs(_Fragment, { children: [icon && _jsx("img", { src: icon, alt: chain, className: "chain-icon" }), formatChainName(chain)] }), checked: selectedChains.includes(chain), onChange: () => toggleChain(chain) }) }, chain));
                                    }) })] }) }), _jsxs("div", { className: "explorer-filter__search", children: [_jsx(ValidatedInput, { type: 'text', placeholder: 'Search by tx ID or wallet address', inputRef: searchRef, onSubmit: () => {
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
