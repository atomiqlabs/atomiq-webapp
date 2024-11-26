import {isBtcToken, isSCToken, SCToken, SwapType, ToBTCLNSwap, ToBTCSwap, Token, Tokens} from "@atomiqlabs/sdk";
import * as React from "react";
import {useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {SwapsContext} from "../context/SwapsContext";
import {useAddressData} from "../utils/useAddressData";
import ValidatedInput, {ValidatedInputRef} from "../components/ValidatedInput";
import {useAmountConstraints} from "../utils/useAmountConstraints";
import {useWalletBalance} from "../utils/useWalletBalance";
import {useBigNumberState} from "../utils/useBigNumberState";
import {SwapTopbar} from "../components/SwapTopbar";
import {QRScannerModal} from "../components/qr/QRScannerModal";
import {Alert, Button, Card, OverlayTrigger, Spinner, Tooltip} from "react-bootstrap";
import {BitcoinWalletAnchor} from "../components/wallet/BitcoinWalletButton";
import {WebLNAnchor} from "../components/wallet/WebLNButton";
import {bitcoinTokenArray, fromHumanReadable, smartChainTokenArray} from "../utils/Currencies";
import {FEConstants} from "../FEConstants";
import BigNumber from "bignumber.js";
import {CurrencyDropdown} from "../components/CurrencyDropdown";
import {SimpleFeeSummaryScreen} from "../components/fees/SimpleFeeScreen";
import {QuoteSummary} from "../components/quotes/QuoteSummary";
import {ErrorAlert} from "../components/ErrorAlert";
import {useQuote} from "../utils/useQuote";
import {usePricing} from "../utils/usePricing";
import {BitcoinWalletContext} from "../context/BitcoinWalletContext";
import {WebLNContext} from "../context/WebLNContext";
import * as bitcoin from "bitcoinjs-lib";
import * as randomBytes from "randombytes";
import {useLocation, useNavigate} from "react-router-dom";

import Icon from "react-icons-kit";
import {arrows_vertical} from 'react-icons-kit/ikons/arrows_vertical';
import {ic_qr_code_scanner} from 'react-icons-kit/md/ic_qr_code_scanner';
import {lock} from 'react-icons-kit/fa/lock';
import {ic_account_balance_wallet} from 'react-icons-kit/md/ic_account_balance_wallet';
import {useExistingSwap} from "../utils/useExistingSwap";

const RANDOM_BTC_ADDRESS = bitcoin.payments.p2wsh({
    hash: randomBytes(32),
    network: FEConstants.chain === "DEVNET" ? bitcoin.networks.testnet : bitcoin.networks.bitcoin
}).address;

export function SwapNew(props: {
    supportedCurrencies: SCToken[]
}) {
    const navigate = useNavigate();

    const {swapper, chains} = useContext(SwapsContext);
    const {bitcoinWallet} = useContext(BitcoinWalletContext);
    const {lnWallet} = useContext(WebLNContext);

    //Existing swap quote
    const {search} = useLocation();
    const params = new URLSearchParams(search);
    const propSwapId = params.get("swapId");
    const [existingSwap, existingSwapLoading] = useExistingSwap(propSwapId);
    const [isUnlocked,setUnlocked] = useState<boolean>(false);
    const locked = !isUnlocked && existingSwap!=null;

    //Tokens
    const [_swapType, setSwapType] = useState<SwapType>(SwapType.FROM_BTC);
    const [_scCurrency, setScCurrency] = useState<SCToken>(smartChainTokenArray[0]);
    const swapType = existingSwap!=null ? existingSwap.getType() : _swapType;
    const isSend: boolean = swapType===SwapType.TO_BTCLN || swapType===SwapType.TO_BTC;
    const scCurrency: SCToken = existingSwap!=null ? (isSend ? existingSwap.getInput() : existingSwap.getOutput()).token as SCToken : _scCurrency;
    const inputToken: Token | null = useMemo(
        () => swapType===SwapType.FROM_BTCLN ? Tokens.BITCOIN.BTCLN : swapType===SwapType.FROM_BTC ? Tokens.BITCOIN.BTC : scCurrency,
        [swapType, scCurrency]
    );
    const outputToken: Token | null = useMemo(
        () => swapType===SwapType.TO_BTCLN ? Tokens.BITCOIN.BTCLN : swapType===SwapType.TO_BTC ? Tokens.BITCOIN.BTC : scCurrency,
        [swapType, scCurrency]
    );
    const signerData = scCurrency==null ? null : chains[scCurrency.chainId];

    //Address
    const addressRef = useRef<ValidatedInputRef>();
    const addressValidator = useCallback((val) => {
        if(val==="") return "Destination address/lightning invoice required";
        if(val.startsWith("lightning:")) {
            val = val.substring(10);
        }
        if(val.startsWith("bitcoin:")) {
            val = val.substring(8);
            if (val.includes("?")) {
                val = val.split("?")[0];
            }
        }
        if(swapper.isValidLNURL(val) || swapper.isValidBitcoinAddress(val) || swapper.isValidLightningInvoice(val)) return null;
        try {
            if(swapper.getLightningInvoiceValue(val)==null) return "Lightning invoice needs to contain a payment amount!";
        } catch (e) {}
        return "Invalid bitcoin address/lightning network invoice";
    }, [swapper]);
    const [_validatedAddress, setValidatedAddress] = useState<string>(null);
    const validatedAddress = existingSwap!=null ? null : (swapType===SwapType.TO_BTC && bitcoinWallet!=null) ? bitcoinWallet.getReceiveAddress() : _validatedAddress;
    const [addressLoading, addressData] = useAddressData(validatedAddress);
    useEffect(() => {
        if(addressData?.swapType!=null) {
            console.log("SwapNew: useEffect(addressData.swapType): Setting swap type: "+SwapType[addressData.swapType]);
            setSwapType(addressData.swapType);
        }
    }, [addressData?.swapType]);
    useEffect(() => {
        if(addressData?.lnurlResult==null) return;
        if(addressData.lnurlResult.type==="withdraw") {
            navigate("/scan/2?address="+encodeURIComponent(addressData.address)+(
                scCurrency==null ? "" : "&token="+encodeURIComponent(scCurrency.ticker)
                    +"&chainId="+encodeURIComponent(scCurrency.chainId)
            ), {
                state: {
                    ...addressData.lnurlResult,
                    min: addressData.lnurlResult.min.toString(10),
                    max: addressData.lnurlResult.max.toString(10),
                }
            });
            navigate("");
        }
    }, [addressData?.lnurlResult]);

    //Amounts
    const inputRef = useRef<ValidatedInputRef>();
    const outputRef = useRef<ValidatedInputRef>();
    const [validatedAmount, setValidatedAmount] = useBigNumberState(null);
    const [_exactIn, setExactIn] = useState(true);
    const exactIn = addressData?.swapType===SwapType.TO_BTCLN && !addressData?.isLnurl ? false : _exactIn;
    const {
        inConstraints,
        outConstraints,
        supportedTokensSet,
        handleQuoteError
    } = useAmountConstraints(exactIn, inputToken, outputToken);

    //Allowed tokens
    const allowedScTokens = useMemo(() => {
        if(supportedTokensSet==null) return props.supportedCurrencies;
        return props.supportedCurrencies
            .filter(currency => supportedTokensSet.has(currency.chainId+":"+currency.address));
    }, [props.supportedCurrencies, supportedTokensSet]);

    //Quote
    const [refreshQuote, quote, quoteLoading, quoteError] = useQuote(
        existingSwap!=null ? null : signerData?.signer, validatedAmount, exactIn, inputToken, outputToken,
        !isSend ? null : (validatedAddress==null || validatedAddress==="") && swapType===SwapType.TO_BTC ? RANDOM_BTC_ADDRESS :
            addressData?.error ? null :
            addressData?.isLnurl ? addressData.lnurlResult :
            addressData?.address,
        handleQuoteError
    );

    const outputAddress = existingSwap?.getType()===SwapType.TO_BTCLN ? ((existingSwap as ToBTCLNSwap).getLNURL() ?? (existingSwap as ToBTCLNSwap).getLightningInvoice()) :
        existingSwap?.getType()===SwapType.TO_BTC ? (existingSwap as ToBTCSwap).getBitcoinAddress() :
        (swapType===SwapType.TO_BTC && bitcoinWallet!=null) ? bitcoinWallet.getReceiveAddress() : null;
    const inputAmount = existingSwap!=null ? existingSwap.getInput().amount :
        !exactIn ? (quote == null ? "" : quote.getInput().amount) :
        null;
    const outputAmount = existingSwap!=null ? existingSwap.getOutput().amount :
        exactIn ? (quote == null ? "" : quote.getOutput().amount) :
        isSend ? addressData?.amount?.toString() : null;

    const inputValue = usePricing(
        existingSwap!=null ? new BigNumber(existingSwap.getInput().amount) :
        exactIn ? validatedAmount :
        quote!=null ? new BigNumber(quote.getInput().amount) : null,
        inputToken
    );
    const outputValue = usePricing(
        existingSwap!=null ? new BigNumber(existingSwap.getOutput().amount) :
        !exactIn ? validatedAmount :
        quote!=null ? new BigNumber(quote.getOutput().amount) : null,
        outputToken
    );

    //Max spendable
    const maxSpendable = useWalletBalance(signerData?.random ? null : signerData?.signer, inputToken, locked);
    let inputMax = BigNumber.min(maxSpendable?.amount ?? new BigNumber(Infinity), inConstraints?.max ?? new BigNumber(Infinity));
    if(!inputMax.isFinite()) inputMax = null;

    //QR scanner
    const [qrScanning, setQrScanning] = useState<boolean>(false);

    const leaveExistingSwap = (noChangeSwapType?: boolean, noSetAddress?: boolean) => {
        if (existingSwap!=null) {
            const scCurrency = existingSwap.getType()===SwapType.TO_BTC || existingSwap.getType()===SwapType.TO_BTCLN ? existingSwap.getInput().token : existingSwap.getOutput().token;
            const swapAddress = existingSwap.getType()===SwapType.TO_BTC ? (existingSwap as ToBTCSwap).getBitcoinAddress() :
                existingSwap.getType()===SwapType.TO_BTCLN ? (existingSwap as ToBTCLNSwap).getLNURL() : null;
            if(!noChangeSwapType) {
                console.trace("SwapNew: leaveExistingSwap(): Setting swap type: "+SwapType[existingSwap.getType()]);
                setSwapType(existingSwap.getType());
            }
            setScCurrency(scCurrency as SCToken);
            if(!noSetAddress && swapAddress!=null) addressRef.current.setValue(swapAddress, false);
            navigate("/");
        }
    };

    const changeDirection = () => {
        leaveExistingSwap(true, true);
        setExactIn(!exactIn);
        console.log("SwapNew: changeDirection(): Current swap type: "+SwapType[swapType]);
        if(swapType===SwapType.TO_BTCLN) setSwapType(SwapType.FROM_BTCLN);
        if(swapType===SwapType.TO_BTC) setSwapType(SwapType.FROM_BTC);
        if(swapType===SwapType.FROM_BTCLN) setSwapType(SwapType.TO_BTCLN);
        if(swapType===SwapType.FROM_BTC) setSwapType(SwapType.TO_BTC);
        addressRef.current.setValue("", false);
        if(existingSwap!=null) return;
        if(exactIn) {
            outputRef.current.setValue(inputRef.current.getValue(), false);
        } else {
            inputRef.current.setValue(outputRef.current.getValue(), false);
        }
    };

    const webLnForOutput = existingSwap==null && lnWallet != null && swapType === SwapType.TO_BTCLN;
    useEffect(() => {
        if(!webLnForOutput) return;
        if(exactIn) {
            inputRef.current.setValue("");
            setExactIn(false);
        }
        addressRef.current.setValue("");
    }, [webLnForOutput]);

    const btcWalletForOutput = existingSwap==null && bitcoinWallet!=null && swapType===SwapType.TO_BTC;
    const isSwapToRandomBtcAddress = quote!=null && quote.getType()===SwapType.TO_BTC &&
        (quote as ToBTCSwap).getBitcoinAddress() === RANDOM_BTC_ADDRESS;
    //Don't lock amounts when WebLN wallet is connected
    const amountsLocked = webLnForOutput ? false : addressData?.amount!=null;

    const setAmountLock = useCallback((val: boolean) => {
        if (existingSwap==null) {
            if(val) {
                setUnlocked(false);
                navigate("/?swapId=" + quote.getPaymentHash().toString("hex"));
            } else {
                navigate("/");
            }
        } else {
            if(val) {
                setUnlocked(false);
            } else {
                setUnlocked(true);
            }
        }
    }, [quote, existingSwap]);

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

                    <ErrorAlert error={quoteError}/>

                    <Card className="d-flex flex-column tab-accent-p3 pt-2">
                        <div className="d-flex flex-row">
                            <small className="text-light text-opacity-75 me-auto">You pay</small>

                            {maxSpendable != null ? (
                                <>
                                    {swapType === SwapType.FROM_BTC ? (
                                        <small className="">
                                            <BitcoinWalletAnchor noText={true}/>
                                        </small>
                                    ) : (
                                        <Icon size={16} icon={ic_account_balance_wallet}
                                              style={{marginTop: "-0.3125rem"}} className=""/>
                                    )}
                                    <small className="me-2">
                                        {maxSpendable.amountString} {inputToken.ticker}
                                    </small>
                                    <Button
                                        variant="outline-light"
                                        style={{marginBottom: "2px"}}
                                        className="py-0 px-1"
                                        disabled={locked || amountsLocked}
                                        onClick={() => {
                                            setExactIn(true);
                                            inputRef.current.setValue(maxSpendable.amountString);
                                        }}
                                    >
                                        <small className="font-smallest" style={{marginBottom: "-2px"}}>MAX</small>
                                    </Button>
                                </>
                            ) : (
                                swapType === SwapType.FROM_BTCLN ? (
                                    <small>
                                        <WebLNAnchor/>
                                    </small>
                                ) : swapType === SwapType.FROM_BTC ? (
                                    <small className="">
                                        <BitcoinWalletAnchor/>
                                    </small>
                                ) : ""
                            )}
                        </div>

                        <ValidatedInput
                            disabled={locked || amountsLocked || webLnForOutput}
                            inputRef={inputRef}
                            className="flex-fill"
                            type="number"
                            value={inputAmount}
                            size={"lg"}
                            textStart={!exactIn && quoteLoading ? (
                                <Spinner size="sm" className="text-white"/>
                            ) : null}
                            onChange={(value) => {
                                console.log("SwapNew: ValidatedInput(inputAmount): onChange: ", value);
                                leaveExistingSwap();
                                setExactIn(true);
                            }}
                            onValidatedInput={val => {
                                if (exactIn) setValidatedAmount(val);
                            }}
                            inputId="amount-input"
                            inputClassName="font-weight-500"
                            floatingLabel={inputValue == null ? null : FEConstants.USDollar.format(inputValue)}
                            expectingFloatingLabel={true}
                            step={inputToken == null ? new BigNumber("0.00000001") : new BigNumber(10).pow(new BigNumber(-inputToken.decimals))}
                            min={inConstraints?.min}
                            max={inputMax}
                            validated={(!exactIn && quote!=null) || existingSwap!=null ? null : undefined}
                            elementEnd={(
                                <CurrencyDropdown
                                    currencyList={!isSend ? bitcoinTokenArray : allowedScTokens}
                                    onSelect={val => {
                                        if (locked) return;
                                        leaveExistingSwap(true);
                                        if (!isSend) {
                                            if (isBtcToken(val)) {
                                                const swapType = val.lightning ? SwapType.FROM_BTCLN : SwapType.FROM_BTC;
                                                console.log("SwapNew: CurrencyDropdown(input): Setting swap type: "+SwapType[swapType]);
                                                setSwapType(swapType);
                                            }
                                        } else {
                                            if (isSCToken(val)) setScCurrency(val);
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

                            {swapType === SwapType.TO_BTC ? (
                                <small>
                                    <BitcoinWalletAnchor/>
                                </small>
                            ) : ""}
                            {swapType === SwapType.TO_BTCLN ? (
                                <small>
                                    <WebLNAnchor/>
                                </small>
                            ) : ""}
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
                                onChange={val => {
                                    console.log("SwapNew: ValidatedInput(outputAmount): onChange: ", val);
                                    leaveExistingSwap();
                                    setExactIn(false);
                                    if (webLnForOutput) addressRef.current.setValue("");
                                }}
                                onValidatedInput={val => {
                                    if (!exactIn) setValidatedAmount(val);
                                }}
                                inputId="amount-output"
                                inputClassName="font-weight-500"
                                floatingLabel={outputValue == null ? null : FEConstants.USDollar.format(outputValue)}
                                expectingFloatingLabel={true}
                                step={outputToken == null ? new BigNumber("0.00000001") : new BigNumber(10).pow(new BigNumber(-outputToken.decimals))}
                                min={outConstraints?.min}
                                max={outConstraints?.max}
                                validated={(exactIn && quote!=null) || existingSwap!=null ? null : undefined}
                                elementEnd={(
                                    <CurrencyDropdown
                                        currencyList={isSend ? bitcoinTokenArray : allowedScTokens}
                                        onSelect={(val) => {
                                            if (locked) return;
                                            leaveExistingSwap(true, true);
                                            if (isSend) {
                                                if (isBtcToken(val)) {
                                                    const swapType = val.lightning ? SwapType.TO_BTCLN : SwapType.TO_BTC;
                                                    console.log("SwapNew: CurrencyDropdown(input): Setting swap type: "+SwapType[swapType]);
                                                    setSwapType(swapType);
                                                }
                                                addressRef.current.setValue("", false);
                                            } else {
                                                if (isSCToken(val)) setScCurrency(val);
                                            }
                                        }}
                                        value={outputToken}
                                        className="round-right text-white bg-black bg-opacity-10"
                                    />
                                )}
                            />
                        </div>
                        <div className={"flex-column "+(isSend ? "d-flex" : "d-none")}>
                            <ValidatedInput
                                type={"text"}
                                className={"flex-fill mt-3 " + (webLnForOutput && (validatedAddress == null || validatedAddress === "") ? "d-none" : "")}
                                onChange={(val) => leaveExistingSwap(false, true)}
                                onValidatedInput={setValidatedAddress}
                                value={outputAddress}
                                inputRef={addressRef}
                                placeholder={"Paste Bitcoin/Lightning address"}
                                onValidate={addressValidator}
                                validated={addressData?.error}
                                disabled={locked || webLnForOutput || btcWalletForOutput}
                                textStart={addressLoading ? (
                                    <Spinner size="sm" className="text-white"/>
                                ) : null}
                                textEnd={locked || webLnForOutput || btcWalletForOutput ? null : (
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
                                successFeedback={
                                    btcWalletForOutput ? "Address fetched from your " + bitcoinWallet.getName() + " wallet!" :
                                    webLnForOutput ? "Lightning invoice fetched from your WebLN lightning wallet!" : null
                                }
                            />
                            {webLnForOutput ? (
                                <>
                                    {validatedAddress == null || validatedAddress === "" ? (
                                        <div className="mt-2">
                                            <a href="javascript:void(0);" onClick={() => {
                                                if (validatedAmount == null) return;
                                                lnWallet.makeInvoice(fromHumanReadable(validatedAmount, Tokens.BITCOIN.BTCLN).toNumber()).then(res => {
                                                    addressRef.current.setValue(res.paymentRequest);
                                                }).catch(e => console.error(e));
                                            }}>Fetch invoice from WebLN</a>
                                        </div>
                                    ) : ""}
                                </>
                            ) : ""}

                            <Alert
                                variant={"success"}
                                className="mt-3 mb-0 text-center"
                                show={!locked && lnWallet == null && swapType === SwapType.TO_BTCLN && addressData == null && existingSwap==null}
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
                            {!isSwapToRandomBtcAddress ? (
                                <div className="mt-3 d-flex flex-column text-white">
                                    <QuoteSummary
                                        type="swap"
                                        quote={existingSwap ?? quote}
                                        balance={maxSpendable?.rawAmount ?? null}
                                        refreshQuote={() => {
                                            if(existingSwap!=null) {
                                                if(existingSwap.exactIn) {
                                                    inputRef.current.setValue(existingSwap.getInput().amount, false);
                                                } else {
                                                    outputRef.current.setValue(existingSwap.getOutput().amount, false);
                                                }
                                                leaveExistingSwap();
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
                    <img
                        className="opacity-50 d-block ms-1" height={18}
                        src="/ackee_blockchain.svg" style={{marginTop: "-0.125rem"}}
                    />
                </div>
            </div>
        </>
    )

}