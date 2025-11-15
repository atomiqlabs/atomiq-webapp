import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { IFromBTCSwap, isSCToken, IToBTCSwap, SwapDirection } from '@atomiqlabs/sdk';
import { useNavigate } from 'react-router-dom';
import { FEConstants } from '../../FEConstants';
import { Button, Col, Row } from 'react-bootstrap';
import { usePricing } from '../../hooks/pricing/usePricing';
import { useChain } from '../../hooks/chains/useChain';
import { HistoryToken } from './HistoryToken';
import { TextPill } from '../common/TextPill';
export function HistoryEntry(props) {
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
    const inputAddress = props.swap instanceof IToBTCSwap
        ? props.swap._getInitiator()
        : props.swap instanceof IFromBTCSwap
            ? props.swap._getInitiator()
            : '';
    const outputAddress = props.swap.getOutputAddress();
    const refundable = props.swap.getDirection() === SwapDirection.TO_BTC && props.swap.isRefundable();
    const claimable = props.swap.getDirection() === SwapDirection.FROM_BTC &&
        props.swap.isClaimable();
    const inputUsdValue = usePricing(input.amount, input.token);
    const outputUsdValue = usePricing(output.amount, output.token);
    const inputChain = useChain(input.token);
    const outputChain = useChain(output.token);
    const navigateToSwap = (event) => {
        event.preventDefault();
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
    const badge = props.swap.isSuccessful() ? (_jsx(TextPill, { variant: "success", children: "Success" })) : props.swap.isFailed() ? (_jsx(TextPill, { variant: "danger", children: "Failed" })) : props.swap.isQuoteSoftExpired() ? (_jsx(TextPill, { variant: "danger", children: "Quote expired" })) : refundable ? (_jsx(TextPill, { variant: "warning", children: "Refundable" })) : claimable ? (_jsx(TextPill, { variant: "warning", children: "Claimable" })) : (_jsx(TextPill, { variant: "warning", children: "Pending" }));
    return (_jsxs(Row, { className: "history-entry is-clickable gx-1 gy-1", onClick: navigateToSwap, children: [_jsxs(Col, { md: 4, sm: 12, className: "is-token", children: [_jsx(HistoryToken, { token: input.token, amount: input.amount, address: inputAddress, label: "from" }), _jsx("div", { className: "is-arrow", children: _jsx("i", { className: "icon icon-arrow-right" }) })] }), _jsx(Col, { md: 3, sm: 12, className: "is-token", children: _jsx(HistoryToken, { token: output.token, amount: output.amount, address: outputAddress, label: "to" }) }), _jsx(Col, { md: 1, sm: 2, className: "is-value is-right", children: _jsx("div", { children: outputUsdValue != null ? FEConstants.USDollar.format(outputUsdValue) : '-' }) }), _jsxs(Col, { md: 2, sm: 6, xs: 8, className: "d-flex text-end flex-column is-date is-right", children: [_jsx("div", { className: "sc-date", children: formatDate(props.swap.createdAt) }), _jsx("div", { className: "sc-time", children: formatTime(props.swap.createdAt) })] }), _jsx(Col, { md: 1, sm: 4, xs: 4, className: "d-flex text-end flex-column is-status", children: claimable || refundable ? (_jsx(Button, { variant: claimable || refundable ? 'primary' : 'secondary', size: "sm", 
                    // href removed to prevent navigation conflicts
                    className: "width-fill", onClick: navigateToSwap, children: refundable ? 'Refund' : claimable ? 'Claim' : 'View' })) : (badge) })] }));
}
