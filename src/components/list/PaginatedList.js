import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, ListGroup, Spinner } from 'react-bootstrap';
import * as React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { Icon } from 'react-icons-kit';
import { ic_not_interested } from 'react-icons-kit/md/ic_not_interested';
export function PaginatedList(props) {
    const [state, setState] = React.useState({
        page: 0,
        sortedBy: null,
        sortedDescending: false,
        allData: [],
        maxPages: 0,
        loading: null,
        hasMore: true,
    });
    const loading = props.loading || state.loading;
    const itemsPerPage = props.itemsPerPage || 10;
    const containerRef = useRef(null);
    const getPageUpdateCounter = useRef(0);
    useEffect(() => {
        setState((val) => {
            return { ...val, page: 0, allData: [], hasMore: true };
        });
        getPageUpdateCounter.current++;
    }, [props.getPage]);
    const loadNextPageRef = useRef();
    loadNextPageRef.current = () => {
        const getPageIndex = getPageUpdateCounter.current;
        if (state.loading === getPageIndex || !state.hasMore)
            return;
        const maybePromise = props.getPage(state.page, itemsPerPage);
        if (maybePromise instanceof Promise) {
            setState((val) => {
                return { ...val, loading: getPageIndex };
            });
            maybePromise.then((obj) => {
                setState((val) => {
                    if (val.loading !== getPageIndex)
                        return val;
                    const newData = [...val.allData, ...obj.data];
                    const hasMore = val.page + 1 < obj.maxPages;
                    return {
                        ...val,
                        maxPages: obj.maxPages,
                        allData: newData,
                        loading: null,
                        hasMore: hasMore,
                        page: hasMore ? val.page + 1 : val.page,
                    };
                });
            });
        }
        else {
            setState((val) => {
                const newData = [...val.allData, ...maybePromise.data];
                const hasMore = val.page + 1 < maybePromise.maxPages;
                return {
                    ...val,
                    maxPages: maybePromise.maxPages,
                    allData: newData,
                    hasMore: hasMore,
                    page: hasMore ? val.page + 1 : val.page,
                };
            });
        }
    };
    const resetAndLoad = useCallback(() => {
        setState({
            page: 0,
            sortedBy: null,
            sortedDescending: false,
            allData: [],
            maxPages: 0,
            loading: null,
            hasMore: true,
        });
    }, []);
    if (props.refresh != null)
        props.refresh.current = resetAndLoad;
    // Load first page on mount, when getPage changes, or after reset
    useEffect(() => {
        if (state.allData.length === 0) {
            loadNextPageRef.current?.();
        }
    }, [props.getPage, state.allData.length, state.hasMore, state.loading]);
    // Infinite scroll detection
    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current || state.loading || !state.hasMore)
                return;
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            const scrollBottom = scrollHeight - scrollTop - clientHeight;
            // Load more when within 300px of bottom
            if (scrollBottom < 300) {
                loadNextPageRef.current?.();
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [state.loading, state.hasMore]);
    const tbody = [];
    // Render all loaded data
    for (let i = 0; i < state.allData.length; i++) {
        const obj = state.allData[i];
        if (obj != null)
            tbody.push(_jsx(ListGroup.Item, { children: props.renderer(obj) }, i.toString()));
    }
    if (tbody.length === 0 && !loading) {
        tbody.push(_jsx(ListGroup.Item, { className: "bg-dark bg-opacity-25 text-white", children: _jsxs("div", { className: "d-flex align-items-center justify-content-center text-light text-opacity-75", children: [_jsx(Icon, { size: 24, className: "pb-1 me-2", icon: ic_not_interested }), _jsx("h4", { className: "my-3", children: "No data" })] }) }, '0'));
    }
    return (_jsx("div", { ref: containerRef, children: _jsxs("div", { className: "position-relative", children: [_jsx(Card, { className: "bg-transparent border-0", children: _jsx(ListGroup, { variant: "flush", children: tbody }) }), loading && (_jsxs("div", { className: "table-loading-pane d-flex align-items-center justify-content-center flex-row gap-3 mt-5 mb-5 text-white", children: [_jsx(Spinner, { animation: "border", role: "status", style: { width: '24px', height: '24px' } }), _jsxs("span", { children: ["Loading ", state.allData.length > 0 ? 'more' : '', " Swaps..."] })] }))] }) }));
}
