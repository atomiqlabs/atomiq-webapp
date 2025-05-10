import {
    fromHumanReadableString,
    isBtcToken,
    isSCToken,
    SCToken,
    SpvFromBTCSwap,
    SwapType,
    toTokenAmount
} from "@atomiqlabs/sdk";
import * as React from "react";
import {useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {SwapsContext} from "../swaps/context/SwapsContext";
import {useAddressData} from "../swaps/hooks/useAddressData";
import ValidatedInput, {ValidatedInputRef} from "../components/ValidatedInput";
import {useAmountConstraints} from "../swaps/hooks/useAmountConstraints";
import {useWalletBalance} from "../wallets/hooks/useWalletBalance";
import {SwapTopbar} from "./SwapTopbar";
import {QRScannerModal} from "../qr/QRScannerModal";
import {Alert, Button, Card, OverlayTrigger, Spinner, Tooltip} from "react-bootstrap";
import {
    allTokens,
    fromTokenIdentifier, includesToken,
    smartChainTokenArray,
} from "../tokens/Tokens";
import {FEConstants, Tokens} from "../FEConstants";
import BigNumber from "bignumber.js";
import {CurrencyDropdown} from "../tokens/CurrencyDropdown";
import {SimpleFeeSummaryScreen} from "../fees/SimpleFeeScreen";
import {QuoteSummary} from "../swaps/QuoteSummary";
import {ErrorAlert} from "../components/ErrorAlert";
import {useQuote} from "../swaps/hooks/useQuote";
import {usePricing} from "../tokens/hooks/usePricing";
import {useLocation, useNavigate} from "react-router-dom";

import Icon from "react-icons-kit";
import {arrows_vertical} from 'react-icons-kit/ikons/arrows_vertical';
import {ic_qr_code_scanner} from 'react-icons-kit/md/ic_qr_code_scanner';
import {lock} from 'react-icons-kit/fa/lock';
import {ic_power_off_outline} from 'react-icons-kit/md/ic_power_off_outline';
import {useExistingSwap} from "../swaps/hooks/useExistingSwap";
import {ConnectedWalletAnchor} from "../wallets/ConnectedWalletAnchor";
import {useStateWithOverride} from "../utils/hooks/useStateWithOverride";
import {useChainForCurrency} from "../wallets/hooks/useChainForCurrency";
import {WebLNProvider} from "webln";
import {useBigNumberState} from "../utils/hooks/useBigNumberState";


export function SwapNew(props: {
    supportedCurrencies: SCToken[]
}) {
    const navigate = useNavigate();

    const {swapper} = useContext(SwapsContext);

    //Existing swap quote
    const {search} = useLocation();
    const params = new URLSearchParams(search);
    const propSwapId = params.get("swapId");
    const [existingSwap, existingSwapLoading] = useExistingSwap(propSwapId);

    const [isUnlocked, setUnlocked] = useState<boolean>(false);
    const locked = !isUnlocked && existingSwap!=null;

    //Tokens
    const [inputToken, setInputToken] = useStateWithOverride(Tokens.BITCOIN.BTC, existingSwap?.getInput().token);
    const [outputToken, setOutputToken] = useStateWithOverride(smartChainTokenArray[0], existingSwap?.getOutput().token);
    const swapType = useMemo(() => swapper?.getSwapType(inputToken, outputToken), [swapper, inputToken, outputToken]);
    const scCurrency = isSCToken(inputToken) ? inputToken : isSCToken(outputToken) ? outputToken : null;

    const inputChainData = useChainForCurrency(inputToken);
    const outputChainData = useChainForCurrency(outputToken);

    //Address
    const addressRef = useRef<ValidatedInputRef>();
    const addressValidator = useCallback((val: string) => {
        try {
            const addressParseResult = swapper.Utils.parseAddressSync(val);
            console.log("Address parsing result: ", addressParseResult);
            if(addressParseResult==null) return "Invalid address";
        } catch (e) {
            console.log("Address parsing error: ", e);
            return e.message;
        }
        return null;
    }, [swapper]);
    const [address, setAddress] = useStateWithOverride<string>(null, outputChainData?.wallet?.address);
    const [addressData, addressLoading, addressError] = useAddressData(address);
    const isValidAddress = addressData!=null;
    const isFixedAmount = addressData?.amount!=null;

    useEffect(() => {
        if(addressData?.swapType!=null) {
            //TODO: Automatically change to the swap type as decoded from the address type
        }
    }, [addressData?.swapType]);
    useEffect(() => {
        if(addressData?.lnurl?.type==="withdraw") navigate("/scan/2?address="+encodeURIComponent(address));
    }, [address, addressData?.lnurl]);

    //Amounts
    const inputRef = useRef<ValidatedInputRef>();
    const outputRef = useRef<ValidatedInputRef>();
    const [amount, setAmount] = useState<string>();
    const [validatedAmount, setValidatedAmount] = useBigNumberState(null);
    const [exactIn, setExactIn] = useStateWithOverride(true, isFixedAmount ? isFixedAmount : null);
    const {
        input: swapInputLimits,
        output: swapOutputLimits
    } = useAmountConstraints(inputToken, outputToken);

    //Url defined amount & swap type
    useEffect(() => {
        const tokenIn = fromTokenIdentifier(params.get("tokenIn"));
        const tokenOut = fromTokenIdentifier(params.get("tokenOut"));
        if(tokenIn!=null) setInputToken(tokenIn);
        if(tokenOut!=null) setOutputToken(tokenOut);
        const exactIn = params.get("exactIn");
        const amount = params.get("amount");
        if(exactIn!=null && amount!=null) {
            setExactIn(exactIn==="true");
            if(exactIn==="true") {
                inputRef.current.setValue(amount);
            } else {
                outputRef.current.setValue(amount);
            }
        }
    }, [search]);

    //Gas drop
    const [gasDropChecked, setGasDropChecked] = useStateWithOverride<boolean>(false, (existingSwap as SpvFromBTCSwap<any>)?.getGasDropOutput?.()?.rawAmount>0);
    const gasDropTokenAmount = useMemo(() => {
        if(existingSwap!=null && existingSwap.getType()===SwapType.SPV_VAULT_FROM_BTC && (existingSwap as SpvFromBTCSwap<any>).getGasDropOutput().rawAmount>0)
            return (existingSwap as SpvFromBTCSwap<any>).getGasDropOutput?.();
        if(swapper!=null && isSCToken(outputToken) && swapType===SwapType.SPV_VAULT_FROM_BTC) {
            const nativeToken = swapper.Utils.getNativeToken(outputToken.chainId);
            return toTokenAmount(FEConstants.scBalances[nativeToken?.chainId]?.optimal[nativeToken?.address], nativeToken, swapper.prices);
        }
    }, [swapper, existingSwap, swapType, outputToken]);

    //Check native currency balance for gas drop
    useEffect(() => {
        if(addressData?.address==null || swapper==null || gasDropTokenAmount==null) return;
        let cancelled = false;

        swapper.Utils.getSpendableBalance(addressData?.address, gasDropTokenAmount.token).then(value => {
            if(cancelled) return;
            const requiredBalance = FEConstants.scBalances[gasDropTokenAmount.token.chainId].minimum[gasDropTokenAmount.token.address];
            if(value < requiredBalance) {
                setGasDropChecked(true);
            }
        });
        return () => {cancelled = true};
    }, [gasDropTokenAmount, addressData?.address, swapper]);

    //Max spendable
    const [minBtcTxFee, setMinBtcTxFee] = useState<number>(null);
    const maxSpendable = useWalletBalance(inputToken, swapType, scCurrency.chainId, gasDropChecked, locked, minBtcTxFee);

    const inputLimits = useMemo(() => {
        if(maxSpendable?.balance==null) return swapInputLimits;
        return {
            min: swapInputLimits.min,
            max: BigNumber.min(swapInputLimits.max, new BigNumber(maxSpendable.balance.amount))
        };
    }, [swapInputLimits, maxSpendable?.balance?.rawAmount]);
    const outputLimits = useMemo(() => {
        if(addressData?.min==null && addressData?.max==null) return swapOutputLimits;
        return {
            min: addressData?.min?.amount==null ? swapOutputLimits.min : BigNumber.max(new BigNumber(addressData?.min?.amount), swapOutputLimits.min),
            max: addressData?.max?.amount==null ? swapOutputLimits.max : BigNumber.min(new BigNumber(addressData?.max?.amount), swapOutputLimits.max),
        };
    }, [swapOutputLimits, addressData?.min?.amount, addressData?.max?.amount]);

    //Quote
    const [refreshQuote, quote, quoteLoading, quoteError] = useQuote(
        validatedAmount, exactIn, inputToken, outputToken, addressData?.lnurl ?? addressData?.address, gasDropTokenAmount?.rawAmount, maxSpendable?.feeRate
    );
    useEffect(() => {
        if(quote==null || maxSpendable?.feeRate==null || swapType!==SwapType.SPV_VAULT_FROM_BTC || quote?.getType()!==SwapType.SPV_VAULT_FROM_BTC) return;
        const quoteMinFee = (quote as SpvFromBTCSwap<any>).minimumBtcFeeRate;
        setMinBtcTxFee(quoteMinFee >= maxSpendable.feeRate ? quoteMinFee : null);
    }, [quote, swapType, maxSpendable?.feeRate]);

    //Final output/input amounts, value and output address
    const [outputAddress, inputAmount, outputAmount, isOutputWalletAddress] = useMemo(() => {
        let swap = existingSwap ?? quote;
        console.log("existing swap: ", swap);
        if(swap!=null) return [swap.getOutputAddress(), swap.getInput().amount, swap.getOutput().amount, outputChainData?.wallet?.address===swap.getOutputAddress()];
        let _address = outputChainData?.wallet?.address ?? address;
        if(isFixedAmount) return [_address, "", addressData.amount.amount, outputChainData?.wallet?.address!=null];
        return [_address, exactIn ? amount : "", !exactIn ? amount : "", outputChainData?.wallet?.address!=null];
    }, [exactIn, amount, existingSwap, quote, address, isFixedAmount, outputChainData?.wallet?.address]);
    const inputValue = usePricing(inputAmount, inputToken);
    const outputValue = usePricing(outputAmount, outputToken);

    //QR scanner
    const [qrScanning, setQrScanning] = useState<boolean>(false);

    //Leaves existing swap
    const leaveExistingSwap = useCallback((noSetAddress?: boolean, noSetAmounts?: boolean) => {
        if(existingSwap==null) return;
        setInputToken(existingSwap.getInput().token);
        setOutputToken(existingSwap.getOutput().token);
        if(!noSetAddress) addressRef.current.setValue(existingSwap.getOutputAddress());
        if(!noSetAmounts) if(existingSwap.exactIn) {
            inputRef.current.setValue(existingSwap.getInput().amount);
        } else {
            outputRef.current.setValue(existingSwap.getOutput().amount);
        }
        navigate("/");
    }, [existingSwap]);

    //Changes the direction of the swap, reverses input and output tokens
    const changeDirection = useCallback(() => {
        if(locked || swapper==null) return;
        leaveExistingSwap(true);
        const allowedCounterTokens = swapper.getSwapCounterTokens(inputToken, false);
        if(allowedCounterTokens.length===0) {
            setInputToken(outputToken);
            const allowedCounterTokens = swapper.getSwapCounterTokens(outputToken, true);
            if(allowedCounterTokens.length===0) return;
            setOutputToken(allowedCounterTokens[0]);
        } else {
            setOutputToken(inputToken);
            if(includesToken(allowedCounterTokens, outputToken)) {
                setInputToken(outputToken);
            } else {
                setInputToken(allowedCounterTokens[0]);
            }
        }
        addressRef.current.setValue("");
    }, [inputToken, outputToken, leaveExistingSwap, swapper]);

    const webLnForOutput = existingSwap==null && outputChainData?.chain?.name==="Lightning" && outputChainData?.wallet!=null;
    useEffect(() => {
        if(!webLnForOutput) return;
        if(exactIn) {
            inputRef.current.setValue("");
            setExactIn(false);
        }
        addressRef.current.setValue("");
    }, [webLnForOutput]);

    //Don't lock output amounts when WebLN wallet is connected
    const amountsLocked = webLnForOutput ? false : isFixedAmount;

    const setAmountLock = useCallback((val: boolean) => {
        if (existingSwap==null) {
            if(val) {
                console.log("SwapNew: setAmountLock, locking swap and redirecting to swap: "+quote.getId())
                setUnlocked(false);
                navigate("/?swapId=" + quote.getId());
            } else {
                navigate("/");
            }
        } else {
            setUnlocked(!val);
        }
    }, [quote, existingSwap]);

    //Show "Use external wallet" when amount is too high
    const showUseExternalWallet = useMemo(() => {
        if(maxSpendable?.balance==null || swapper==null) return false;
        if(swapper.SwapTypeInfo[swapType].requiresInputWallet) return false;
        const parsedAmount = new BigNumber(inputAmount);
        const balance = new BigNumber(maxSpendable.balance.amount);
        return parsedAmount.gt(balance) && (swapInputLimits?.max==null || parsedAmount.lte(swapInputLimits.max));
    }, [swapper, maxSpendable?.balance, inputAmount, swapInputLimits?.max, swapType]);

    return (
        <>
            <SwapTopbar selected={0} enabled={!locked}/>

            <QRScannerModal onScanned={(data: string) => {
                console.log("QR scanned: ", data);
                addressRef.current.setValue(data);
                setQrScanning(false);
            }} show={qrScanning} onHide={() => setQrScanning(false)}/>

            <div className="d-flex flex-column align-items-center text-white">
                <Card className="p-3 swap-panel tab-bg mx-3 mb-3 border-0">

                    <ErrorAlert title="Quote error" error={quoteError}/>

                    <Card className="d-flex flex-column tab-accent-p3 pt-2">
                        <div className="d-flex flex-row">
                            <small className="text-light text-opacity-75 me-auto">You pay</small>

                            {maxSpendable != null ? (
                                <>
                                    <div className="d-flex align-items-center">
                                        <ConnectedWalletAnchor noText={true} currency={inputToken}/>
                                        <small className="me-2">
                                            {maxSpendable?.balance?.amount} {inputToken.ticker}
                                        </small>
                                    </div>
                                    <Button
                                        variant="outline-light"
                                        style={{marginBottom: "2px"}}
                                        className="py-0 px-1"
                                        disabled={locked || amountsLocked}
                                        onClick={() => {
                                            setExactIn(true);
                                            inputRef.current.setValue(maxSpendable?.balance?.amount);
                                        }}
                                    >
                                        <small className="font-smallest" style={{marginBottom: "-2px"}}>MAX</small>
                                    </Button>
                                </>
                            ) : (
                                <small>
                                    <ConnectedWalletAnchor noText={false} currency={inputToken}/>
                                </small>
                            )}
                        </div>

                        <ValidatedInput
                            disabled={locked || amountsLocked || webLnForOutput}
                            inputRef={inputRef}
                            className="flex-fill"
                            type="number"
                            value={inputAmount}
                            size={"lg"}
                            textStart={!exactIn && quoteLoading ? (<Spinner size="sm" className="text-white"/>) : null}
                            onChange={(value, forcedChange) => {
                                console.log("SwapNew: ValidatedInput(inputAmount): onChange: ", value);
                                setAmount(value);
                                setExactIn(true);
                                if(!forcedChange) leaveExistingSwap(false, true);
                            }}
                            onValidatedInput={val => {
                                if (exactIn) setValidatedAmount(val);
                            }}
                            inputId="amount-input"
                            inputClassName="font-weight-500"
                            floatingLabel={inputValue == null ? null : FEConstants.USDollar.format(inputValue)}
                            expectingFloatingLabel={true}
                            step={inputToken == null ? new BigNumber("0.00000001") : new BigNumber(10).pow(new BigNumber(-(inputToken.displayDecimals ?? inputToken.decimals)))}
                            min={inputLimits?.min}
                            max={inputLimits?.max}
                            feedbackEndElement={showUseExternalWallet ? (
                                <a className="ms-auto" href="#" onClick={(event) => {
                                    event.preventDefault();
                                    inputChainData?.disconnect?.();
                                }}>Use external wallet</a>
                            ) : null}
                            validated={(!exactIn && quote!=null) || existingSwap!=null ? null : undefined}
                            elementEnd={(
                                <CurrencyDropdown
                                    currencyList={allTokens}
                                    onSelect={val => {
                                        if (locked) return;
                                        leaveExistingSwap();
                                        const supportedCounterTokens = swapper.getSwapCounterTokens(val, true);
                                        setInputToken(val);
                                        if(includesToken(supportedCounterTokens, outputToken)) return;
                                        if(includesToken(supportedCounterTokens, inputToken)) {
                                            setOutputToken(inputToken);
                                            setExactIn(!exactIn);
                                        } else {
                                            setOutputToken(supportedCounterTokens[0]);
                                        }
                                    }}
                                    value={inputToken}
                                    className="round-right text-white bg-black bg-opacity-10"
                                />
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

                            <small>
                                <ConnectedWalletAnchor noText={false} currency={outputToken}/>
                            </small>
                        </div>
                        <div className="d-flex flex-row">
                            <ValidatedInput
                                disabled={locked || amountsLocked}
                                inputRef={outputRef}
                                className="flex-fill strip-group-text"
                                type="number"
                                value={outputAmount}
                                size={"lg"}
                                textStart={exactIn && quoteLoading ? (
                                    <Spinner size="sm" className="text-white"/>
                                ) : null}
                                onChange={(val, forcedChange) => {
                                    console.log("SwapNew: ValidatedInput(outputAmount): onChange: ", val);
                                    setAmount(val);
                                    setExactIn(false);
                                    if (webLnForOutput) addressRef.current.setValue("");
                                    if(!forcedChange) leaveExistingSwap(webLnForOutput, true);
                                }}
                                onValidatedInput={val => {
                                    console.log("SwapNew: ValidatedInput(outputAmount): onValidatedInput: ", val);
                                    if (!exactIn) setValidatedAmount(val);
                                }}
                                inputId="amount-output"
                                inputClassName="font-weight-500"
                                floatingLabel={outputValue == null ? null : FEConstants.USDollar.format(outputValue)}
                                expectingFloatingLabel={true}
                                step={outputToken == null ? new BigNumber("0.00000001") : new BigNumber(10).pow(new BigNumber(-(outputToken.displayDecimals ?? outputToken.decimals)))}
                                min={outputLimits?.min}
                                max={outputLimits?.max}
                                validated={(exactIn && quote != null) || existingSwap != null ? null : undefined}
                                elementEnd={(
                                    <CurrencyDropdown
                                        currencyList={allTokens}
                                        onSelect={(val) => {
                                            if (locked) return;
                                            leaveExistingSwap();
                                            const supportedCounterTokens = swapper.getSwapCounterTokens(val, true);
                                            setOutputToken(val);
                                            if(includesToken(supportedCounterTokens, inputToken)) return;
                                            if(includesToken(supportedCounterTokens, outputToken)) {
                                                setInputToken(inputToken);
                                                setExactIn(!exactIn);
                                            } else {
                                                setInputToken(supportedCounterTokens[0]);
                                            }
                                        }}
                                        value={outputToken}
                                        className="round-right text-white bg-black bg-opacity-10"
                                    />
                                )}
                            />
                        </div>
                        <div className={gasDropTokenAmount!=null ? "d-flex" : "d-none"}>
                            <ValidatedInput
                                type={"checkbox"}
                                className={"flex-fill mt-1"}
                                onChange={(val: boolean) => {
                                    setGasDropChecked(val);
                                    leaveExistingSwap();
                                }}
                                placeholder={(
                                    <span>
                                        <OverlayTrigger overlay={<Tooltip id={"fee-tooltip-gas-drop"}>
                                            <span>Swap some amount of BTC to {gasDropTokenAmount?.token.ticker} (gas token on the destination chain), so that you can transact on {gasDropTokenAmount?.token.chainId}</span>
                                        </Tooltip>}>
                                            <span className="dottedUnderline">Request gas drop of {gasDropTokenAmount?._amount.toString(10)} {gasDropTokenAmount?.token.ticker}</span>
                                        </OverlayTrigger>
                                    </span>
                                )}
                                value={gasDropChecked}
                                onValidate={() => null}
                                disabled={locked}
                            />
                        </div>
                        <div className={"flex-column " + (swapper?.SwapTypeInfo[swapType].requiresOutputWallet ? "d-none" : "d-flex")}>
                            <ValidatedInput
                                type={"text"}
                                className={"flex-fill mt-3 " + (webLnForOutput && (addressData?.address == null) ? "d-none" : "")}
                                onChange={(val, forcedChange) => {
                                    console.log("Address: ", val);
                                    setAddress(val);
                                    if(!forcedChange) leaveExistingSwap(true)
                                }}
                                value={outputAddress}
                                inputRef={addressRef}
                                placeholder={"Destination wallet address"}
                                onValidate={addressValidator}
                                validated={isOutputWalletAddress ? null : addressError?.message}
                                disabled={locked || outputChainData?.wallet!=null}
                                feedbackEndElement={outputChainData?.wallet==null ? (
                                    <a className="ms-auto" href="#" onClick={(event) => {
                                        event.preventDefault();
                                        outputChainData.connect();
                                    }}>Connect wallet</a>
                                ) : null}
                                textStart={addressLoading ? (
                                    <Spinner size="sm" className="text-white"/>
                                ) : null}
                                textEnd={locked ? null : (outputChainData?.wallet!=null ? (
                                    <OverlayTrigger
                                        placement="top"
                                        overlay={<Tooltip id="scan-qr-tooltip">Disconnect wallet & use external wallet</Tooltip>}
                                    >
                                        <a href="#" style={{
                                            marginTop: "-3px"
                                        }} onClick={(e) => {
                                            e.preventDefault();
                                            outputChainData.disconnect();
                                        }}><Icon size={24} icon={ic_power_off_outline}/></a>
                                    </OverlayTrigger>
                                ) : (
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
                                ))}
                                successFeedback={
                                    isOutputWalletAddress ? "Address fetched from your "+outputChainData?.wallet.name+" wallet!" : null
                                }
                            />
                            {webLnForOutput ? (
                                <>
                                    {addressData?.address == null ? (
                                        <div className="mt-2">
                                            <a href="#" onClick={async (e) => {
                                                e.preventDefault();
                                                if (amount == null) return;
                                                const webln: WebLNProvider = outputChainData.wallet.instance;
                                                try {
                                                    const res = await webln.makeInvoice(Number(fromHumanReadableString(inputAmount, Tokens.BITCOIN.BTCLN)));
                                                    addressRef.current.setValue(res.paymentRequest);
                                                } catch(e) {
                                                    console.error(e);
                                                }
                                            }}>Fetch invoice from WebLN</a>
                                        </div>
                                    ) : ""}
                                </>
                            ) : ""}

                            <Alert
                                variant={"success"}
                                className="mt-3 mb-0 text-center"
                                show={!locked && outputChainData?.wallet == null && isBtcToken(outputToken) && outputToken.lightning && addressData == null}
                            >
                                <label>Only lightning invoices with pre-set amount are supported! Use lightning
                                    address/LNURL for variable amount.</label>
                            </Alert>
                        </div>
                    </Card>

                    {quoteError != null ? (
                        <Button variant="light" className="mt-3" onClick={refreshQuote}>Retry</Button>
                    ) : ""}

                    {quote != null || existingSwap != null ? (
                        <>
                            <div className="mt-3">
                                <SimpleFeeSummaryScreen
                                    swap={existingSwap ?? quote}
                                    btcFeeRate={inputToken.chain === "BTC" ? maxSpendable?.feeRate : null}
                                />
                            </div>
                            {addressData!=null || outputChainData?.wallet!=null ? (
                                <div className="mt-3 d-flex flex-column text-white">
                                    <QuoteSummary
                                        type="swap"
                                        quote={existingSwap ?? quote}
                                        balance={maxSpendable?.balance.rawAmount ?? null}
                                        refreshQuote={() => {
                                            if (existingSwap != null) {
                                                leaveExistingSwap(false, true);
                                                setExactIn(existingSwap.exactIn);
                                                if (existingSwap.exactIn) {
                                                    setAmount(existingSwap.getInput().amount);
                                                } else {
                                                    setAmount(existingSwap.getOutput().amount);
                                                }
                                            }
                                            refreshQuote();
                                        }}
                                        setAmountLock={setAmountLock}
                                        abortSwap={() => {
                                            inputRef.current.setValue("");
                                            outputRef.current.setValue("");
                                            navigate("/");
                                        }}
                                        feeRate={maxSpendable?.feeRate}
                                    />
                                </div>
                            ) : ""}
                        </>
                    ) : ""}
                </Card>
            </div>

            <div className="text-light text-opacity-50 d-flex flex-row align-items-center justify-content-center mb-3">
                <div
                    className="cursor-pointer d-flex align-items-center justify-content-center"
                    onClick={() => navigate("/faq?tabOpen=6")}
                >
                    <Icon size={18} icon={lock} style={{marginTop: "-0.5rem"}}/>
                    <small>Audited by</small>
                    {scCurrency?.chainId==="STARKNET" ? (
                        <img
                            className="d-block ms-1" height={18}
                            src="/csc-white-logo.png" style={{marginTop: "-0.075rem", opacity: 0.6}}
                        />
                    ) : (
                        <img
                            className="opacity-50 d-block ms-1" height={18}
                            src="/ackee_blockchain.svg" style={{marginTop: "-0.125rem"}}
                        />
                    )}
                </div>
            </div>
        </>
    )

}