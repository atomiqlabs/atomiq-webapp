import {Token} from "@atomiqlabs/sdk";
import {useContext, useEffect, useRef, useState} from "react";
import {SwapsContext} from "../context/SwapsContext";
import BigNumber from "bignumber.js";
import {fromHumanReadable} from "./Currencies";
import {bnEqual} from "./Utils";

export function usePricing(_amount: BigNumber, currency: Token<any>): number {
    const {swapper} = useContext(SwapsContext);
    const [value, setValue] = useState<number>();

    const pricing = useRef<{
        updates: number,
        promise: Promise<any>
    }>({
        updates: 0,
        promise: Promise.resolve()
    });
    const lastValues = useRef<{amount: BigNumber, token: Token<any>}>(null);

    useEffect(() => {
        if(currency==null || swapper==null) return;

        if(lastValues.current!=null) {
            if(bnEqual(lastValues.current.amount, _amount) && lastValues.current.token===currency) return;
        }
        lastValues.current = {amount: _amount, token: currency};
        console.log("useEffect(): usePricing, ", _amount?.toString(), currency);

        pricing.current.updates++;
        const updateNum = pricing.current.updates;

        const amount: bigint = _amount==null ? null : fromHumanReadable(_amount, currency);

        setValue(null);

        if(amount==null || amount === 0n) return;

        const process = () => pricing.current.promise = swapper.prices.getUsdValue(amount, currency).then(value => {
            if(pricing.current.updates!==updateNum) return;
            setValue(value);
        });

        pricing.current.promise.then(process, process);
    }, [swapper, _amount, currency?.chain, currency?.ticker, (currency as any)?.chainId]);

    return value;
}
