import {useCallback, useContext, useEffect, useRef, useState} from "react";
import {
    AbstractSigner,
    isBtcToken,
    isSCToken,
    ISwap,
    LNURLPay,
    LNURLWithdraw,
    SpvFromBTCOptions,
    SwapType,
    Token
} from "@atomiqlabs/sdk";
import {SwapsContext} from "../context/SwapsContext";
import BigNumber from "bignumber.js";
import {fromHumanReadable} from "./Currencies";

const btcFeeMaxOffset = 3;
const btcFeeMaxMultiple = 1.5;

export function useQuote(
    signer: AbstractSigner,
    amount: BigNumber,
    exactIn: boolean,
    inToken: Token<any>,
    outToken: Token<any>,
    address: string | LNURLWithdraw | LNURLPay,
    gasDropAmount?: bigint,
    handleQuotingError?: (exactIn: boolean, inToken: Token, outToken: Token, error: any) => boolean,
    btcFeeRate?: number
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
        console.log("useQuote(): Connected signer: ", signer);

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
            let createPromise: Promise<ISwap>;
            if(isSCToken(outToken) && isBtcToken(inToken) && !inToken.lightning && swapper.supportsSwapType(outToken.chainId, SwapType.SPV_VAULT_FROM_BTC)) {
                const options: SpvFromBTCOptions = {};
                if(gasDropAmount!=null && gasDropAmount!==0n) {
                    options.gasAmount = gasDropAmount;
                }
                if(btcFeeRate!=null) options.maxAllowedNetworkFeeRate = btcFeeMaxOffset + (btcFeeRate * btcFeeMaxMultiple);
                createPromise = swapper.createFromBTCSwapNew(outToken.chainId, address as string, outToken.address, fromHumanReadable(amount, exactIn ? inToken : outToken), !exactIn, undefined, options)
            } else {
                createPromise = swapper.create(signer.getAddress(), inToken, outToken, fromHumanReadable(amount, exactIn ? inToken : outToken), exactIn, address);
            }
            currentQuotation.current = createPromise.then(swap => {
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
    }, [swapper, amount, exactIn, inToken, outToken, address, signer, gasDropAmount, btcFeeRate]);

    useEffect(() => {
        getQuote();
        // console.log("useQuote(): Request new quote: ", [amount, exactIn, inToken, outToken, address, signer, gasDropAmount, btcFeeRate]);
    }, [swapper, amount, exactIn, inToken, outToken, address, signer, gasDropAmount]);

    return [getQuote, quote, loading, error];
}
