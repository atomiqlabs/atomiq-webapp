import { FromBTCLNSwapState, FromBTCSwapState, SpvFromBTCSwapState, SwapType, ToBTCSwapState } from "@atomiqlabs/sdk";
import { useEffect, useRef, useState } from "react";
function getStateToString(swapType, state) {
    switch (swapType) {
        case SwapType.TO_BTCLN:
        case SwapType.TO_BTC:
            return ToBTCSwapState[state];
        case SwapType.FROM_BTCLN:
            return FromBTCLNSwapState[state];
        case SwapType.FROM_BTC:
            return FromBTCSwapState[state];
        case SwapType.SPV_VAULT_FROM_BTC:
            return SpvFromBTCSwapState[state];
    }
}
export function useSwapState(quote) {
    const [state, setState] = useState(null);
    const [isInitiated, setInitiated] = useState(null);
    const [quoteTimeRemaining, setQuoteTimeRemaining] = useState();
    const [initialQuoteTimeout, setInitialQuoteTimeout] = useState();
    const expiryTime = useRef();
    useEffect(() => {
        if (quote == null) {
            setState(null);
            setQuoteTimeRemaining(null);
            setInitialQuoteTimeout(null);
            expiryTime.current = null;
            return () => { };
        }
        let interval;
        interval = setInterval(() => {
            if (expiryTime.current == null)
                return;
            let dt = expiryTime.current - Date.now();
            setQuoteTimeRemaining(Math.max(Math.floor(dt / 1000), 0));
        }, 500);
        const checkExpiry = (state) => {
            expiryTime.current = quote.getQuoteExpiry();
            if (quote.getType() === SwapType.FROM_BTCLN) {
                if (state === FromBTCLNSwapState.PR_CREATED) {
                    expiryTime.current = quote.getTimeoutTime();
                }
                if (state === FromBTCLNSwapState.CLAIM_COMMITED) {
                    expiryTime.current = quote.getHtlcTimeoutTime();
                }
            }
            if (quote.getType() === SwapType.FROM_BTC) {
                if (state >= FromBTCSwapState.CLAIM_COMMITED) {
                    expiryTime.current = quote.getTimeoutTime();
                }
            }
            const dt = Math.floor((expiryTime.current - Date.now()) / 1000);
            setInitialQuoteTimeout(Math.max(dt, 1));
            setQuoteTimeRemaining(dt);
        };
        checkExpiry(quote.getState());
        setState(quote.getState());
        setInitiated(quote.isInitiated());
        let listener;
        quote.events.on("swapState", listener = (quote) => {
            const state = quote.getState();
            checkExpiry(state);
            setState(state);
            setInitiated(quote.isInitiated());
            console.log("useSwapState(" + quote.getId() + "): State changed to: " + getStateToString(quote.getType(), state), quote);
            if (quote.isFinished()) {
                setInitialQuoteTimeout(null);
                setQuoteTimeRemaining(null);
                clearInterval(interval);
            }
        });
        return () => {
            clearInterval(interval);
            quote.events.removeListener("swapState", listener);
        };
    }, [quote]);
    return {
        state,
        quoteTimeRemaining,
        totalQuoteTime: initialQuoteTimeout,
        isInitiated
    };
}
