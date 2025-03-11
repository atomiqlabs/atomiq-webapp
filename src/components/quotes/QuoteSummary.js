import { jsx as _jsx } from "react/jsx-runtime";
import { SwapType } from "@atomiqlabs/sdk";
import { ToBTCQuoteSummary } from "./tobtc/ToBTCQuoteSummary";
import { LNURLWithdrawQuoteSummary } from "./frombtc/LNURLWithdrawQuoteSummary";
import { FromBTCLNQuoteSummary } from "./frombtc/FromBTCLNQuoteSummary";
import { FromBTCQuoteSummary } from "./frombtc/FromBTCQuoteSummary";
import { useContext, useEffect, useState } from "react";
import { SwapsContext } from "../../context/SwapsContext";
import { FEConstants } from "../../FEConstants";
export function QuoteSummary(props) {
    const { swapper, getSigner } = useContext(SwapsContext);
    const signer = getSigner(props.quote);
    const [notEnoughForGas, setNotEnoughForGas] = useState(null);
    useEffect(() => {
        setNotEnoughForGas(null);
        let cancelled = false;
        if (signer == null || swapper == null || props.quote == null)
            return;
        //Check if the user has enough lamports to cover solana transaction fees
        props.quote.hasEnoughForTxFees().then((result) => {
            console.log("Quote hasEnoughForTxFees(): Balance: " + result.balance.amount + " Required: " + result.required.amount + " Enough: " + result.enoughBalance);
            if (cancelled)
                return;
            const nativeToken = result.balance.token;
            if (!result.enoughBalance) {
                setNotEnoughForGas(FEConstants.scBalances[props.quote.chainIdentifier].optimal[nativeToken.address] + result.required.rawAmount - result.balance.rawAmount);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [swapper, props.quote, signer]);
    let swapElement;
    switch (props.quote.getType()) {
        case SwapType.TO_BTC:
        case SwapType.TO_BTCLN:
            swapElement = _jsx(ToBTCQuoteSummary, { type: props.type, setAmountLock: props.setAmountLock, quote: props.quote, refreshQuote: props.refreshQuote, autoContinue: props.autoContinue, notEnoughForGas: notEnoughForGas });
            break;
        case SwapType.FROM_BTC:
            swapElement = _jsx(FromBTCQuoteSummary, { type: props.type, setAmountLock: props.setAmountLock, quote: props.quote, refreshQuote: props.refreshQuote, abortSwap: props.abortSwap, notEnoughForGas: notEnoughForGas, balance: props.balance, feeRate: props.feeRate });
            break;
        case SwapType.FROM_BTCLN:
            const _quote = props.quote;
            if (_quote.lnurl != null && props.type !== "swap") {
                swapElement = _jsx(LNURLWithdrawQuoteSummary, { type: props.type, setAmountLock: props.setAmountLock, quote: _quote, refreshQuote: props.refreshQuote, autoContinue: props.autoContinue, notEnoughForGas: notEnoughForGas });
            }
            else {
                swapElement = _jsx(FromBTCLNQuoteSummary, { type: props.type, setAmountLock: props.setAmountLock, quote: _quote, refreshQuote: props.refreshQuote, abortSwap: props.abortSwap, notEnoughForGas: notEnoughForGas });
            }
            break;
    }
    return swapElement;
}
