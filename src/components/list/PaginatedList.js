import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ButtonGroup, Card, ListGroup, Spinner } from 'react-bootstrap';
import * as React from 'react';
import { useEffect } from 'react';
import { Icon } from 'react-icons-kit';
import { angleRight } from 'react-icons-kit/fa/angleRight';
import { angleLeft } from 'react-icons-kit/fa/angleLeft';
import { angleDoubleRight } from 'react-icons-kit/fa/angleDoubleRight';
import { angleDoubleLeft } from 'react-icons-kit/fa/angleDoubleLeft';
import { ic_not_interested } from 'react-icons-kit/md/ic_not_interested';
import { BaseButton } from '../common/BaseButton';
function PaginationButton(props) {
    return (_jsx(BaseButton, { onClick: () => {
            props.onClick(props.page);
        }, variant: props.currentPage === props.page ? 'secondary' : 'clear', disabled: props.disabled, className: 'px-3', children: props.page + 1 }, 'page-' + props.page));
}
export function PaginatedList(props) {
    const [state, setState] = React.useState({
        page: 0,
        sortedBy: null,
        sortedDescending: false,
        pageData: [],
        maxPages: 0,
        loading: false,
    });
    const loading = props.loading || state.loading;
    const itemsPerPage = props.itemsPerPage || 10;
    useEffect(() => {
        setState((val) => {
            return { ...val, page: 0 };
        });
    }, [props.getPage]);
    const renderFunc = () => {
        const maybePromise = props.getPage(state.page, itemsPerPage);
        if (maybePromise instanceof Promise) {
            setState((val) => {
                return { ...val, loading: true };
            });
            maybePromise.then((obj) => {
                setState((val) => {
                    return {
                        ...val,
                        maxPages: obj.maxPages,
                        pageData: obj.data,
                        loading: false,
                    };
                });
            });
        }
        else {
            setState((val) => {
                return {
                    ...val,
                    maxPages: maybePromise.maxPages,
                    pageData: maybePromise.data,
                };
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
            tbody.push(_jsx(ListGroup.Item, { children: props.renderer(obj) }, i.toString()));
    }
    if (tbody.length === 0 && !loading) {
        tbody.push(_jsx(ListGroup.Item, { className: "bg-dark bg-opacity-25 text-white", children: _jsxs("div", { className: "d-flex align-items-center justify-content-center text-light text-opacity-75", children: [_jsx(Icon, { size: 24, className: "pb-1 me-2", icon: ic_not_interested }), _jsx("h4", { className: "my-3", children: "No data" })] }) }, '0'));
    }
    const numPageButtons = props.numPageButtons || 5;
    const buttons = [];
    const numPages = state.maxPages;
    const handlePageClick = (page) => {
        if (page < 0)
            return;
        if (page > numPages - 1)
            return;
        setState((val) => {
            return { ...val, page: page };
        });
    };
    if (numPages <= numPageButtons) {
        for (let i = 0; i < numPages; i++) {
            buttons.push(_jsx(PaginationButton, { page: i, currentPage: state.page, onClick: handlePageClick, disabled: loading }, 'page' + i));
        }
    }
    else if (state.page < numPageButtons / 2) {
        for (let i = 0; i < numPageButtons / 2 + 1; i++) {
            buttons.push(_jsx(PaginationButton, { page: i, currentPage: state.page, onClick: handlePageClick, disabled: loading }, 'page' + i));
        }
        buttons.push(_jsx(BaseButton, { variant: "clear", children: "..." }, 'ellipsis2'));
    }
    else if (numPages - state.page - 1 < numPageButtons / 2) {
        for (let i = 0; i < numPageButtons / 2 + 1; i++) {
            buttons.push(_jsx(PaginationButton, { page: numPages - i - 1, currentPage: state.page, onClick: handlePageClick, disabled: loading }, 'page' + (numPages - i - 1)));
        }
        buttons.push(_jsx(BaseButton, { variant: "clear", children: "..." }, 'ellipsis1'));
        buttons.reverse();
    }
    else {
        buttons.push(_jsx(BaseButton, { variant: "clear", children: "..." }, 'ellipsis1'));
        for (let i = state.page - 1; i <= state.page + 1; i++) {
            buttons.push(_jsx(PaginationButton, { page: i, currentPage: state.page, onClick: handlePageClick, disabled: loading }, 'page' + i));
        }
        buttons.push(_jsx(BaseButton, { variant: "clear", children: "..." }, 'ellipsis2'));
    }
    return (_jsxs("div", { children: [_jsxs("div", { className: "position-relative", children: [_jsx(Card, { className: "bg-transparent border-0", children: _jsx(ListGroup, { variant: "flush", children: tbody }) }), loading ? (_jsxs("div", { className: "table-loading-pane d-flex align-items-center justify-content-center flex-row gap-3 mt-4", children: [_jsx(Spinner, { animation: "border", role: "status" }), _jsx("span", { children: "Loading Swaps..." })] })) : ('')] }), numPages > 1 && (_jsx("div", { className: "d-flex align-items-center justify-content-center mt-5 mb-4", children: _jsxs(ButtonGroup, { className: "bg-dark bg-opacity-25", "aria-label": "Second group", children: [_jsx(BaseButton, { variant: "clear", onClick: () => handlePageClick(0), disabled: loading, children: _jsx(Icon, { size: 20, style: { marginTop: '-8px' }, icon: angleDoubleLeft }) }), _jsx(BaseButton, { variant: "clear", onClick: () => handlePageClick(state.page - 1), disabled: loading, children: _jsx(Icon, { size: 20, style: { marginTop: '-8px' }, icon: angleLeft }) }), buttons, _jsx(BaseButton, { variant: "clear", onClick: () => handlePageClick(state.page + 1), disabled: loading, children: _jsx(Icon, { size: 20, style: { marginTop: '-8px' }, icon: angleRight }) }), _jsx(BaseButton, { variant: "clear", onClick: () => handlePageClick(numPages - 1), disabled: loading, children: _jsx(Icon, { size: 20, style: { marginTop: '-8px' }, icon: angleDoubleRight }) })] }) }))] }));
}
