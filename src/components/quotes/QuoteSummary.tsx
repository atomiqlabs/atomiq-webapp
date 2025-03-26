import {FromBTCLNSwap, FromBTCSwap, ISwap, IToBTCSwap, SCToken, SpvFromBTCSwap, SwapType} from "@atomiqlabs/sdk";
import {ToBTCQuoteSummary} from "./tobtc/ToBTCQuoteSummary";
import {LNURLWithdrawQuoteSummary} from "./frombtc/LNURLWithdrawQuoteSummary";
import {FromBTCLNQuoteSummary} from "./frombtc/FromBTCLNQuoteSummary";
import {FromBTCQuoteSummary} from "./frombtc/FromBTCQuoteSummary";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {SwapsContext} from "../../context/SwapsContext";
import {FEConstants} from "../../FEConstants";
import {SpvVaultFromBTCQuoteSummary} from "./frombtc/SpvVaultFromBTCQuoteSummary";

export function QuoteSummary(props: {
    quote: ISwap,
    refreshQuote: () => void,
    setAmountLock?: (isLocked: boolean) => void,
    type?: "payment" | "swap",
    abortSwap?: () => void,
    balance?: bigint,
    autoContinue?: boolean,
    feeRate?: number
}) {
    const {swapper, getSigner} = useContext(SwapsContext);
    const signer = getSigner(props.quote);

    const [notEnoughForGas, setNotEnoughForGas] = useState<bigint>(null);
    useEffect(() => {
        setNotEnoughForGas(null);
        let cancelled = false;

        if(signer==null || swapper==null || props.quote==null) return;

        //Check if the user has enough lamports to cover solana transaction fees
        props.quote.hasEnoughForTxFees().then((result) => {
            if(result.enoughBalance) return;
            console.log("Quote hasEnoughForTxFees(): Balance: "+result.balance.amount+" Required: "+result.required.amount+" Enough: "+result.enoughBalance);
            if(cancelled) return;

            const nativeToken = result.balance.token as SCToken;

            if(!result.enoughBalance) {
                setNotEnoughForGas(FEConstants.scBalances[props.quote.chainIdentifier].optimal[nativeToken.address] + result.required.rawAmount - result.balance.rawAmount);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [swapper, props.quote, signer]);

    let swapElement: JSX.Element;

    switch(props.quote.getType()){
        case SwapType.TO_BTC:
        case SwapType.TO_BTCLN:
            swapElement = <ToBTCQuoteSummary
                type={props.type}
                setAmountLock={props.setAmountLock}
                quote={props.quote as IToBTCSwap}
                refreshQuote={props.refreshQuote}
                autoContinue={props.autoContinue}
                notEnoughForGas={notEnoughForGas}
            />;
            break;
        case SwapType.FROM_BTC:
            swapElement = <FromBTCQuoteSummary
                type={props.type}
                setAmountLock={props.setAmountLock}
                quote={props.quote as FromBTCSwap}
                refreshQuote={props.refreshQuote}
                abortSwap={props.abortSwap}
                notEnoughForGas={notEnoughForGas}
                balance={props.balance}
                feeRate={props.feeRate}
            />;
            break;
        case SwapType.FROM_BTCLN:
            const _quote = props.quote as FromBTCLNSwap;
            if(_quote.lnurl!=null && props.type!=="swap") {
                swapElement = <LNURLWithdrawQuoteSummary
                    type={props.type}
                    setAmountLock={props.setAmountLock}
                    quote={_quote}
                    refreshQuote={props.refreshQuote}
                    autoContinue={props.autoContinue}
                    notEnoughForGas={notEnoughForGas}
                />;
            } else {
                swapElement = <FromBTCLNQuoteSummary
                    type={props.type}
                    setAmountLock={props.setAmountLock}
                    quote={_quote}
                    refreshQuote={props.refreshQuote}
                    abortSwap={props.abortSwap}
                    notEnoughForGas={notEnoughForGas}
                />;
            }
            break;
        case SwapType.SPV_VAULT_FROM_BTC:
            swapElement = <SpvVaultFromBTCQuoteSummary
                type={props.type}
                setAmountLock={props.setAmountLock}
                quote={props.quote as SpvFromBTCSwap<any>}
                refreshQuote={props.refreshQuote}
                abortSwap={props.abortSwap}
                balance={props.balance}
                feeRate={props.feeRate}
            />;
            break;
    }

    return swapElement;

}