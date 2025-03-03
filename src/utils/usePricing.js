import { useContext, useEffect, useRef, useState } from "react";
import { SwapsContext } from "../context/SwapsContext";
import { fromHumanReadable } from "./Currencies";
import { bnEqual } from "./Utils";
export function usePricing(_amount, currency) {
    const { swapper } = useContext(SwapsContext);
    const [value, setValue] = useState();
    const pricing = useRef({
        updates: 0,
        promise: Promise.resolve()
    });
    const lastValues = useRef(null);
    useEffect(() => {
        if (currency == null || swapper == null)
            return;
        if (lastValues.current != null) {
            if (bnEqual(lastValues.current.amount, _amount) && lastValues.current.token === currency)
                return;
        }
        lastValues.current = { amount: _amount, token: currency };
        console.log("useEffect(): usePricing, ", _amount?.toString(), currency);
        pricing.current.updates++;
        const updateNum = pricing.current.updates;
        const amount = _amount == null ? null : fromHumanReadable(_amount, currency);
        setValue(null);
        if (amount == null || amount === 0n)
            return;
        const process = () => pricing.current.promise = swapper.prices.getUsdValue(amount, currency).then(value => {
            if (pricing.current.updates !== updateNum)
                return;
            setValue(value);
        });
        pricing.current.promise.then(process, process);
    }, [swapper, _amount, currency?.chain, currency?.ticker, currency?.chainId]);
    return value;
}
