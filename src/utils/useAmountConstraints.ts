import {
    isSCToken,
    MultichainSwapBounds,
    SCToken,
    SwapType,
    Token,
} from "@atomiqlabs/sdk";
import BigNumber from "bignumber.js";
import {useCallback, useContext, useEffect, useMemo, useState} from "react";
import {toHumanReadable} from "./Currencies";
import {SwapsContext} from "../context/SwapsContext";
import {Tokens} from "../FEConstants";

type SwapTypeBounds = {
    [swapType in SwapType]?: {min: bigint, max: bigint}
};

const defaultConstraints = {
    min: 1n,
    max: null as bigint
};

function getSwapType(inCurrency: Token, outCurrency: Token) {
    if(outCurrency?.ticker===Tokens.BITCOIN.BTC.ticker) return SwapType.TO_BTC;
    if(outCurrency?.ticker===Tokens.BITCOIN.BTCLN.ticker) return SwapType.TO_BTCLN;
    if(inCurrency?.ticker===Tokens.BITCOIN.BTC.ticker) return SwapType.FROM_BTC;
    if(inCurrency?.ticker===Tokens.BITCOIN.BTCLN.ticker) return SwapType.FROM_BTCLN;
    return null;
}

function toBigNumbers(input: {min: bigint, max: bigint}, token: Token): {
    min: BigNumber,
    max: BigNumber
} {
    if(token==null) return null;
    if(input==null) return null;
    return {
        min: toHumanReadable(input.min, token),
        max: toHumanReadable(input.max, token)
    }
}

export function useAmountConstraints(exactIn: boolean, inCurrency: Token, outCurrency: Token): {
    inConstraints: {min: BigNumber, max: BigNumber},
    outConstraints: {min: BigNumber, max: BigNumber},
    supportedTokensSet: Set<string>,
    handleQuoteError: (exactIn: boolean, inToken: Token, outToken: Token, error: any) => boolean
} {
    const {swapper} = useContext(SwapsContext);

    const [lpsUpdateCount, setLpsUpdateCounts] = useState<number>(0);

    useEffect(() => {
        if(swapper==null) return;
        let removeListener = (intermediaries) => {
            console.log("useAmountConstraints(): Intermediaries removed: ", intermediaries);
            setLpsUpdateCounts(prevState => prevState+1);
        };
        let addListener = (intermediaries) => {
            console.log("useAmountConstraints(): Intermediaries added: ", intermediaries);
            setLpsUpdateCounts(prevState => prevState+1);
        };
        swapper.on("lpsRemoved",  removeListener);
        swapper.on("lpsAdded",  addListener);

        return () => {
            swapper.off("lpsRemoved", removeListener);
            swapper.off("lpsAdded", addListener);
        }
    }, [swapper]);

    const swapType: SwapType = getSwapType(inCurrency, outCurrency);

    const btcAmountConstraints = useMemo<MultichainSwapBounds>(
        () => swapper==null? null : swapper.getSwapBounds(),
        [swapper, lpsUpdateCount]
    );

    const defaultBtcConstraints = useMemo<SwapTypeBounds>(() => {
        if(btcAmountConstraints==null) return null;
        const result: SwapTypeBounds = {};
        for(let swapType in btcAmountConstraints) {
            result[swapType] = {min: null, max: null};
            for(let chainId in btcAmountConstraints[swapType]) {
                for(let token in btcAmountConstraints[swapType][chainId]) {
                    let min: bigint = btcAmountConstraints[swapType][chainId][token].min;
                    if(result[swapType].min != null && result[swapType].min < min) min = result[swapType].min;
                    let max: bigint = btcAmountConstraints[swapType][chainId][token].max;
                    if(result[swapType].max != null && result[swapType].max > max) max = result[swapType].max;
                    result[swapType] = {
                        min, max
                    };
                }
            }
        }
        return result;
    }, [btcAmountConstraints]);

    const supportedTokensSet = useMemo<Set<string>>(
        () => swapper==null || swapType==null ? null : new Set(swapper.getSupportedTokens(swapType).map(token => token.chainId+":"+token.address)),
        [swapper, swapType, lpsUpdateCount]
    );

    const [tokenConstraints, setTokenConstraints] = useState<MultichainSwapBounds>();
    const handleQuoteError = useCallback((exactIn: boolean, inToken: Token, outToken: Token, err: any) => {
        const swapType = getSwapType(inToken, outToken);
        const currency = exactIn ? inToken : outToken;
        if(!isSCToken(currency)) return false;
        if(err==null || err.min==null || err.max==null) return false;
        setTokenConstraints(val => {
            val ??= {};
            val[swapType] ??= {};
            val[swapType][currency.chainId] ??= {};
            val[swapType][currency.chainId][currency.address] ??= {
                min: err.min,
                max: err.max
            };
            return val;
        });
        return true;
    }, []);

    const {inConstraints, outConstraints} = useMemo(() => {
        const isSend: boolean = swapType===SwapType.TO_BTC || swapType===SwapType.TO_BTCLN;

        let inConstraints: {min: bigint, max: bigint};
        let outConstraints: {min: bigint, max: bigint};
        if(exactIn) {
            outConstraints = defaultConstraints;
            if(!isSend) {
                const _outCurrency = outCurrency as SCToken;
                inConstraints = defaultBtcConstraints?.[swapType];
                if(_outCurrency!=null) {
                    inConstraints = btcAmountConstraints?.[swapType]?.[_outCurrency.chainId]?.[_outCurrency.address] ?? defaultConstraints;
                    outConstraints = tokenConstraints?.[swapType]?.[_outCurrency.chainId]?.[_outCurrency.address] ?? defaultConstraints;
                }
            } else {
                const _inCurrency = inCurrency as SCToken;
                outConstraints = defaultBtcConstraints?.[swapType];
                if(_inCurrency!=null) {
                    inConstraints = tokenConstraints?.[swapType]?.[_inCurrency.chainId]?.[_inCurrency.address] ?? defaultConstraints;
                    outConstraints = btcAmountConstraints?.[swapType]?.[_inCurrency.chainId]?.[_inCurrency.address] ?? defaultConstraints;
                }
            }
        } else { //exact out
            inConstraints = defaultConstraints;
            if(!isSend) {
                const _outCurrency = outCurrency as SCToken;
                inConstraints = defaultBtcConstraints?.[swapType];
                if(_outCurrency!=null) {
                    outConstraints = tokenConstraints?.[swapType]?.[_outCurrency.chainId]?.[_outCurrency.address] ?? defaultConstraints;
                    inConstraints = btcAmountConstraints?.[swapType]?.[_outCurrency.chainId]?.[_outCurrency.address] ?? defaultConstraints;
                }
            } else { //tobtc
                const _inCurrency = inCurrency as SCToken;
                outConstraints = defaultBtcConstraints?.[swapType];
                if(_inCurrency!=null) {
                    outConstraints = btcAmountConstraints?.[swapType]?.[_inCurrency.chainId]?.[_inCurrency.address] ?? defaultConstraints;
                    inConstraints = tokenConstraints?.[swapType]?.[_inCurrency.chainId]?.[_inCurrency.address] ?? defaultConstraints
                }
            }
        }
        return {
            inConstraints: toBigNumbers(inConstraints, inCurrency),
            outConstraints: toBigNumbers(outConstraints, outCurrency)
        }
    }, [btcAmountConstraints, tokenConstraints, inCurrency, outCurrency, exactIn]);

    return {
        inConstraints,
        outConstraints,
        supportedTokensSet,
        handleQuoteError
    };
}
