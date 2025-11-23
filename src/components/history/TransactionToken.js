import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ChainIcon } from '../tokens/ChainIcon';
import { truncateAddress } from '../../utils/Utils';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
export function TransactionToken(props) {
    const handleCopyAddress = async (e) => {
        e.stopPropagation();
        if (props.address) {
            try {
                await navigator.clipboard.writeText(props.address);
            }
            catch (err) {
                console.error('Failed to copy address:', err);
            }
        }
    };
    const handleLinkClick = (e) => {
        e.stopPropagation();
    };
    return (_jsxs("div", { className: "transaction-token", children: [_jsx(ChainIcon, { token: props.token }), _jsxs("div", { className: "transaction-token__data", children: [_jsxs("div", { className: "transaction-token__amount", children: [props.amount, " ", props.token.ticker || '???'] }), _jsxs("div", { className: "transaction-token__address", children: [_jsxs(_Fragment, { children: [props.label && _jsx("span", { className: "sc-sub", children: props.label }), _jsx("span", { className: "sc-address", children: !!props.address ? truncateAddress(props.address) : 'Unknown' }), props.address && _jsx(OverlayTrigger, { placement: "top", overlay: _jsx(Tooltip, { id: "copy-address-tooltip", children: "Copy address" }), children: _jsx("i", { className: "icon icon-copy", onClick: handleCopyAddress, style: { cursor: 'pointer' } }) })] }), props.explorer != null && props.txId != null && (_jsx(OverlayTrigger, { placement: "top", overlay: _jsx(Tooltip, { id: "view-transaction-tooltip", children: "View transaction" }), children: _jsx("a", { className: "sc-link icon icon-new-window", target: "_blank", href: props.explorer + props.txId, onClick: handleLinkClick }) }))] })] })] }));
}
