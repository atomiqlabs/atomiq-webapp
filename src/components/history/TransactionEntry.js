import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { FEConstants } from '../../FEConstants';
import { Col, Row } from 'react-bootstrap';
import { usePricing } from '../../hooks/pricing/usePricing';
import { TransactionToken } from './TransactionToken';
import { TextPill } from '../common/TextPill';
import { BaseButton } from '../common/BaseButton';
import { useCallback } from 'react';
import classNames from 'classnames';
export function TransactionEntry(props) {
    const navigate = useNavigate();
    const usdValueHook = usePricing(props.outputAmount, !props.usdValue && props.outputToken);
    const usdValue = !!props.usdValue
        ? `$${props.usdValue}`
        : usdValueHook != null
            ? FEConstants.USDollar.format(usdValueHook)
            : null;
    const navigateToSwap = useCallback((event) => {
        if (event) {
            event.preventDefault();
        }
        if (props.id == null)
            return;
        navigate('/?swapId=' + props.id);
    }, [props.id]);
    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZoneName: 'short',
        });
    };
    const isPending = !props.isSuccessful &&
        !props.isFailed &&
        !props.isQuoteSoftExpired &&
        !props.refundable &&
        !props.claimable;
    const badge = props.isSuccessful ? (_jsx(TextPill, { variant: "success", children: "Success" })) : props.isFailed ? (_jsx(TextPill, { variant: "danger", children: "Failed" })) : props.isQuoteSoftExpired ? (_jsx(TextPill, { variant: "danger", children: "Quote expired" })) : props.refundable ? (_jsx(TextPill, { variant: "warning", children: "Refundable" })) : props.claimable ? (_jsx(TextPill, { variant: "warning", children: "Claimable" })) : props.requiresAction && isPending ? (_jsx(TextPill, { variant: "warning", children: "Awaiting payment" })) : (_jsx(TextPill, { variant: "warning", children: "Pending" }));
    return (_jsxs(Row, { className: classNames('transaction-entry', 'gx-1', 'gy-1', {
            'is-clickable': props.id != null,
        }), onClick: navigateToSwap, children: [props.requiresAction && _jsx("span", { className: "transaction-entry__alert" }), _jsxs(Col, { md: 4, xs: 7, className: "is-token", children: [_jsx(TransactionToken, { token: props.inputToken, amount: props.inputAmount, address: props.inputAddress, label: "from", explorer: props.inputExplorer, txId: props.inputTxId }), _jsx("div", { className: "is-arrow", children: _jsx("i", { className: "icon icon-arrow-right" }) })] }), _jsx(Col, { md: 3, xs: 5, className: "is-token", children: _jsx(TransactionToken, { token: props.outputToken, amount: props.outputAmount, address: props.outputAddress, label: "to", explorer: props.outputExplorer, txId: props.outputTxId }) }), _jsxs(Col, { md: 1, sm: 2, className: "is-value is-right", children: [_jsx("span", { className: "sc-mobile-label", children: "Value" }), _jsx("div", { children: usdValue != null ? usdValue : '-' })] }), _jsxs(Col, { md: 2, sm: 12, className: "d-flex text-end is-date is-right", children: [_jsx("span", { className: "sc-mobile-label", children: "Date" }), _jsxs("div", { className: "sc-date", children: [formatDate(props.createdAt), _jsx("span", { className: "d-inline d-sm-hidden", children: "," })] }), _jsx("div", { className: "sc-time", children: formatTime(props.createdAt) })] }), _jsx(Col, { md: 2, sm: 12, className: "d-flex text-end is-status", children: props.requiresAction ? (_jsx(BaseButton, { variant: "secondary", className: "width-fill", customIcon: props.refundable ? 'refund' : props.claimable || isPending ? 'claim' : null, onClick: () => navigateToSwap(null), children: props.refundable ? 'Refund' : props.claimable ? 'Claim' : isPending ? 'Pay' : 'View' })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "sc-mobile-label", children: "Status" }), badge] })) })] }));
}
