import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Col, Row } from 'react-bootstrap';
import { ArrayDataPaginatedList } from '../list/ArrayDataPaginatedList';
import { TransactionEntry } from '../history/TransactionEntry';
export function TransactionsTable({ data, itemsPerPage = 100 }) {
    return (_jsxs("div", { className: "transactions-table", children: [_jsx("div", { className: "transactions-table__head", children: _jsxs(Row, { className: "history-entry gx-1 gy-1", children: [_jsx(Col, { md: 4, sm: 12, className: "is-token", children: "From" }), _jsx(Col, { md: 3, sm: 12, className: "is-token", children: "To" }), _jsx(Col, { md: 1, sm: 12, className: "is-value is-right", children: "Value" }), _jsx(Col, { md: 2, sm: 12, className: "d-flex text-end flex-column is-date is-right", children: "Date" }), _jsx(Col, { md: 1, sm: 12, className: "d-flex text-end flex-column is-status", children: "Status" })] }) }), _jsx(ArrayDataPaginatedList, { renderer: (row) => _jsx(TransactionEntry, { swap: row }), data: data, itemsPerPage: itemsPerPage })] }));
}
