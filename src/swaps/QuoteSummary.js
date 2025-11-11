import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { SwapType, } from '@atomiqlabs/sdk';
import { SpvVaultFromBTCQuoteSummary } from './frombtc/onchain-spvvault/SpvVaultFromBTCQuoteSummary';
import { FromBTCLNQuoteSummary } from './frombtc/lightning/FromBTCLNQuoteSummary';
import { ToBTCQuoteSummary } from './tobtc/ToBTCQuoteSummary';
import { FromBTCQuoteSummary } from "./frombtc/onchain/FromBTCQuoteSummary";
export function QuoteSummary(props) {
    if (!props.quote) {
        return null;
    }
    let swapElement;
    switch (props.quote.getType()) {
        case SwapType.TO_BTC:
        case SwapType.TO_BTCLN:
            swapElement = (_jsx(ToBTCQuoteSummary, { type: props.type, UICallback: props.UICallback, quote: props.quote, refreshQuote: props.refreshQuote, autoContinue: props.autoContinue, notEnoughForGas: null, balance: props.balance }));
            break;
        case SwapType.FROM_BTC:
            swapElement = (_jsx(FromBTCQuoteSummary, { type: props.type, UICallback: props.UICallback, quote: props.quote, refreshQuote: props.refreshQuote, abortSwap: props.abortSwap, notEnoughForGas: null, balance: props.balance, feeRate: props.feeRate }));
            break;
        case SwapType.FROM_BTCLN:
            const _quote = props.quote;
            if (_quote.lnurl != null && props.type !== 'swap') {
                swapElement = _jsx(_Fragment, {});
            }
            else {
                swapElement = (_jsx(FromBTCLNQuoteSummary, { type: props.type, UICallback: props.UICallback, quote: _quote, refreshQuote: props.refreshQuote, abortSwap: props.abortSwap, notEnoughForGas: null }));
            }
            break;
        case SwapType.SPV_VAULT_FROM_BTC:
            swapElement = (_jsx(SpvVaultFromBTCQuoteSummary, { type: props.type, UICallback: props.UICallback, quote: props.quote, refreshQuote: props.refreshQuote, abortSwap: props.abortSwap, balance: props.balance, feeRate: props.feeRate }));
            break;
    }
    return swapElement;
}
