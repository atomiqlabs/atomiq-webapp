import {
    FromBTCLNSwap,
    FromBTCLNSwapState,
    FromBTCSwap,
    FromBTCSwapState,
    ISwap, SpvFromBTCSwapState,
    SwapType,
    ToBTCSwapState
} from "@atomiqlabs/sdk";
import {useEffect, useRef, useState} from "react";

function getStateToString(swapType: SwapType, state: number) {
    switch(swapType) {
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

export function useSwapState<S extends number>(quote: ISwap<any, S>) {

    const [state, setState] = useState<S>(null);
    const [isInitiated, setInitiated] = useState<boolean>(null);

    const [quoteTimeRemaining, setQuoteTimeRemaining] = useState<number>();
    const [initialQuoteTimeout, setInitialQuoteTimeout] = useState<number>();
    const expiryTime = useRef<number>();

    useEffect(() => {
        if(quote==null) {
            setState(null);
            setQuoteTimeRemaining(null);
            setInitialQuoteTimeout(null);
            expiryTime.current = null;
            return () => {};
        }

        let interval;
        interval = setInterval(() => {
            if(expiryTime.current==null) return;
            let dt = expiryTime.current-Date.now();
            setQuoteTimeRemaining(
                Math.max(Math.floor(dt/1000), 0)
            );
        }, 500);

        const checkExpiry = (state: S) => {
            expiryTime.current = quote.getQuoteExpiry();
            if(quote.getType()===SwapType.FROM_BTCLN) {
                if(state===FromBTCLNSwapState.PR_CREATED) {
                    expiryTime.current = (quote as ISwap as FromBTCLNSwap<any>).getTimeoutTime();
                }
                if(state===FromBTCLNSwapState.CLAIM_COMMITED) {
                    expiryTime.current = (quote as ISwap as FromBTCLNSwap<any>).getHtlcTimeoutTime();
                }
            }
            if(quote.getType()===SwapType.FROM_BTC) {
                if(state >= FromBTCSwapState.CLAIM_COMMITED) {
                    expiryTime.current = (quote as ISwap as FromBTCSwap<any>).getTimeoutTime();
                }
            }

            const dt = Math.floor((expiryTime.current-Date.now())/1000);
            setInitialQuoteTimeout(Math.max(dt, 1));
            setQuoteTimeRemaining(dt);
        }

        checkExpiry(quote.getState());
        setState(quote.getState());
        setInitiated(quote.isInitiated());

        let listener;
        quote.events.on("swapState", listener = (quote: ISwap<any, S>) => {
            const state = quote.getState();
            checkExpiry(state);
            setState(state);
            setInitiated(quote.isInitiated());
            console.log("useSwapState("+quote.getId()+"): State changed to: "+getStateToString(quote.getType(), state), quote);
            if(quote.isFinished()) {
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