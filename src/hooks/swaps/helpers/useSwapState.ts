import {
  FromBTCLNAutoSwap,
  FromBTCLNAutoSwapState,
  FromBTCLNSwap,
  FromBTCLNSwapState,
  FromBTCSwap,
  FromBTCSwapState,
  ISwap,
  LnForGasSwapState,
  OnchainForGasSwapState,
  SpvFromBTCSwapState,
  SwapType,
  ToBTCSwapState,
} from '@atomiqlabs/sdk';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useStateRef} from "../../utils/useStateRef";

function getStateToString(swapType: SwapType, state: number) {
  switch (swapType) {
    case SwapType.TO_BTCLN:
    case SwapType.TO_BTC:
      return ToBTCSwapState[state];
    case SwapType.FROM_BTCLN:
      return FromBTCLNSwapState[state];
    case SwapType.FROM_BTCLN_AUTO:
      return FromBTCLNAutoSwapState[state];
    case SwapType.FROM_BTC:
      return FromBTCSwapState[state];
    case SwapType.SPV_VAULT_FROM_BTC:
      return SpvFromBTCSwapState[state];
    case SwapType.TRUSTED_FROM_BTCLN:
      return LnForGasSwapState[state];
    case SwapType.TRUSTED_FROM_BTC:
      return OnchainForGasSwapState[state];
  }
}

export function useSwapState<S extends number>(quote: ISwap<any, any, S>, onSwapStateChange?: (state: S, initiated: boolean) => void) {
  const [state, setState] = useState<S>(quote?.getState());
  const [isInitiated, setInitiated] = useState<boolean>(null);

  const onSwapStateChangeRef = useStateRef(onSwapStateChange);

  const [quoteTimeRemaining, setQuoteTimeRemaining] = useState<number>();
  const [initialQuoteTimeout, setInitialQuoteTimeout] = useState<number>();
  const expiryTime = useRef<number>();

  //TODO: It turns out this isn't the best idea, this throws an error when we try to update the
  // state in the onSwapStateChange callback
  //Use useMemo here, such that the state updates don't wait till after render (as with useEffect())
  useMemo(() => {
    if (quote == null) {
      setState(null);
      if(onSwapStateChangeRef.current) onSwapStateChangeRef.current(null, false);
      setQuoteTimeRemaining(null);
      setInitialQuoteTimeout(null);
      expiryTime.current = null;
    } else {
      setState(quote.getState());
      setInitiated(quote.isInitiated());
      if(onSwapStateChangeRef.current) onSwapStateChangeRef.current(quote.getState(), quote.isInitiated());
    }
  }, [quote]);

  useEffect(() => {
    if (quote == null) return () => {};

    let interval;
    interval = setInterval(() => {
      if (expiryTime.current == null) return;
      let dt = expiryTime.current - Date.now();
      setQuoteTimeRemaining(Math.max(Math.floor(dt / 1000), 0));
    }, 500);

    const checkExpiry = (state: S) => {
      let initialExpiryTime = expiryTime.current;
      expiryTime.current = quote.getQuoteExpiry();
      if (quote.getType() === SwapType.FROM_BTCLN) {
        if (state === FromBTCLNSwapState.PR_CREATED) {
          expiryTime.current = (quote as ISwap as FromBTCLNSwap<any>).getTimeoutTime();
        }
        if (state === FromBTCLNSwapState.CLAIM_COMMITED) {
          expiryTime.current = (quote as ISwap as FromBTCLNSwap<any>).getHtlcTimeoutTime();
        }
      }
      if(quote.getType() === SwapType.FROM_BTCLN_AUTO) {
        if(state === FromBTCLNAutoSwapState.CLAIM_COMMITED) {
          expiryTime.current = (quote as ISwap as FromBTCLNAutoSwap<any>).getHtlcTimeoutTime();
        }
      }
      if (quote.getType() === SwapType.FROM_BTC) {
        if (state >= FromBTCSwapState.CLAIM_COMMITED) {
          expiryTime.current = (quote as ISwap as FromBTCSwap<any>).getTimeoutTime();
        }
      }

      if(initialExpiryTime===expiryTime.current) return;

      const dt = Math.floor((expiryTime.current - Date.now()) / 1000);
      setInitialQuoteTimeout(Math.max(dt, 1));
      setQuoteTimeRemaining(dt);
    };

    let oldState = quote.getState();
    checkExpiry(oldState);

    let listener;
    quote.events.on(
      'swapState',
      (listener = (quote: ISwap<any, any, S>) => {
        const state = quote.getState();
        if(oldState !== state) checkExpiry(state);
        oldState = state;
        setState(state);
        setInitiated(quote.isInitiated());
        if(onSwapStateChangeRef.current) onSwapStateChangeRef.current(state, quote.isInitiated());
        console.log(
          'useSwapState(' +
            quote.getId() +
            '): State changed to: ' +
            getStateToString(quote.getType(), state),
          quote
        );
        if (quote.isFinished()) {
          setInitialQuoteTimeout(null);
          setQuoteTimeRemaining(null);
          clearInterval(interval);
        }
      })
    );

    return () => {
      clearInterval(interval);
      quote.events.removeListener('swapState', listener);
    };
  }, [quote]);

  return {
    state,
    quoteTimeRemaining,
    totalQuoteTime: initialQuoteTimeout,
    isInitiated,
  };
}
