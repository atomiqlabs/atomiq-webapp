import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChainIcon } from '../tokens/ChainIcon';
import { truncateAddress } from '../../utils/Utils';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
export function HistoryToken(props) {
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
    return (_jsxs("div", { className: "history-entry__token", children: [_jsx(ChainIcon, { token: props.token }), _jsxs("div", { className: "history-entry__token__data", children: [_jsxs("div", { className: "history-entry__token__amount", children: [props.amount, " ", props.token.ticker || '???'] }), props.address && (_jsxs("div", { className: "history-entry__token__address", children: [props.label && _jsx("span", { className: "sc-sub", children: props.label }), _jsx("span", { className: "sc-address", children: truncateAddress(props.address) }), _jsx(OverlayTrigger, { placement: "top", overlay: _jsx(Tooltip, { id: "copy-address-tooltip", children: "Copy address" }), children: _jsx("i", { className: "icon icon-copy", onClick: handleCopyAddress, style: { cursor: 'pointer' } }) })] }))] })] }));
}
