import {useCallback, useContext, useEffect, useRef, useState} from "react";
import {AbstractSigner, ISwap, LNURLPay, LNURLWithdraw, SCToken, SwapType, Token} from "@atomiqlabs/sdk";
import {SwapsContext} from "../context/SwapsContext";
import BigNumber from "bignumber.js";
import {fromHumanReadable} from "./Currencies";

export function useQuote(
    signer: AbstractSigner,
    amount: BigNumber,
    exactIn: boolean,
    inToken: Token<any>,
    outToken: Token<any>,
    address: string | LNURLWithdraw | LNURLPay,
    handleQuotingError?: (exactIn: boolean, inToken: Token, outToken: Token, error: any) => boolean
): [() => void, ISwap, boolean, any] {
    const {swapper, chains} = useContext(SwapsContext);

    const [quote, setQuote] = useState<ISwap>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<any>(null);

    const quotingErrorCallbackRef = useRef<(exactIn: boolean, inToken: Token, outToken: Token, error: any) => boolean>(null);
    useEffect(() => {
        quotingErrorCallbackRef.current = handleQuotingError;
    }, [handleQuotingError]);

    const quoteUpdates = useRef<number>(0);
    const currentQuotation = useRef<Promise<any>>(Promise.resolve());

    const getQuote = useCallback(() => {
        quoteUpdates.current++;
        const updateNum = quoteUpdates.current;

        setQuote(null);
        setError(null);

        if(
            swapper==null || amount==null || exactIn==null || inToken==null || outToken==null || signer==null ||
            (outToken.chain==="BTC" && address==null)
        ) {
            setLoading(false);
            return;
        }

        const process = () => {
            if(quoteUpdates.current!==updateNum) return;
            setLoading(true);
            swapper.create(signer.getAddress(), inToken, outToken, fromHumanReadable(amount, exactIn ? inToken : outToken), exactIn, address).then(swap => {
                if(quoteUpdates.current!==updateNum) return;
                setLoading(false);
                setQuote(swap);
            }).catch(e => {
                let shouldSetError = true;
                if(quotingErrorCallbackRef.current!=null) shouldSetError = !quotingErrorCallbackRef.current(exactIn, inToken, outToken, e);
                if(quoteUpdates.current!==updateNum) return;
                setLoading(false);
                if(shouldSetError) setError(e);
            });
        };

        currentQuotation.current.then(process, process);
    }, [swapper, amount, exactIn, inToken, outToken, address, signer]);

    useEffect(() => {
        getQuote();
    }, [swapper, amount, exactIn, inToken, outToken, address, signer]);

    return [getQuote, quote, loading, error];
}
