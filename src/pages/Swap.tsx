import {
    FromBTCSwap,
    FromBTCSwapState,
    IFromBTCSwap,
    ISwap,
    IToBTCSwap,
    LNURLPay,
    LNURLWithdraw, MultichainTokenBounds, SCToken,
    Swapper,
    SwapType, ToBTCLNSwap,
    ToBTCSwap,
    ToBTCSwapState, Token, TokenBounds, Tokens
} from "@atomiqlabs/sdk";
import {Alert, Button, Card, OverlayTrigger, Spinner, Tooltip} from "react-bootstrap";
import {MutableRefObject, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import ValidatedInput, {ValidatedInputRef} from "../components/ValidatedInput";
import BigNumber from "bignumber.js";
import * as React from "react";
import {
    bitcoinTokenArray,
    fromHumanReadableString, smartChainTokenArray,
    toHumanReadable, toHumanReadableString
} from "../utils/Currencies";
import {CurrencyDropdown} from "../components/CurrencyDropdown";
import {SimpleFeeSummaryScreen} from "../components/fees/SimpleFeeScreen";
import {QuoteSummary} from "../components/quotes/QuoteSummary";
import {SwapTopbar} from "../components/SwapTopbar";
import {useLocation, useNavigate} from "react-router-dom";
import Icon from "react-icons-kit";
import {arrows_vertical} from 'react-icons-kit/ikons/arrows_vertical';
import * as bitcoin from "bitcoinjs-lib";
import * as randomBytes from "randombytes";
import {FEConstants} from "../FEConstants";
import * as BN from "bn.js";
import {ic_qr_code_scanner} from 'react-icons-kit/md/ic_qr_code_scanner';
import {lock} from 'react-icons-kit/fa/lock';
import {QRScannerModal} from "../components/qr/QRScannerModal";
import {BitcoinWalletContext} from "../context/BitcoinWalletContext";
import {BitcoinWalletAnchor} from "../components/wallet/BitcoinWalletButton";
import {WebLNContext} from "../context/WebLNContext";
import {WebLNAnchor} from "../components/wallet/WebLNButton";
import {ic_account_balance_wallet} from 'react-icons-kit/md/ic_account_balance_wallet';
import {ic_content_copy} from 'react-icons-kit/md/ic_content_copy';
import {SwapsContext} from "../context/SwapsContext";

const defaultConstraints = {
    min: new BigNumber("0.000001"),
    max: null
};

const RANDOM_BTC_ADDRESS = bitcoin.payments.p2wsh({
    hash: randomBytes(32),
    network: FEConstants.chain === "DEVNET" ? bitcoin.networks.testnet : bitcoin.networks.bitcoin
}).address;

function isCreated(swap: ISwap) {
    if(swap instanceof IToBTCSwap) {
        return swap.getState()===ToBTCSwapState.CREATED;
    }
    if(swap instanceof FromBTCSwap) {
        return swap.getState()===FromBTCSwapState.PR_CREATED;
    }
    return false;
}

function usePricing(swapper: Swapper<any>, _amount: string, currency: Token): number {
    const [value, setValue] = useState<number>();

    const pricing = useRef<{
        updates: number,
        promise: Promise<any>
    }>({
        updates: 0,
        promise: Promise.resolve()
    });

    useEffect(() => {
        console.log("useEffect(): usePricing, ", _amount, currency);
        if(currency==null) return;
        if(swapper==null) return;

        pricing.current.updates++;
        const updateNum = pricing.current.updates;

        const amount: BN = _amount==null ? null : new BN(_amount);

        setValue(null);

        if(amount==null || amount.isZero()) {
            return;
        }

        const process = () => {
            pricing.current.promise = (async () => {
                return await swapper.prices.getUsdValue(amount, currency);
            })().then(value => {
                if(pricing.current.updates!==updateNum) {
                    return;
                }
                setValue(value);
            });
        };

        pricing.current.promise.then(process, process);
    }, [_amount, currency]);

    return value;
}

function useConstraints(swapper: Swapper<any>, address: string, exactIn: boolean, inCurrency: Token, outCurrency: Token): {
    inConstraints: {min: BigNumber, max: BigNumber},
    outConstraints: {min: BigNumber, max: BigNumber},
    updateTokenConstraints: (swapType: SwapType, currency: SCToken, data: {min: BN, max: BN}) => void,
    updateAddressConstraints: (currency: SCToken, address: string, data: {min: BN, max: BN}) => void
} {

    const [addressConstraintsOverride, setAddressConstraintsOverride] = useState<{
        currency: SCToken,
        address: string,
        data: {
            min: BigNumber,
            max: BigNumber
        }
    }>();
    const updateAddressConstraints = (currency: SCToken, address: string, data: {min: BN, max: BN}) => {
        setAddressConstraintsOverride({
            currency,
            address,
            data: {
                min: data.min!=null ? toHumanReadable(data.min, currency) : null,
                max: data.max!=null ? toHumanReadable(data.max, currency) : null
            }
        });
    };

    const [lpsUpdateCount, setLpsUpdateCounts] = useState<number>(0);

    useEffect(() => {
        if(swapper==null) return;
        let removeListener = (intermediaries) => {
            console.log("[SwapTab2] Intermediaries removed: ", intermediaries);
            setLpsUpdateCounts(prevState => prevState+1);
        };
        let addListener = (intermediaries) => {
            console.log("[SwapTab2] Intermediaries added: ", intermediaries);
            setLpsUpdateCounts(prevState => prevState+1);
        };
        swapper.on("lpsRemoved",  removeListener);
        swapper.on("lpsAdded",  addListener);

        return () => {
            swapper.off("lpsRemoved", removeListener);
            swapper.off("lpsAdded", addListener);
        }
    }, [swapper]);

    const btcAmountConstraints = useMemo<{
        [key in SwapType]?: {
            [chainId: string]: {
                [token: string]: {
                    min: BigNumber,
                    max: BigNumber
                }
            }
        }
    }>(() => {
        if(swapper==null) {
            return null;
        }

        const constraints: {
            [key in SwapType]?: {
                [chainId: string]: {
                    [token: string]: {
                        min: BigNumber,
                        max: BigNumber
                    }
                }
            }
        } = {};

        const bounds = swapper.getSwapBounds();
        for(let swapType in bounds) {
            constraints[swapType] = {};
            const chainBounds: MultichainTokenBounds = bounds[swapType];
            for(let chainId in chainBounds) {
                constraints[swapType][chainId] = {};
                const tokenBounds: TokenBounds = chainBounds[chainId];
                for(let token in tokenBounds) {
                    constraints[swapType][chainId][token] = {
                        min: toHumanReadable(tokenBounds[token].min, Tokens.BITCOIN.BTC),
                        max: toHumanReadable(tokenBounds[token].max, Tokens.BITCOIN.BTC)
                    };
                }
            }
        }

        console.log("[SwapTab2] Recomputed constraints: ", constraints);

        return constraints;
    }, [swapper, lpsUpdateCount]);

    let swapType: SwapType;
    if(outCurrency?.ticker==="BTC") swapType = SwapType.TO_BTC;
    if(outCurrency?.ticker==="BTC-LN") swapType = SwapType.TO_BTCLN;
    if(inCurrency?.ticker==="BTC") swapType = SwapType.FROM_BTC;
    if(inCurrency?.ticker==="BTC-LN") swapType = SwapType.FROM_BTCLN;

    const [tokenConstraints, setTokenConstraints] = useState<{
        [key in SwapType]?: {
            [chainId: string]: {
                [token: string]: {
                    min: BigNumber,
                    max: BigNumber
                }
            }
        }
    }>();
    const updateTokenConstraints = (swapType: SwapType, currency: SCToken, data: {min: BN, max: BN}) => {
        setTokenConstraints(val => {
            val ??= {};
            val[swapType] ??= {};
            val[swapType][currency.chainId] ??= {};
            val[swapType][currency.chainId][currency.address] ??= {
                min: toHumanReadable(data.min, currency),
                max: toHumanReadable(data.max, currency)
            };
            return val;
        });
    };

    let isSend: boolean = swapType===SwapType.TO_BTC || swapType===SwapType.TO_BTCLN;

    let inConstraints: {min: BigNumber, max: BigNumber};
    let outConstraints: {min: BigNumber, max: BigNumber};
    if(exactIn) {
        outConstraints = defaultConstraints;
        if(!isSend) {
            inConstraints = btcAmountConstraints==null || btcAmountConstraints[swapType]==null
                ? defaultConstraints :
                (btcAmountConstraints[swapType][outCurrency.address.toString()] || defaultConstraints);
        } else {
            const constraint = tokenConstraints==null ? null : tokenConstraints[inCurrency.address.toString()];
            if(constraint!=null) {
                inConstraints = constraint[swapType] || defaultConstraints;
            } else {
                inConstraints = defaultConstraints;
            }
        }
    } else { //exact out
        inConstraints = defaultConstraints;
        if(!isSend) {
            const constraint = tokenConstraints==null ? null : tokenConstraints[outCurrency.address.toString()];
            if(constraint!=null) {
                outConstraints = constraint[swapType] || defaultConstraints;
            } else {
                outConstraints = defaultConstraints;
            }
        } else { //tobtc
            outConstraints = btcAmountConstraints==null || btcAmountConstraints[swapType]==null ? defaultConstraints : (btcAmountConstraints[swapType][inCurrency.address.toString()] || defaultConstraints);
        }
    }

    if(addressConstraintsOverride!=null && addressConstraintsOverride.address===address) {
        let changeConstraints = null;
        if(addressConstraintsOverride.currency===inCurrency) changeConstraints = inConstraints;
        if(addressConstraintsOverride.currency===outCurrency) changeConstraints = outConstraints;

        if(changeConstraints!=null) {
            if(addressConstraintsOverride.data.min!=null) changeConstraints.min = BigNumber.max(changeConstraints.min, addressConstraintsOverride.data.min);
            if(addressConstraintsOverride.data.max!=null) changeConstraints.max = BigNumber.min(changeConstraints.max, addressConstraintsOverride.data.max);
        }
    }

    return {inConstraints, outConstraints, updateTokenConstraints, updateAddressConstraints};
}

function useQuote(
    swapper: Swapper<any>,
    address: string,
    amount: string,
    inCurrency: CurrencySpec,
    outCurrency: CurrencySpec,
    exactIn: boolean,
    locked: boolean,

    addressRef: MutableRefObject<ValidatedInputRef>,
    inAmountRef: MutableRefObject<ValidatedInputRef>,
    outAmountRef: MutableRefObject<ValidatedInputRef>
) {
    const navigate = useNavigate();

    const {inConstraints, outConstraints, updateTokenConstraints, updateAddressConstraints} = useConstraints(swapper, address, exactIn, inCurrency, outCurrency);

    const [quoteError, setQuoteError] = useState<Error>();
    const [quoteAddressError, setQuoteAddressError] = useState<{address: string, error: string}>();
    const [quoteAddressLoading, setQuoteAddressLoading] = useState<boolean>(false);
    const [quoteLoading, setQuoteLoading] = useState<boolean>(false);
    const [quote, _setQuote] = useState<ISwap>();
    const quoteRef = useRef<ISwap>();
    const setQuote = (_quote: ISwap) => _setQuote(quoteRef.current = _quote);

    const isLNURL = address==null ? false : swapper.isValidLNURL(address);
    const lnurlData = useRef<{
        data: Promise<LNURLPay | LNURLWithdraw>,
        address: string
    }>();

    const quoteUpdates = useRef<number>(0);
    const currentQuotation = useRef<Promise<any>>(Promise.resolve());

    const getQuote = async () => {
        if(locked) return;

        setQuote(null);

        if(swapper==null) return;

        if(inCurrency==null) return;
        if(outCurrency==null) return;

        quoteUpdates.current++;
        const updateNum = quoteUpdates.current;

        setQuoteError(null);

        if(!isLNURL) {
            setQuoteAddressError(null);
        }

        let useAddress = address;
        if(outCurrency?.ticker==="BTC") {
            if(!addressRef.current.validate()) {
                if(address==="") {
                    useAddress = RANDOM_BTC_ADDRESS;
                } else {
                    setQuoteLoading(false);
                    return;
                }
            }
        }
        if(outCurrency?.ticker==="BTC-LN") {
            if(!addressRef.current.validate()) {
                setQuoteLoading(false);
                return;
            }
        }

        let dataLNURL: LNURLPay;

        if(isLNURL) {
            if(lnurlData.current?.address!==useAddress) {
                setQuoteAddressError(null);
                lnurlData.current = {
                    address: useAddress,
                    data: swapper.getLNURLTypeAndData(useAddress, false).catch(e => {
                        console.log(e);
                        return null;
                    })
                };
            }

            setQuoteAddressLoading(true);
            const lnurlResult = await lnurlData.current.data;
            if(quoteUpdates.current!==updateNum) return;
            setQuoteAddressLoading(false);
            if(lnurlResult==null) {
                setQuoteAddressError({
                    address: useAddress,
                    error: "Invalid LNURL / Lightning address"
                });
                return;
            }

            if(lnurlResult.type==="withdraw") {
                navigate("/scan/2?address="+encodeURIComponent(useAddress), {
                    state: {
                        lnurlParams: {
                            ...lnurlResult,
                            min: lnurlResult.min.toString(10),
                            max: lnurlResult.max.toString(10)
                        }
                    }
                });
                return;
            }

            updateAddressConstraints(outCurrency, useAddress, lnurlResult);
            dataLNURL = lnurlResult;
        }

        if(exactIn) {
            outAmountRef.current.validate();
            if(!inAmountRef.current.validate() || amount==="") {
                setQuoteLoading(false);
                return;
            }
        } else {
            inAmountRef.current.validate();
            if(!outAmountRef.current.validate() || amount==="") {
                setQuoteLoading(false);
                return;
            }
        }

        const process = () => {
            if(quoteUpdates.current!==updateNum) {
                return;
            }
            setQuoteLoading(true);

            let additionalParam: Record<string, any>;
            const affiliate = window.localStorage.getItem("atomiq-affiliate");
            if(affiliate!=null) {
                additionalParam = {
                    affiliate
                };
            }

            let promise: Promise<ISwap>;
            let swapType: SwapType;
            let tokenCurrency: CurrencySpec;
            let quoteCurrency: CurrencySpec;
            if(inCurrency?.ticker==="BTC") {
                swapType = SwapType.FROM_BTC;
                tokenCurrency = outCurrency;
                quoteCurrency = exactIn ? inCurrency : outCurrency;
                promise = swapper.createFromBTCSwap(outCurrency.address, fromHumanReadableString(amount, quoteCurrency), !exactIn, additionalParam);
            }
            if(inCurrency?.ticker==="BTC-LN") {
                swapType = SwapType.FROM_BTCLN;
                tokenCurrency = outCurrency;
                quoteCurrency = exactIn ? inCurrency : outCurrency;
                promise = swapper.createFromBTCLNSwap(outCurrency.address, fromHumanReadableString(amount, quoteCurrency), !exactIn, null, additionalParam);
            }
            if(outCurrency?.ticker==="BTC") {
                swapType = SwapType.TO_BTC;
                tokenCurrency = inCurrency;
                quoteCurrency = exactIn ? inCurrency : outCurrency;
                promise = swapper.createToBTCSwap(inCurrency.address, useAddress, fromHumanReadableString(amount, quoteCurrency), null, null, exactIn, additionalParam);
            }
            if(outCurrency?.ticker==="BTC-LN") {
                swapType = SwapType.TO_BTCLN;
                tokenCurrency = inCurrency;
                quoteCurrency = outCurrency;
                if(dataLNURL!=null) {
                    quoteCurrency = exactIn ? inCurrency : outCurrency;
                    promise = swapper.createToBTCLNSwapViaLNURL(inCurrency.address, dataLNURL, fromHumanReadableString(amount, quoteCurrency), null, 5*24*60*60, null, null, exactIn, additionalParam);
                } else {
                    promise = swapper.createToBTCLNSwap(inCurrency.address, useAddress, 5*24*60*60, null, null, additionalParam);
                }
            }
            currentQuotation.current = promise.then((swap) => {
                if(quoteUpdates.current!==updateNum) {
                    return;
                }
                setQuoteLoading(false);
                setQuote(swap);
            }).catch(e => {
                let doSetError = true;
                if(e.min!=null && e.max!=null) {
                    if(tokenCurrency===quoteCurrency) {
                        updateTokenConstraints(swapType, tokenCurrency, e);
                        doSetError = false;
                    }
                }
                if(quoteUpdates.current!==updateNum) {
                    return;
                }
                setQuoteLoading(false);
                if(doSetError) {
                    if(e.message==="Not enough liquidity") e = new Error("Not enough liquidity, please retry in 30mins-1hour");
                    setQuoteError(e);
                }
            });
        };

        currentQuotation.current.then(process, process);

    };

    useEffect(() => {

        console.log("useEffect(): getQuote");
        getQuote();

    }, [address, amount, inCurrency, outCurrency, exactIn, swapper]);

    return {
        inConstraints,
        outConstraints,
        quoteError,
        quoteAddressError,
        quoteAddressLoading,
        quoteLoading,
        quoteRef,
        quote,

        clearError: () => setQuoteError(null),
        setQuote,
        refreshQuote: () => getQuote()
    };
}

function useWalletBalance(swapper: Swapper<any, any, any, any>, locked: boolean, currency: CurrencySpec, quoteRef: MutableRefObject<ISwap>): {
    amount: BN,
    feeRate: number,
    totalFee?: number
} {
    const {bitcoinWallet} = useContext(BitcoinWalletContext);

    const [_maxSpendable, setMaxSpendable] = useState<{amount: BN, feeRate: number, totalFee?: number}>(null);
    let maxSpendable = _maxSpendable;
    if(currency.ticker==="BTC" && bitcoinWallet==null) maxSpendable = null;
    if(currency.ticker==="BTC-LN") maxSpendable = null;

    const balanceUpdates = useRef<number>(0);

    const lockedRef = useRef<boolean>();
    useEffect(() => {
        console.log("useEffect(): lockedRef");
        lockedRef.current = locked;
    }, [locked]);

    useEffect(() => {
        console.log("useEffect(): useWalletBalance");
        setMaxSpendable(null);

        balanceUpdates.current++;
        if(swapper==null) return;
        if(currency.ticker==="BTC-LN") {
            return;
        }
        const fetchAndSetMaxSpendable = () => {
            const updateNum = balanceUpdates.current;
            if(currency.ticker==="BTC") {
                if(bitcoinWallet!=null) bitcoinWallet.getSpendableBalance().then(resp => {
                    if(balanceUpdates.current!==updateNum) return;
                    setMaxSpendable({
                        amount: resp.balance,
                        feeRate: resp.feeRate,
                        totalFee: resp.totalFee
                    });
                });
                return;
            }
            swapper.swapContract.getBalance(currency.address, false).then(resp => {
                if(balanceUpdates.current!==updateNum) return;
                if(currency.minBalance!=null) {
                    resp = BN.max(resp.sub(currency.minBalance), new BN(0));
                }
                setMaxSpendable({
                    amount: resp,
                    feeRate: 0,
                    totalFee: null
                });
            });
        };

        fetchAndSetMaxSpendable();
        const interval = setInterval(() => {
            if(
                quoteRef.current==null ||
                (
                    isCreated(quoteRef.current) &&
                    quoteRef.current.getExpiry()<Date.now()
                )
            ) {
                balanceUpdates.current++;
                if(lockedRef.current) return;
                fetchAndSetMaxSpendable();
            }
        }, 2*60*1000);

        return () => {
            clearInterval(interval);
        }
    }, [currency, bitcoinWallet, swapper]);

    return maxSpendable;

}

export function Swap(props: {
    supportedCurrencies: CurrencySpec[]
}) {
    const {swapper} = useContext(SwapsContext);

    const navigate = useNavigate();
    const addressValidator = useCallback((val) => {
        if(val==="") return "Destination address/lightning invoice required";
        console.log("Is valid bitcoin address: ", val);
        if(swapper.isValidLNURL(val) || swapper.isValidBitcoinAddress(val) || swapper.isValidLightningInvoice(val)) return null;
        try {
            if(swapper.getLightningInvoiceValue(val)==null) {
                return "Lightning invoice needs to contain a payment amount!";
            }
        } catch (e) {}
        return "Invalid bitcoin address/lightning network invoice";
    }, [swapper]);

    const {bitcoinWallet} = useContext(BitcoinWalletContext);
    const {lnWallet} = useContext(WebLNContext);


    const [locked, setLocked] = useState<boolean>(false);
    const [inCurrency, setInCurrency] = useState<CurrencySpec>(btcCurrency);
    const [outCurrency, setOutCurrency] = useState<CurrencySpec>(smartChainTokenArray[0]);
    const [amount, setAmount] = useState<string>("");
    const [exactIn, setExactIn] = useState<boolean>(true);
    const [address, _setAddress] = useState<string>();
    const inAmountRef = useRef<ValidatedInputRef>();
    const outAmountRef = useRef<ValidatedInputRef>();
    const addressRef = useRef<ValidatedInputRef>();
    const setAddress = (val: string) => {
        _setAddress(val);
        if(swapper.isValidLNURL(val)) {
            setOutCurrency(bitcoinTokenArray[1]);
            return;
        }
        if(swapper.isValidBitcoinAddress(val)) {
            setOutCurrency(bitcoinTokenArray[0]);
            return;
        }
        if(swapper.isValidLightningInvoice(val)) {
            setOutCurrency(bitcoinTokenArray[1]);
            const outAmt = swapper.getLightningInvoiceValue(val);
            setAmount(toHumanReadableString(outAmt, btcCurrency));
            setExactIn(false);
            return;
        }
    };

    const kind: "frombtc" | "tobtc" = inCurrency.ticker==="BTC" || inCurrency.ticker==="BTC-LN" ? "frombtc" : "tobtc";
    const swapType: SwapType = inCurrency.ticker==="BTC" ? SwapType.FROM_BTC : inCurrency.ticker==="BTC-LN" ? SwapType.FROM_BTCLN : outCurrency.ticker==="BTC" ? SwapType.TO_BTC : SwapType.TO_BTCLN;
    let allowedSCTokens: CurrencySpec[] = props.supportedCurrencies;
    if(swapper!=null) {
        const supportedCurrencies = swapper.getSupportedTokens(swapType);
        allowedSCTokens = props.supportedCurrencies.filter(currency => supportedCurrencies.has(currency.address.toString()));
    }

    const {
        inConstraints,
        outConstraints,

        quoteError,
        quoteAddressError,
        quoteAddressLoading,
        quoteLoading,
        quoteRef,
        quote,

        clearError,
        setQuote,
        refreshQuote
    } = useQuote(swapper, address, amount, inCurrency, outCurrency, exactIn, locked, addressRef, inAmountRef, outAmountRef);

    //Load existing swap
    const {search} = useLocation();
    const params = new URLSearchParams(search);
    const propSwapId = params.get("swapId");
    useEffect(() => {
        if(swapper==null || propSwapId==null) return;
        if(quote!=null && quote.getPaymentHash().toString("hex")===propSwapId) return;
        console.log("useEffect(): load existing swap");
        swapper.getAllSwaps().then(res => {
            const foundSwap = res.find(e => e.getPaymentHash().toString("hex")===propSwapId);
            if(foundSwap!=null) {
                setLocked(true);
                setQuote(foundSwap);
                const inCurr = getCurrencySpec(foundSwap.getInToken());
                const outCurr = getCurrencySpec(foundSwap.getOutToken());
                setInCurrency(inCurr);
                setOutCurrency(outCurr);
                if(foundSwap instanceof IToBTCSwap) {
                    setAmount(toHumanReadableString(foundSwap.getOutAmount(), outCurr));
                    if(foundSwap instanceof ToBTCLNSwap) {
                        _setAddress(foundSwap.getLNURL() ?? foundSwap.getLightningInvoice());
                    } else if(foundSwap instanceof ToBTCSwap) {
                        _setAddress(foundSwap.getBitcoinAddress());
                    }
                    setExactIn(false);
                } else if(foundSwap instanceof IFromBTCSwap) {
                    setAmount(toHumanReadableString(foundSwap.getInAmount(), inCurr));
                    setExactIn(true);
                }
                setDoValidate(true);
            }
            // navigate("/");
        });
    }, [propSwapId, swapper]);

    const [doValidate, setDoValidate] = useState<boolean>();
    useEffect(() => {
        console.log("useEffect(): doValidate");
        if(!doValidate) return;
        outAmountRef.current.validate();
        inAmountRef.current.validate();
        setDoValidate(false);
    }, [doValidate]);

    const disabled = useMemo(() => {
        return address!=null && swapper.isValidLightningInvoice(address);
    }, [address]);
    const inputDisabled = disabled || (outCurrency.ticker==="BTC-LN" && lnWallet!=null);
    const outputDisabled = disabled && lnWallet==null;

    const maxSpendable = useWalletBalance(swapper, locked, inCurrency, quoteRef);

    useEffect(() => {
        console.log("useEffect(): BTC-LN out");
        if(outCurrency.ticker==="BTC-LN" && lnWallet!=null) {
            if(exactIn) {
                setExactIn(false);
                setAmount("");
            }
            setAddress("");
        }
    }, [outCurrency, lnWallet]);

    const priorMaxSpendable = useRef<any>();
    useEffect(() => {
        console.log("useEffect(): Max spendable");
        if(priorMaxSpendable.current==maxSpendable) return;
        priorMaxSpendable.current = maxSpendable;

        if(exactIn) {
            if(inAmountRef.current.validate() || amount==="") {
                if(quoteRef.current==null && !quoteLoading && !locked) refreshQuote();
            } else {
                if((quoteRef.current!=null || quoteLoading) && !locked) refreshQuote();
            }
        }
    }, [maxSpendable, locked, quoteLoading, exactIn]);

    useEffect(() => {
        console.log("useEffect(): BTC out");
        if(bitcoinWallet==null) return;
        if(outCurrency.ticker==="BTC") {
            _setAddress(bitcoinWallet.getReceiveAddress());
        }
    }, [bitcoinWallet, outCurrency]);

    const [qrScanning, setQrScanning] = useState<boolean>(false);

    const changeDirection = () => {
        if(locked) return;
        setQuote(null);
        setExactIn(!exactIn);
        setInCurrency(outCurrency);
        setOutCurrency(inCurrency);
        _setAddress("");
        setDoValidate(true);
    };

    const inputAmount: BN = exactIn ? fromHumanReadableString(amount, inCurrency) : quote!=null ? quote.getInAmount() : null;
    const outputAmount: BN = !exactIn ? fromHumanReadableString(amount, outCurrency) : quote!=null ? quote.getOutAmount() : null;

    const inputValue = usePricing(swapper, inputAmount==null ? null : inputAmount.toString(10), inCurrency);
    const outputValue = usePricing(swapper, outputAmount==null ? null : outputAmount.toString(10), outCurrency);

    return (
        <>
            <SwapTopbar selected={0} enabled={!locked}/>

            <QRScannerModal onScanned={(data: string) => {
                console.log("QR scanned: ", data);

                let resultText: string = data;
                let _amount: string = null;
                if(resultText.startsWith("lightning:")) {
                    resultText = resultText.substring(10);
                } else if(resultText.startsWith("bitcoin:")) {
                    resultText = resultText.substring(8);
                    if(resultText.includes("?")) {
                        const arr = resultText.split("?");
                        resultText = arr[0];
                        const params = arr[1].split("&");
                        for(let param of params) {
                            const arr2 = param.split("=");
                            const key = arr2[0];
                            const value = decodeURIComponent(arr2[1]);
                            if(key==="amount") {
                                _amount = value;
                            }
                        }
                    }
                }

                setAddress(resultText);
                if(_amount!=null) {
                    setAmount(_amount);
                    setExactIn(false);
                }

                setQrScanning(false);

            }} show={qrScanning} onHide={() => setQrScanning(false)}/>

            <div className="d-flex flex-column align-items-center text-white">
                <Card className="p-3 swap-panel tab-bg mx-3 mb-3 border-0">

                    <Alert className="text-center" show={quoteError!=null} variant="danger" onClose={() => clearError()}>
                        <div className="d-flex align-items-center justify-content-center">
                            <strong>Quoting error</strong>
                            <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip id="scan-qr-tooltip">Copy full error stack</Tooltip>}
                            >
                                <a href="#" className="d-inline-flex align-items-center justify-content-middle"
                                   onClick={(evnt) => {
                                       evnt.preventDefault();
                                       // @ts-ignore
                                       navigator.clipboard.writeText(JSON.stringify({
                                           error: quoteError.name,
                                           message: quoteError.message,
                                           stack: quoteError.stack
                                       }, null, 4));
                                   }}><Icon className="ms-1 mb-1" size={16} icon={ic_content_copy}/></a>
                            </OverlayTrigger>
                        </div>
                        <label>
                            {quoteError?.message || quoteError?.toString()}
                        </label>
                    </Alert>

                    <Card className="d-flex flex-column tab-accent-p3 pt-2">
                        <div className="d-flex flex-row">
                            <small className="text-light text-opacity-75 me-auto">You pay</small>

                            {inCurrency.ticker==="BTC" ? (
                                <small className="">
                                    <BitcoinWalletAnchor noText={true}/>
                                </small>
                            ) : ""}
                            {inCurrency.ticker==="BTC-LN" ? (
                                <small className="">
                                    <WebLNAnchor/>
                                </small>
                            ) : ""}
                            {maxSpendable!=null ? (
                                <>
                                    {inCurrency.ticker!=="BTC" ? (
                                        <Icon size={16} icon={ic_account_balance_wallet} style={{marginTop: "-0.3125rem"}} className=""/>
                                    ) : ""}
                                    <small className="me-2">
                                        {toHumanReadableString(maxSpendable.amount, inCurrency)} {inCurrency.ticker}
                                    </small>
                                    <Button variant="outline-light" style={{marginBottom: "2px"}} className="py-0 px-1" disabled={locked || inputDisabled} onClick={() => {
                                        setExactIn(true);
                                        setAmount(toHumanReadableString(maxSpendable.amount, inCurrency));
                                    }}><small className="font-smallest" style={{marginBottom: "-2px"}}>MAX</small></Button>
                                </>
                            ) : ""}
                        </div>
                        <ValidatedInput
                            disabled={locked || inputDisabled}
                            inputRef={inAmountRef}
                            className="flex-fill"
                            type="number"
                            value={!exactIn ? (quote==null ? "" : toHumanReadableString(quote.getInAmount(), inCurrency)) : amount }
                            size={"lg"}
                            textStart={!exactIn && quoteLoading ? (
                                <Spinner size="sm" className="text-white"/>
                            ) : null}
                            onChange={val => {
                                setAmount(val);
                                setExactIn(true);
                            }}
                            inputId="amount-input"
                            inputClassName="font-weight-500"
                            floatingLabel={inputValue==null ? null : FEConstants.USDollar.format(inputValue.toNumber())}
                            expectingFloatingLabel={true}
                            step={inCurrency==null ? new BigNumber("0.00000001") : new BigNumber(10).pow(new BigNumber(-inCurrency.decimals))}
                            min={inConstraints.min}
                            max={maxSpendable==null ? inConstraints.max : inConstraints.max==null ? toHumanReadable(maxSpendable.amount, inCurrency) : BigNumber.min(toHumanReadable(maxSpendable.amount, inCurrency), inConstraints.max)}
                            onValidate={(val: any) => {
                                // return exactIn && val==="" ? "Amount cannot be empty" : null;
                                return null;
                            }}
                            elementEnd={(
                                <CurrencyDropdown currencyList={kind==="frombtc" ? bitcoinTokenArray : allowedSCTokens} onSelect={val => {
                                    if(locked) return;
                                    setInCurrency(val);
                                }} value={inCurrency} className="round-right text-white bg-black bg-opacity-10"/>
                            )}
                        />
                    </Card>
                    <div className="d-flex justify-content-center swap-direction-wrapper">
                        <Button onClick={changeDirection} size="lg" className="px-0 swap-direction-btn">
                            <Icon size={22} icon={arrows_vertical} style={{marginTop: "-8px"}}/>
                        </Button>
                    </div>
                    <Card className="tab-accent-p3 pt-2">
                        <div className="d-flex flex-row">
                            <small className="text-light text-opacity-75 me-auto">You receive</small>

                            {outCurrency.ticker==="BTC" ? (
                                <small>
                                    <BitcoinWalletAnchor/>
                                </small>
                            ) : ""}
                            {outCurrency.ticker==="BTC-LN" ? (
                                <small>
                                    <WebLNAnchor/>
                                </small>
                            ) : ""}
                        </div>
                        <div className="d-flex flex-row">
                            <ValidatedInput
                                disabled={locked || outputDisabled}
                                inputRef={outAmountRef}
                                className="flex-fill strip-group-text"
                                type="number"
                                value={exactIn ? (quote==null ? "" : toHumanReadableString(quote.getOutAmount(), outCurrency)) : amount }
                                size={"lg"}
                                textStart={exactIn && quoteLoading ? (
                                    <Spinner size="sm" className="text-white"/>
                                ) : null}
                                onChange={val => {
                                    setAmount(val);
                                    if(outCurrency.ticker==="BTC-LN" && lnWallet!=null) setAddress("");
                                    setExactIn(false);
                                }}
                                inputId="amount-output"
                                inputClassName="font-weight-500"
                                floatingLabel={outputValue==null ? null : FEConstants.USDollar.format(outputValue.toNumber())}
                                expectingFloatingLabel={true}
                                step={outCurrency==null ? new BigNumber("0.00000001") : new BigNumber(10).pow(new BigNumber(-outCurrency.decimals))}
                                min={outConstraints.min}
                                max={outConstraints.max}
                                onValidate={(val: any) => {
                                    // return !exactIn && val==="" ? "Amount cannot be empty" : null;
                                    return null;
                                }}
                                elementEnd={(
                                    <CurrencyDropdown currencyList={kind==="tobtc" ? bitcoinTokenArray : allowedSCTokens} onSelect={(val) => {
                                        if(locked) return;
                                        setOutCurrency(val);
                                        if(kind==="tobtc" && val!==outCurrency) {
                                            _setAddress("");
                                        }
                                    }} value={outCurrency} className="round-right text-white bg-black bg-opacity-10"/>
                                )}
                            />
                        </div>
                        {kind==="tobtc" ? (
                            <>
                                <ValidatedInput
                                    type={"text"}
                                    className={"flex-fill mt-3 "+(lnWallet!=null && outCurrency===bitcoinTokenArray[1] && (address==null || address==="") ? "d-none" : "")}
                                    value={address}
                                    onChange={(val) => {
                                        setAddress(val);
                                    }}
                                    inputRef={addressRef}
                                    placeholder={"Paste Bitcoin/Lightning address"}
                                    onValidate={addressValidator}
                                    validated={quoteAddressError?.error}
                                    disabled={locked || (lnWallet!=null && outCurrency===bitcoinTokenArray[1])}
                                    textStart={quoteAddressLoading ? (
                                        <Spinner size="sm" className="text-white"/>
                                    ) : null}
                                    textEnd={lnWallet!=null && outCurrency===bitcoinTokenArray[1] ? null : (
                                        <OverlayTrigger
                                            placement="top"
                                            overlay={<Tooltip id="scan-qr-tooltip">Scan QR code</Tooltip>}
                                        >
                                            <a href="#" style={{
                                                marginTop: "-3px"
                                            }} onClick={(e) => {
                                                e.preventDefault();
                                                setQrScanning(true);
                                            }}><Icon size={24} icon={ic_qr_code_scanner}/></a>
                                        </OverlayTrigger>
                                    )}
                                    successFeedback={bitcoinWallet!=null && address===bitcoinWallet.getReceiveAddress() ? "Address fetched from your "+bitcoinWallet.getName()+" wallet!" : null}
                                />
                                {lnWallet!=null && outCurrency===bitcoinTokenArray[1] ? (
                                    <>
                                        {address==null || address==="" ? (
                                            <div className="mt-2">
                                                <a href="javascript:void(0);" onClick={() => {
                                                    if(!outAmountRef.current.validate() || amount==="") return;
                                                    lnWallet.makeInvoice(fromHumanReadableString(amount, outCurrency).toNumber()).then(res => {
                                                        setAddress(res.paymentRequest);
                                                    }).catch(e => console.error(e));
                                                }}>Fetch invoice from WebLN</a>
                                            </div>
                                        ) : ""}
                                    </>
                                ) : ""}
                                {lnWallet==null && outCurrency===bitcoinTokenArray[1] && !swapper.isValidLightningInvoice(address) && !swapper.isValidLNURL(address) ? (
                                    <Alert variant={"success"} className="mt-3 mb-0 text-center">
                                        <label>Only lightning invoices with pre-set amount are supported! Use lightning address/LNURL for variable amount.</label>
                                    </Alert>
                                ) : ""}
                            </>
                        ) : ""}
                    </Card>

                    {quoteError!=null ? (
                        <Button variant="light" className="mt-3" onClick={refreshQuote}>Retry</Button>
                    ) : ""}

                    {quote!=null ? (
                        <>
                            <div className="mt-3">
                                <SimpleFeeSummaryScreen swap={quote} btcFeeRate={inCurrency.ticker==="BTC" ? maxSpendable?.feeRate : null}/>
                            </div>
                            {!(quote instanceof ToBTCSwap) || quote.getBitcoinAddress()!==RANDOM_BTC_ADDRESS ? (
                                <div className="mt-3 d-flex flex-column text-white">
                                    <QuoteSummary type="swap" quote={quote} balance={maxSpendable?.amount} refreshQuote={refreshQuote} setAmountLock={(val) => {
                                        console.log("Set locked: ", val, propSwapId);
                                        setLocked(val);
                                        if(val && propSwapId==null && quote!=null) navigate("/?swapId="+quote.getPaymentHash().toString("hex"));
                                        if(!val) {
                                            // console.log("Navigate to /");
                                            navigate("/");
                                        }
                                    }} abortSwap={() => {
                                        setLocked(false);
                                        setQuote(null);
                                        navigate("/");
                                        setAmount("");
                                    }} feeRate={maxSpendable?.feeRate}/>
                                </div>
                            ) : ""}
                        </>
                    ) : ""}
                </Card>
            </div>

            <div className="text-light text-opacity-50 d-flex flex-row align-items-center justify-content-center mb-3">
                <div className="cursor-pointer d-flex align-items-center justify-content-center" onClick={() => navigate("/faq?tabOpen=6")}>
                    <Icon size={18} icon={lock} style={{marginTop: "-0.5rem"}}/>
                    <small>Audited by</small>
                    <img className="opacity-50 d-block ms-1" height={18} src="/ackee_blockchain.svg" style={{marginTop: "-0.125rem"}}/>
                </div>
            </div>
        </>
    )

}