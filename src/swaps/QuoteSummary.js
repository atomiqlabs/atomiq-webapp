import { jsx as _jsx } from "react/jsx-runtime";
import { SwapType, } from '@atomiqlabs/sdk';
import { LNURLWithdrawQuoteSummary } from './frombtc/LNURLWithdrawQuoteSummary';
import { SpvVaultFromBTCQuoteSummary } from './frombtc/SpvVaultFromBTCQuoteSummary';
import { FromBTCLNQuoteSummary2 } from './frombtc/FromBTCLNQuoteSummary2';
import { ToBTCQuoteSummary2 } from './tobtc/ToBTCQuoteSummary2';
import { FromBTCQuoteSummary2 } from "./frombtc/FromBTCQuoteSummary2";
export function QuoteSummary(props) {
    if (!props.quote) {
        return null;
    }
    let swapElement;
    switch (props.quote.getType()) {
        case SwapType.TO_BTC:
        case SwapType.TO_BTCLN:
            swapElement = (_jsx(ToBTCQuoteSummary2, { type: props.type, UICallback: props.UICallback, quote: props.quote, refreshQuote: props.refreshQuote, autoContinue: props.autoContinue, notEnoughForGas: null, balance: props.balance }));
            break;
        case SwapType.FROM_BTC:
            swapElement = (_jsx(FromBTCQuoteSummary2, { type: props.type, UICallback: props.UICallback, quote: props.quote, refreshQuote: props.refreshQuote, abortSwap: props.abortSwap, notEnoughForGas: null, balance: props.balance, feeRate: props.feeRate }));
            break;
        case SwapType.FROM_BTCLN:
            const _quote = props.quote;
            if (_quote.lnurl != null && props.type !== 'swap') {
                //TODO: For now just mocked setAmountLock!!!
                swapElement = (_jsx(LNURLWithdrawQuoteSummary, { type: props.type, setAmountLock: () => { }, quote: _quote, refreshQuote: props.refreshQuote, autoContinue: props.autoContinue, notEnoughForGas: null }));
            }
            else {
                swapElement = (_jsx(FromBTCLNQuoteSummary2, { type: props.type, UICallback: props.UICallback, quote: _quote, refreshQuote: props.refreshQuote, abortSwap: props.abortSwap, notEnoughForGas: null }));
            }
            break;
        case SwapType.SPV_VAULT_FROM_BTC:
            swapElement = (_jsx(SpvVaultFromBTCQuoteSummary, { type: props.type, UICallback: props.UICallback, quote: props.quote, refreshQuote: props.refreshQuote, abortSwap: props.abortSwap, balance: props.balance, feeRate: props.feeRate }));
            break;
    }
    return swapElement;
}
