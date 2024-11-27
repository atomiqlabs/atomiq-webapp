import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ButtonGroup, Card, ListGroup, Spinner } from "react-bootstrap";
import * as React from "react";
import { useCallback, useEffect, useRef } from "react";
import Button from "react-bootstrap/Button";
import { Icon } from "react-icons-kit";
import { angleRight } from 'react-icons-kit/fa/angleRight';
import { angleLeft } from 'react-icons-kit/fa/angleLeft';
import { angleDoubleRight } from 'react-icons-kit/fa/angleDoubleRight';
import { angleDoubleLeft } from 'react-icons-kit/fa/angleDoubleLeft';
import { ic_not_interested } from 'react-icons-kit/md/ic_not_interested';
function PaginationButton(props) {
    return (_jsx(Button, { onClick: () => { props.onClick(props.page); }, variant: props.currentPage === props.page ? "light" : "outline-light", disabled: props.disabled, className: "px-3", size: "lg", children: props.page + 1 }, "page-" + props.page));
}
function SingleColumnTable(props) {
    const [state, setState] = React.useState({
        page: 0,
        sortedBy: null,
        sortedDescending: false,
        pageData: [],
        maxPages: 0,
        loading: false
    });
    const loading = props.loading || state.loading;
    const itemsPerPage = props.itemsPerPage || 10;
    useEffect(() => {
        setState((val) => {
            return { ...val, page: 0 };
        });
    }, [props.getPage]);
    const renderFunc = () => {
        console.log("Table re-render: ", [state.page, props.getPage]);
        const maybePromise = props.getPage(state.page, itemsPerPage);
        if (maybePromise instanceof Promise) {
            setState((val) => {
                return { ...val, loading: true };
            });
            maybePromise.then((obj) => {
                setState((val) => {
                    return { ...val, maxPages: obj.maxPages, pageData: obj.data, loading: false };
                });
            });
        }
        else {
            setState((val) => {
                return { ...val, maxPages: maybePromise.maxPages, pageData: maybePromise.data };
            });
        }
    };
    if (props.refresh != null)
        props.refresh.current = renderFunc;
    useEffect(renderFunc, [state.page, props.getPage]);
    const tbody = [];
    for (let i = 0; i < itemsPerPage; i++) {
        const obj = state.pageData[i];
        if (obj != null)
            tbody.push((_jsx(ListGroup.Item, { className: "bg-dark bg-opacity-25 border-light border-opacity-25 text-white", children: props.column.renderer(obj) }, i.toString())));
    }
    if (tbody.length === 0) {
        tbody.push((_jsx(ListGroup.Item, { className: "bg-dark bg-opacity-25 border-light border-opacity-25 text-white", children: _jsxs("div", { className: "d-flex align-items-center justify-content-center text-light text-opacity-75", children: [_jsx(Icon, { size: 24, className: "pb-1 me-2", icon: ic_not_interested }), _jsx("h4", { className: "my-3", children: "No data" })] }) }, "0")));
    }
    const numPageButtons = props.numPageButtons || 5;
    const buttons = [];
    const numPages = state.maxPages;
    const handlePageClick = (page) => {
        if (page < 0)
            return;
        if (page > numPages - 1)
            return;
        setState((val) => { return { ...val, page: page }; });
    };
    if (numPages <= numPageButtons) {
        for (let i = 0; i < numPages; i++) {
            buttons.push((_jsx(PaginationButton, { page: i, currentPage: state.page, onClick: handlePageClick, disabled: loading }, "page" + i)));
        }
    }
    else if (state.page < (numPageButtons / 2)) {
        for (let i = 0; i < (numPageButtons / 2) + 1; i++) {
            buttons.push((_jsx(PaginationButton, { page: i, currentPage: state.page, onClick: handlePageClick, disabled: loading }, "page" + i)));
        }
        buttons.push((_jsx(Button, { variant: "outline-light px-2", size: "lg", children: "..." }, "ellipsis2")));
    }
    else if ((numPages - state.page - 1) < (numPageButtons / 2)) {
        for (let i = 0; i < (numPageButtons / 2) + 1; i++) {
            buttons.push((_jsx(PaginationButton, { page: numPages - i - 1, currentPage: state.page, onClick: handlePageClick, disabled: loading }, "page" + (numPages - i - 1))));
        }
        buttons.push((_jsx(Button, { variant: "outline-light px-2", size: "lg", children: "..." }, "ellipsis1")));
        buttons.reverse();
    }
    else {
        buttons.push((_jsx(Button, { variant: "outline-light px-2", size: "lg", children: "..." }, "ellipsis1")));
        for (let i = state.page - 1; i <= state.page + 1; i++) {
            buttons.push((_jsx(PaginationButton, { page: i, currentPage: state.page, onClick: handlePageClick, disabled: loading }, "page" + i)));
        }
        buttons.push((_jsx(Button, { variant: "outline-light px-2", size: "lg", children: "..." }, "ellipsis2")));
    }
    return (_jsxs("div", { children: [_jsxs("div", { className: "position-relative", children: [_jsx(Card, { className: "bg-transparent border-0", children: _jsx(ListGroup, { variant: "flush", children: tbody }) }), loading ? (_jsxs("div", { className: "table-loading-pane d-flex align-items-center justify-content-center flex-column", children: [_jsx(Spinner, { animation: "border", role: "status" }), _jsx("span", { children: "Loading..." })] })) : ""] }), _jsx("div", { className: "d-flex align-items-center justify-content-center mt-2 mb-4", children: _jsxs(ButtonGroup, { className: "bg-dark bg-opacity-25", "aria-label": "Second group", children: [_jsx(Button, { variant: "outline-light px-2", onClick: () => handlePageClick(0), size: "lg", disabled: loading, children: _jsx(Icon, { size: 20, style: { marginTop: "-8px" }, icon: angleDoubleLeft }) }), _jsx(Button, { variant: "outline-light px-2", onClick: () => handlePageClick(state.page - 1), size: "lg", disabled: loading, children: _jsx(Icon, { size: 20, style: { marginTop: "-8px" }, icon: angleLeft }) }), buttons, _jsx(Button, { variant: "outline-light px-2", onClick: () => handlePageClick(state.page + 1), size: "lg", disabled: loading, children: _jsx(Icon, { size: 20, style: { marginTop: "-8px" }, icon: angleRight }) }), _jsx(Button, { variant: "outline-light px-2", onClick: () => handlePageClick(numPages - 1), size: "lg", disabled: loading, children: _jsx(Icon, { size: 20, style: { marginTop: "-8px" }, icon: angleDoubleRight }) })] }) })] }));
}
export function SingleColumnStaticTable(props) {
    const pageCbk = useCallback(async (page, pageSize) => {
        await new Promise((resolve) => { setTimeout(resolve, 250); });
        return {
            data: props.data.slice(page * pageSize, (page + 1) * pageSize),
            maxPages: Math.ceil(props.data.length / pageSize)
        };
    }, [props.data]);
    return (_jsx(SingleColumnTable, { getPage: pageCbk, refresh: props.refreshFunc, ...props }));
}
export function SingleColumnBackendTable(props) {
    const abortSignal = useRef(null);
    const sortedData = useRef(null);
    const tableRefreshRef = useRef();
    if (props.refreshFunc != null)
        props.refreshFunc.current = () => {
            sortedData.current = null;
            if (tableRefreshRef.current != null)
                tableRefreshRef.current();
        };
    useEffect(() => {
        return () => {
            if (abortSignal.current != null) {
                abortSignal.current.abort();
                abortSignal.current = null;
            }
        };
    }, []);
    const memoizedGetter = useCallback(async (page, pageSize) => {
        if (sortedData.current == null || sortedData.current.additionalData !== props.additionalData) {
            sortedData.current = {
                pages: [],
                endTime: null,
                last: false,
                additionalData: props.additionalData
            };
        }
        if (sortedData.current.pages[page] != null)
            return {
                data: sortedData.current.pages[page],
                maxPages: sortedData.current.last ? sortedData.current.pages.length : sortedData.current.pages.length + 1
            };
        if (abortSignal.current != null) {
            abortSignal.current.abort();
            abortSignal.current = null;
        }
        const _abortSignal = new AbortController();
        abortSignal.current = _abortSignal;
        try {
            const params = {
                limit: props.itemsPerPage || 10
            };
            if (sortedData.current.endTime != null)
                params.endTime = sortedData.current.endTime;
            if (props.additionalData != null) {
                for (let key in props.additionalData) {
                    params[key] = props.additionalData[key];
                }
            }
            const httpResponse = await fetch(props.endpoint + "?" + Object.keys(params).map(e => e + "=" + encodeURIComponent("" + params[e])).join("&"), {
                signal: _abortSignal.signal
            });
            if (httpResponse == null || httpResponse.status !== 200) {
                throw new Error("Backend get response code not 200");
            }
            const obj = await httpResponse.json();
            const data = obj.data;
            if (props.dataPostProcessor != null) {
                await props.dataPostProcessor(data);
            }
            sortedData.current.last = obj.last;
            sortedData.current.endTime = obj.last ? null : obj.endTime;
            sortedData.current.pages[page] = data;
            return {
                data: sortedData.current.pages[page],
                maxPages: sortedData.current.last ? sortedData.current.pages.length : sortedData.current.pages.length + 1
            };
        }
        catch (e) {
            console.error(e);
        }
        return {
            data: [],
            maxPages: 1
        };
    }, [props.endpoint, props.additionalData, props.dataPostProcessor]);
    return (_jsx(SingleColumnTable, { getPage: memoizedGetter, refresh: tableRefreshRef, ...props }));
}
