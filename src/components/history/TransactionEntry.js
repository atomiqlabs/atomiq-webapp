import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { isSCToken, SwapDirection } from '@atomiqlabs/sdk';
import { useNavigate } from 'react-router-dom';
import { FEConstants } from '../../FEConstants';
import { Col, Row } from 'react-bootstrap';
import { usePricing } from '../../hooks/pricing/usePricing';
import { useChain } from '../../hooks/chains/useChain';
import { TransactionToken } from './TransactionToken';
import { TextPill } from '../common/TextPill';
import { BaseButton } from '../common/BaseButton';
export function TransactionEntry(props) {
    const navigate = useNavigate();
    const input = props.swap.getInput();
    const output = props.swap.getOutput();
    const inputExplorer = isSCToken(input.token)
        ? FEConstants.blockExplorers[input.token.chainId]
        : !input.token.lightning
            ? FEConstants.btcBlockExplorer
            : null;
    const outputExplorer = isSCToken(output.token)
        ? FEConstants.blockExplorers[output.token.chainId]
        : !output.token.lightning
            ? FEConstants.btcBlockExplorer
            : null;
    const txIdInput = props.swap.getInputTxId();
    const txIdOutput = props.swap.getOutputTxId();
    // Get input address - for TO_BTC it's the smart chain address, for FROM_BTC it's the Bitcoin sender address
    const inputAddress = props.swap._getInitiator ? props.swap._getInitiator() : '';
    const outputAddress = props.swap.getOutputAddress(); // Destination address for both swap types
    const refundable = props.swap.getDirection() === SwapDirection.TO_BTC && props.swap.isRefundable();
    const claimable = props.swap.getDirection() === SwapDirection.FROM_BTC &&
        props.swap.isClaimable();
    const inputUsdValue = usePricing(input.amount, input.token);
    const outputUsdValue = usePricing(output.amount, output.token);
    const inputChain = useChain(input.token);
    const outputChain = useChain(output.token);
    const navigateToSwap = (event) => {
        if (event) {
            event.preventDefault();
        }
        navigate('/?swapId=' + props.swap.getId());
    };
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
    const requiresAction = props.swap.requiresAction();
    const isPending = !props.swap.isSuccessful() &&
        !props.swap.isFailed() &&
        !props.swap.isQuoteSoftExpired() &&
        !refundable &&
        !claimable;
    const badge = props.swap.isSuccessful() ? (_jsx(TextPill, { variant: "success", children: "Success" })) : props.swap.isFailed() ? (_jsx(TextPill, { variant: "danger", children: "Failed" })) : props.swap.isQuoteSoftExpired() ? (_jsx(TextPill, { variant: "danger", children: "Quote expired" })) : refundable ? (_jsx(TextPill, { variant: "warning", children: "Refundable" })) : claimable ? (_jsx(TextPill, { variant: "warning", children: "Claimable" })) : requiresAction && isPending ? (_jsx(TextPill, { variant: "warning", children: "Awaiting payment" })) : (_jsx(TextPill, { variant: "warning", children: "Pending" }));
    return (_jsxs(Row, { className: "transaction-entry is-clickable gx-1 gy-1", onClick: navigateToSwap, children: [props.swap.requiresAction() && _jsx("span", { className: "transaction-entry__alert" }), _jsxs(Col, { md: 4, sm: 12, className: "is-token", children: [_jsx(TransactionToken, { token: input.token, amount: input.amount, address: inputAddress, label: "from", explorer: inputExplorer, txId: txIdInput }), _jsx("div", { className: "is-arrow", children: _jsx("i", { className: "icon icon-arrow-right" }) })] }), _jsx(Col, { md: 3, sm: 12, className: "is-token", children: _jsx(TransactionToken, { token: output.token, amount: output.amount, address: outputAddress, label: "to", explorer: outputExplorer, txId: txIdOutput }) }), _jsx(Col, { md: 1, sm: 2, className: "is-value is-right", children: _jsx("div", { children: outputUsdValue != null ? FEConstants.USDollar.format(outputUsdValue) : '-' }) }), _jsxs(Col, { md: 2, sm: 6, xs: 8, className: "d-flex text-end flex-column is-date is-right", children: [_jsx("div", { className: "sc-date", children: formatDate(props.swap.createdAt) }), _jsx("div", { className: "sc-time", children: formatTime(props.swap.createdAt) })] }), _jsx(Col, { md: 2, sm: 4, xs: 4, className: "d-flex text-end flex-column is-status", children: requiresAction ? (_jsx(BaseButton, { variant: "secondary", className: "width-fill", customIcon: refundable ? 'refund' : claimable || isPending ? 'claim' : null, onClick: () => navigateToSwap(null), children: refundable ? 'Refund' : claimable ? 'Claim' : isPending ? 'Pay' : 'View' })) : (badge) })] }));
}
