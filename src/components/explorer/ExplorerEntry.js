import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge, Col, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';
import { toHumanReadableString } from '@atomiqlabs/sdk';
import { FEConstants, TokenResolver, Tokens } from '../../FEConstants';
import { getTimeDeltaText } from '../../utils/Utils';
import { TokenIcon } from '../tokens/TokenIcon';
import Icon from 'react-icons-kit';
import { ic_arrow_forward } from 'react-icons-kit/md/ic_arrow_forward';
import { ic_arrow_downward } from 'react-icons-kit/md/ic_arrow_downward';
export function ExplorerEntry({ row }) {
    const chainId = row.chainId ?? 'SOLANA';
    let inputAmount;
    let inputCurrency;
    let outputAmount;
    let outputCurrency;
    let inputExplorer;
    let txIdInput;
    let outputExplorer;
    let txIdOutput;
    let inputAddress = 'Unknown';
    let outputAddress = 'Unknown';
    let inputInfo;
    let outputInfo;
    if (row.direction === 'ToBTC') {
        inputAmount = BigInt(row.rawAmount);
        inputCurrency = TokenResolver[chainId].getToken(row.token);
        outputAmount = row.btcRawAmount == null ? null : BigInt(row.btcRawAmount);
        outputCurrency = row.type === 'CHAIN' ? Tokens.BITCOIN.BTC : Tokens.BITCOIN.BTCLN;
        txIdInput = row.txInit;
        txIdOutput = row.type === 'CHAIN' ? row.btcTx : row.paymentHash;
        inputExplorer = FEConstants.blockExplorers[chainId];
        outputExplorer = row.type === 'CHAIN' ? FEConstants.btcBlockExplorer : null;
        if (row.type === 'LN') {
            outputInfo = 'Lightning network amounts and addresses are private!';
        }
        else if (!row.finished) {
            outputInfo = 'BTC amounts for pending swaps are blinded!';
        }
        else if (!row.success) {
            outputInfo = 'BTC amounts & addresses for failed swaps are never un-blinded!';
        }
        inputAddress = row.clientWallet;
        if (row.type === 'CHAIN')
            outputAddress = row.btcAddress || 'Unknown';
    }
    else {
        outputAmount = BigInt(row.rawAmount);
        outputCurrency = TokenResolver[chainId].getToken(row.token);
        inputAmount = row.btcRawAmount == null ? null : BigInt(row.btcRawAmount);
        inputCurrency = row.type === 'CHAIN' ? Tokens.BITCOIN.BTC : Tokens.BITCOIN.BTCLN;
        txIdOutput = row.txInit;
        txIdInput = row.type === 'CHAIN' ? row.btcTx : row.paymentHash;
        outputExplorer = FEConstants.blockExplorers[chainId];
        inputExplorer = row.type === 'CHAIN' ? FEConstants.btcBlockExplorer : null;
        if (row.type === 'LN') {
            inputInfo = 'Lightning network amounts and addresses are private!';
        }
        else if (!row.finished) {
            inputInfo = 'BTC amounts for pending swaps are blinded!';
        }
        else if (!row.success) {
            inputInfo = 'BTC amounts & addresses for failed swaps are never un-blinded!';
        }
        outputAddress = row.clientWallet;
        if (row.type === 'CHAIN' && row.btcInAddresses != null) {
            inputAddress = row.btcInAddresses[0];
        }
    }
    return (_jsxs(Row, { className: "transaction-entry d-flex flex-row gx-1 gy-1", children: [_jsx(Col, { xl: 2, md: 12, className: "d-flex text-md-end text-start", children: _jsxs(Row, { className: "gx-1 gy-0 width-fill", children: [_jsx(Col, { xl: 6, md: 2, xs: 6, children: !row.finished ? (_jsx(Badge, { bg: "primary", className: "width-fill", children: "Pending" })) : row.success ? (_jsx(Badge, { bg: "success", className: "width-fill", children: "Success" })) : row.direction === 'FromBTC' ? (_jsx(Badge, { bg: "warning", className: "width-fill bg-atomiq-orange", children: "Expired" })) : (_jsx(Badge, { bg: "danger", className: "width-fill", children: "Refunded" })) }), _jsx(Col, { xl: 6, md: 2, xs: 6, children: _jsxs(Badge, { bg: row.type === 'LN' ? 'dark' : row.kind === -1 ? 'info' : 'warning', className: "width-fill", children: [row.type === 'LN' ? 'Lightning' : 'On-chain', _jsx("img", { src: '/icons/chains/' + chainId + '.svg', alt: chainId, className: "ms-1", style: {
                                            width: '18px',
                                            marginTop: '-8px',
                                            marginBottom: '-4px',
                                        } })] }) }), _jsx(Col, { xl: 0, lg: 2, md: 1, xs: 0 }), _jsx(Col, { xl: 12, lg: 2, md: 3, xs: 6, children: _jsx("small", { className: "", children: new Date(row.timestampInit * 1000).toLocaleString() }) }), _jsx(Col, { xl: 12, md: 2, xs: 3, children: _jsxs("small", { className: "", children: [getTimeDeltaText(row.timestampInit * 1000), " ago"] }) }), _jsx(Col, { xl: 12, md: 2, xs: 3, className: "text-end", children: _jsx("span", { className: "font-weight-500", children: FEConstants.USDollar.format(row._usdValue) }) })] }) }), _jsx(Col, { xl: 10, md: 12, className: "d-flex", children: _jsx("div", { className: "card border-0 bg-white bg-opacity-10 p-2 width-fill container-fluid", children: _jsxs(Row, { className: "", children: [_jsxs(Col, { md: 6, xs: 12, className: "d-flex flex-row align-items-center", children: [_jsxs("div", { className: "min-width-0 me-md-2", children: [_jsx("a", { className: "font-small single-line-ellipsis", target: "_blank", href: inputExplorer == null || txIdInput == null ? null : inputExplorer + txIdInput, children: txIdInput || 'None' }), _jsxs("span", { className: "d-flex align-items-center font-weight-500 my-1", children: [_jsx(TokenIcon, { tokenOrTicker: inputCurrency, className: "currency-icon-medium" }), inputAmount == null || inputCurrency == null
                                                        ? '???'
                                                        : toHumanReadableString(inputAmount, inputCurrency), ' ', inputCurrency?.ticker || '???', inputInfo != null ? (_jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: 'explorer-tooltip-in-' + row.id, children: inputInfo }), children: _jsx(Badge, { bg: "primary", className: "ms-2 pill-round px-2", pill: true, children: "?" }) })) : ('')] }), _jsx("small", { className: "single-line-ellipsis", children: inputAddress })] }), _jsx(Icon, { size: 22, icon: ic_arrow_forward, className: "d-md-block d-none", style: {
                                            marginLeft: 'auto',
                                            marginRight: '-22px',
                                            marginBottom: '6px',
                                        } })] }), _jsx(Col, { md: 0, xs: 12, className: "d-md-none d-flex justify-content-center", children: _jsx(Icon, { size: 22, icon: ic_arrow_downward, className: "", style: { marginBottom: '6px' } }) }), _jsxs(Col, { md: 6, xs: 12, className: "ps-md-4", children: [_jsx("a", { className: "font-small single-line-ellipsis", target: "_blank", href: outputExplorer == null || txIdOutput == null ? null : outputExplorer + txIdOutput, children: txIdOutput || '...' }), _jsxs("span", { className: "d-flex align-items-center font-weight-500 my-1", children: [_jsx(TokenIcon, { tokenOrTicker: outputCurrency, className: "currency-icon-medium" }), outputAmount == null || outputCurrency == null
                                                ? '???'
                                                : toHumanReadableString(outputAmount, outputCurrency), ' ', outputCurrency?.ticker || '???', outputInfo != null ? (_jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: 'explorer-tooltip-out-' + row.id, children: outputInfo }), children: _jsx(Badge, { bg: "primary", className: "ms-2 pill-round px-2", pill: true, children: "?" }) })) : ('')] }), _jsx("small", { className: "single-line-ellipsis", children: outputAddress })] })] }) }) })] }));
}
