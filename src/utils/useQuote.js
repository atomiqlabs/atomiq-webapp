import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { SwapsContext } from "../context/SwapsContext";
import { fromHumanReadable } from "./Currencies";
export function useQuote(signer, amount, exactIn, inToken, outToken, address, handleQuotingError) {
    const { swapper, chains } = useContext(SwapsContext);
    const [quote, setQuote] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const quotingErrorCallbackRef = useRef(null);
    useEffect(() => {
        quotingErrorCallbackRef.current = handleQuotingError;
    }, [handleQuotingError]);
    const quoteUpdates = useRef(0);
    const currentQuotation = useRef(Promise.resolve());
    const getQuote = useCallback(() => {
        quoteUpdates.current++;
        const updateNum = quoteUpdates.current;
        setQuote(null);
        setError(null);
        if (swapper == null || amount == null || exactIn == null || inToken == null || outToken == null || signer == null ||
            (outToken.chain === "BTC" && address == null)) {
            setLoading(false);
            return;
        }
        const process = () => {
            if (quoteUpdates.current !== updateNum)
                return;
            setLoading(true);
            currentQuotation.current = swapper.create(signer.getAddress(), inToken, outToken, fromHumanReadable(amount, exactIn ? inToken : outToken), exactIn, address).then(swap => {
                if (quoteUpdates.current !== updateNum)
                    return;
                setLoading(false);
                setQuote(swap);
            }).catch(e => {
                let shouldSetError = true;
                if (quotingErrorCallbackRef.current != null)
                    shouldSetError = !quotingErrorCallbackRef.current(exactIn, inToken, outToken, e);
                if (quoteUpdates.current !== updateNum)
                    return;
                setLoading(false);
                if (shouldSetError)
                    setError(e);
            });
        };
        currentQuotation.current.then(process, process);
    }, [swapper, amount, exactIn, inToken, outToken, address, signer]);
    useEffect(() => {
        getQuote();
    }, [swapper, amount, exactIn, inToken, outToken, address, signer]);
    return [getQuote, quote, loading, error];
}
