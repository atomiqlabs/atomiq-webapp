// import {
//     AbstractSigner,
//     FromBTCSwap,
//     FromBTCSwapState,
//     IFromBTCSwap, isBtcToken, isSCToken,
//     ISwap,
//     IToBTCSwap,
//     LNURLPay,
//     LNURLWithdraw, MultichainSwapper, MultichainTokenBounds, SCToken,
//     Swapper,
//     SwapType, ToBTCLNSwap,
//     ToBTCSwap,
//     ToBTCSwapState, Token, TokenBounds, Tokens
// } from "@atomiqlabs/sdk";
// import {Alert, Button, Card, OverlayTrigger, Spinner, Tooltip} from "react-bootstrap";
// import {MutableRefObject, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
// import ValidatedInput, {ValidatedInputRef} from "../components/ValidatedInput";
// import BigNumber from "bignumber.js";
// import * as React from "react";
// import {
//     bitcoinTokenArray,
//     fromHumanReadableString, smartChainTokenArray,
//     toHumanReadable, toHumanReadableString
// } from "../utils/Currencies";
// import {CurrencyDropdown} from "../components/CurrencyDropdown";
// import {SimpleFeeSummaryScreen} from "../components/fees/SimpleFeeScreen";
// import {QuoteSummary} from "../components/quotes/QuoteSummary";
// import {SwapTopbar} from "../components/SwapTopbar";
// import {useLocation, useNavigate} from "react-router-dom";
// import Icon from "react-icons-kit";
// import {arrows_vertical} from 'react-icons-kit/ikons/arrows_vertical';
// import {ic_qr_code_scanner} from 'react-icons-kit/md/ic_qr_code_scanner';
// import {lock} from 'react-icons-kit/fa/lock';
// import {ic_account_balance_wallet} from 'react-icons-kit/md/ic_account_balance_wallet';
// import {ic_content_copy} from 'react-icons-kit/md/ic_content_copy';
// import * as bitcoin from "bitcoinjs-lib";
// import * as randomBytes from "randombytes";
// import {FEConstants} from "../FEConstants";
// import * as BN from "bn.js";
// import {QRScannerModal} from "../components/qr/QRScannerModal";
// import {BitcoinWalletContext} from "../context/BitcoinWalletContext";
// import {BitcoinWalletAnchor} from "../components/wallet/BitcoinWalletButton";
// import {WebLNContext} from "../context/WebLNContext";
// import {WebLNAnchor} from "../components/wallet/WebLNButton";
// import {SwapsContext} from "../context/SwapsContext";
// import {useAmountConstraints} from "../utils/useAmountConstraints";
// import {useExistingSwap} from "../utils/useExistingSwap";
// import {useWalletBalance} from "../utils/useWalletBalance";
// import {usePricing} from "../utils/usePricing";
// import {useAddressData} from "../utils/useAddressData";
//
// const defaultConstraints = {
//     min: new BigNumber("0.000001"),
//     max: null
// };
//
// const RANDOM_BTC_ADDRESS = bitcoin.payments.p2wsh({
//     hash: randomBytes(32),
//     network: FEConstants.chain === "DEVNET" ? bitcoin.networks.testnet : bitcoin.networks.bitcoin
// }).address;
//
// function isCreated(swap: ISwap) {
//     if(swap instanceof IToBTCSwap) {
//         return swap.getState()===ToBTCSwapState.CREATED;
//     }
//     if(swap instanceof FromBTCSwap) {
//         return swap.getState()===FromBTCSwapState.PR_CREATED;
//     }
//     return false;
// }
//
// export function Swap(props: {
//     supportedCurrencies: SCToken[]
// }) {
//     const supportedCurrenciesSet: Set<string> = useMemo(
//         () => new Set(props.supportedCurrencies.map(token => token.chainId+":"+token.address)),
//         [props.supportedCurrencies]
//     );
//     const {swapper, chains} = useContext(SwapsContext);
//     const navigate = useNavigate();
//
//     const addressValidator = useCallback((val) => {
//         if(val==="") return "Destination address/lightning invoice required";
//         console.log("Is valid bitcoin address: ", val);
//         if(swapper.isValidLNURL(val) || swapper.isValidBitcoinAddress(val) || swapper.isValidLightningInvoice(val)) return null;
//         try {
//             if(swapper.getLightningInvoiceValue(val)==null) {
//                 return "Lightning invoice needs to contain a payment amount!";
//             }
//         } catch (e) {}
//         return "Invalid bitcoin address/lightning network invoice";
//     }, [swapper]);
//
//     const {bitcoinWallet} = useContext(BitcoinWalletContext);
//     const {lnWallet} = useContext(WebLNContext);
//
//
//     const [locked, setLocked] = useState<boolean>(false);
//
//     const [inCurrency, setInCurrency] = useState<Token>(Tokens.BITCOIN.BTC);
//     const [outCurrency, setOutCurrency] = useState<Token>(smartChainTokenArray[0]);
//     const [amount, setAmount] = useState<string>("");
//     const [exactIn, setExactIn] = useState<boolean>(true);
//     const [address, setAddress] = useState<string>();
//     const [addressLoading, addressData] = useAddressData(address);
//
//     const inAmountRef = useRef<ValidatedInputRef>();
//     const outAmountRef = useRef<ValidatedInputRef>();
//     const addressRef = useRef<ValidatedInputRef>();
//
//     const signerData = chains[isSCToken(inCurrency) ? inCurrency.chainId : isSCToken(outCurrency) ? outCurrency.chainId : null];
//     const signer = signerData?.signer;
//     const randomSigner = signerData?.random;
//
//     const swapType: SwapType = inCurrency.ticker===Tokens.BITCOIN.BTC.ticker ? SwapType.FROM_BTC : inCurrency.ticker===Tokens.BITCOIN.BTCLN.ticker ? SwapType.FROM_BTCLN : outCurrency.ticker===Tokens.BITCOIN.BTC.ticker ? SwapType.TO_BTC : SwapType.TO_BTCLN;
//     const isSend: boolean = swapType===SwapType.TO_BTC || swapType===SwapType.TO_BTCLN;
//
//     const {inConstraints, outConstraints, supportedTokensSet} = useAmountConstraints(exactIn, inCurrency, outCurrency);
//
//     let allowedSCTokens: SCToken[] = props.supportedCurrencies;
//     if(swapper!=null) {
//         const supportedCurrencies = swapper.getSupportedTokens(swapType);
//         allowedSCTokens = supportedCurrencies.filter(currency => {
//             const currencyIdentifier = currency.chainId+":"+currency.address;
//             return (supportedTokensSet!=null ? supportedTokensSet.has(currencyIdentifier) : true) && supportedCurrenciesSet.has(currencyIdentifier);
//         });
//     }
//
//     //Load existing swap
//     const {search} = useLocation();
//     const params = new URLSearchParams(search);
//     const propSwapId = params.get("swapId");
//     const [existingSwap, existingSwapLoading] = useExistingSwap(propSwapId);
//
//     const maxSpendable = useWalletBalance(randomSigner ? null : signer, inCurrency);
//
//     const priorMaxSpendable = useRef<any>();
//     useEffect(() => {
//         console.log("useEffect(): Max spendable");
//         if(priorMaxSpendable.current==maxSpendable) return;
//         priorMaxSpendable.current = maxSpendable;
//
//         if(exactIn) {
//             if(inAmountRef.current.validate() || amount==="") {
//                 if(quoteRef.current==null && !quoteLoading && !locked) refreshQuote();
//             } else {
//                 if((quoteRef.current!=null || quoteLoading) && !locked) refreshQuote();
//             }
//         }
//     }, [maxSpendable, locked, quoteLoading, exactIn]);
//
//     const [qrScanning, setQrScanning] = useState<boolean>(false);
//
//     const changeDirection = () => {
//         if(locked) return;
//         setQuote(null);
//         setExactIn(!exactIn);
//         setInCurrency(outCurrency);
//         setOutCurrency(inCurrency);
//         _setAddress("");
//         setDoValidate(true);
//     };
//
//     const inputAmount: BN = exactIn ? fromHumanReadableString(amount, inCurrency) : quote!=null ? quote.getInput().rawAmount : null;
//     const outputAmount: BN = !exactIn ? fromHumanReadableString(amount, outCurrency) : quote!=null ? quote.getOutput().rawAmount : null;
//
//     const inputValue = usePricing(inputAmount==null ? null : inputAmount.toString(10), inCurrency);
//     const outputValue = usePricing(outputAmount==null ? null : outputAmount.toString(10), outCurrency);
//
//     return (
//         <>
//             <SwapTopbar selected={0} enabled={!locked}/>
//
//             <QRScannerModal onScanned={(data: string) => {
//                 console.log("QR scanned: ", data);
//                 setAddress(data);
//                 setQrScanning(false);
//             }} show={qrScanning} onHide={() => setQrScanning(false)}/>
//
//             <div className="d-flex flex-column align-items-center text-white">
//                 <Card className="p-3 swap-panel tab-bg mx-3 mb-3 border-0">
//
//                     <Alert className="text-center" show={quoteError!=null} variant="danger" onClose={() => clearError()}>
//                         <div className="d-flex align-items-center justify-content-center">
//                             <strong>Quoting error</strong>
//                             <OverlayTrigger
//                                 placement="top"
//                                 overlay={<Tooltip id="scan-qr-tooltip">Copy full error stack</Tooltip>}
//                             >
//                                 <a href="#" className="d-inline-flex align-items-center justify-content-middle"
//                                    onClick={(evnt) => {
//                                        evnt.preventDefault();
//                                        // @ts-ignore
//                                        navigator.clipboard.writeText(JSON.stringify({
//                                            error: quoteError.name,
//                                            message: quoteError.message,
//                                            stack: quoteError.stack
//                                        }, null, 4));
//                                    }}><Icon className="ms-1 mb-1" size={16} icon={ic_content_copy}/></a>
//                             </OverlayTrigger>
//                         </div>
//                         <label>
//                             {quoteError?.message || quoteError?.toString()}
//                         </label>
//                     </Alert>
//
//                     <Card className="d-flex flex-column tab-accent-p3 pt-2">
//                         <div className="d-flex flex-row">
//                             <small className="text-light text-opacity-75 me-auto">You pay</small>
//
//                             {inCurrency.ticker===Tokens.BITCOIN.BTC.ticker ? (
//                                 <small className="">
//                                     <BitcoinWalletAnchor noText={true}/>
//                                 </small>
//                             ) : ""}
//                             {inCurrency.ticker===Tokens.BITCOIN.BTCLN.ticker ? (
//                                 <small className="">
//                                     <WebLNAnchor/>
//                                 </small>
//                             ) : ""}
//                             {maxSpendable!=null ? (
//                                 <>
//                                     {inCurrency.ticker!==Tokens.BITCOIN.BTC.ticker ? (
//                                         <Icon size={16} icon={ic_account_balance_wallet} style={{marginTop: "-0.3125rem"}} className=""/>
//                                     ) : ""}
//                                     <small className="me-2">
//                                         {toHumanReadableString(maxSpendable.amount, inCurrency)} {inCurrency.ticker}
//                                     </small>
//                                     <Button variant="outline-light" style={{marginBottom: "2px"}} className="py-0 px-1" disabled={locked || inputDisabled} onClick={() => {
//                                         setExactIn(true);
//                                         setAmount(toHumanReadableString(maxSpendable.amount, inCurrency));
//                                     }}><small className="font-smallest" style={{marginBottom: "-2px"}}>MAX</small></Button>
//                                 </>
//                             ) : ""}
//                         </div>
//                         <ValidatedInput
//                             disabled={locked || inputDisabled}
//                             inputRef={inAmountRef}
//                             className="flex-fill"
//                             type="number"
//                             value={!exactIn ? (quote==null ? "" : toHumanReadableString(inputAmount, inCurrency)) : amount }
//                             size={"lg"}
//                             textStart={!exactIn && quoteLoading ? (
//                                 <Spinner size="sm" className="text-white"/>
//                             ) : null}
//                             onChange={val => {
//                                 setAmount(val);
//                                 setExactIn(true);
//                             }}
//                             inputId="amount-input"
//                             inputClassName="font-weight-500"
//                             floatingLabel={inputValue==null ? null : FEConstants.USDollar.format(inputValue)}
//                             expectingFloatingLabel={true}
//                             step={inCurrency==null ? new BigNumber("0.00000001") : new BigNumber(10).pow(new BigNumber(-inCurrency.decimals))}
//                             min={inConstraints.min}
//                             max={maxSpendable==null ? inConstraints.max : inConstraints.max==null ? toHumanReadable(maxSpendable.amount, inCurrency) : BigNumber.min(toHumanReadable(maxSpendable.amount, inCurrency), inConstraints.max)}
//                             onValidate={(val: any) => {
//                                 // return exactIn && val==="" ? "Amount cannot be empty" : null;
//                                 return null;
//                             }}
//                             elementEnd={(
//                                 <CurrencyDropdown currencyList={!isSend ? bitcoinTokenArray : allowedSCTokens} onSelect={val => {
//                                     if(locked) return;
//                                     setInCurrency(val);
//                                 }} value={inCurrency} className="round-right text-white bg-black bg-opacity-10"/>
//                             )}
//                         />
//                     </Card>
//                     <div className="d-flex justify-content-center swap-direction-wrapper">
//                         <Button onClick={changeDirection} size="lg" className="px-0 swap-direction-btn">
//                             <Icon size={22} icon={arrows_vertical} style={{marginTop: "-8px"}}/>
//                         </Button>
//                     </div>
//                     <Card className="tab-accent-p3 pt-2">
//                         <div className="d-flex flex-row">
//                             <small className="text-light text-opacity-75 me-auto">You receive</small>
//
//                             {outCurrency.ticker===Tokens.BITCOIN.BTC.ticker ? (
//                                 <small>
//                                     <BitcoinWalletAnchor/>
//                                 </small>
//                             ) : ""}
//                             {outCurrency.ticker===Tokens.BITCOIN.BTCLN.ticker ? (
//                                 <small>
//                                     <WebLNAnchor/>
//                                 </small>
//                             ) : ""}
//                         </div>
//                         <div className="d-flex flex-row">
//                             <ValidatedInput
//                                 disabled={locked || outputDisabled}
//                                 inputRef={outAmountRef}
//                                 className="flex-fill strip-group-text"
//                                 type="number"
//                                 value={exactIn ? (quote==null ? "" : toHumanReadableString(outputAmount, outCurrency)) : amount }
//                                 size={"lg"}
//                                 textStart={exactIn && quoteLoading ? (
//                                     <Spinner size="sm" className="text-white"/>
//                                 ) : null}
//                                 onChange={val => {
//                                     setAmount(val);
//                                     if(outCurrency.ticker===Tokens.BITCOIN.BTCLN.ticker && lnWallet!=null) setAddress("");
//                                     setExactIn(false);
//                                 }}
//                                 inputId="amount-output"
//                                 inputClassName="font-weight-500"
//                                 floatingLabel={outputValue==null ? null : FEConstants.USDollar.format(outputValue)}
//                                 expectingFloatingLabel={true}
//                                 step={outCurrency==null ? new BigNumber("0.00000001") : new BigNumber(10).pow(new BigNumber(-outCurrency.decimals))}
//                                 min={outConstraints.min}
//                                 max={outConstraints.max}
//                                 onValidate={(val: any) => {
//                                     // return !exactIn && val==="" ? "Amount cannot be empty" : null;
//                                     return null;
//                                 }}
//                                 elementEnd={(
//                                     <CurrencyDropdown currencyList={isSend ? bitcoinTokenArray : allowedSCTokens} onSelect={(val) => {
//                                         if(locked) return;
//                                         setOutCurrency(val);
//                                         if(isSend && val!==outCurrency) {
//                                             _setAddress("");
//                                         }
//                                     }} value={outCurrency} className="round-right text-white bg-black bg-opacity-10"/>
//                                 )}
//                             />
//                         </div>
//                         {isSend ? (
//                             <>
//                                 <ValidatedInput
//                                     type={"text"}
//                                     className={"flex-fill mt-3 "+(lnWallet!=null && outCurrency.ticker===Tokens.BITCOIN.BTCLN.ticker && (address==null || address==="") ? "d-none" : "")}
//                                     value={address}
//                                     onChange={(val) => {
//                                         setAddress(val);
//                                     }}
//                                     inputRef={addressRef}
//                                     placeholder={"Paste Bitcoin/Lightning address"}
//                                     onValidate={addressValidator}
//                                     validated={quoteAddressError?.error}
//                                     disabled={locked || (lnWallet!=null && outCurrency.ticker===Tokens.BITCOIN.BTCLN.ticker)}
//                                     textStart={quoteAddressLoading ? (
//                                         <Spinner size="sm" className="text-white"/>
//                                     ) : null}
//                                     textEnd={lnWallet!=null && outCurrency.ticker===Tokens.BITCOIN.BTCLN.ticker ? null : (
//                                         <OverlayTrigger
//                                             placement="top"
//                                             overlay={<Tooltip id="scan-qr-tooltip">Scan QR code</Tooltip>}
//                                         >
//                                             <a href="#" style={{
//                                                 marginTop: "-3px"
//                                             }} onClick={(e) => {
//                                                 e.preventDefault();
//                                                 setQrScanning(true);
//                                             }}><Icon size={24} icon={ic_qr_code_scanner}/></a>
//                                         </OverlayTrigger>
//                                     )}
//                                     successFeedback={bitcoinWallet!=null && address===bitcoinWallet.getReceiveAddress() ? "Address fetched from your "+bitcoinWallet.getName()+" wallet!" : null}
//                                 />
//                                 {lnWallet!=null && outCurrency.ticker===Tokens.BITCOIN.BTCLN.ticker ? (
//                                     <>
//                                         {address==null || address==="" ? (
//                                             <div className="mt-2">
//                                                 <a href="javascript:void(0);" onClick={() => {
//                                                     if(!outAmountRef.current.validate() || amount==="") return;
//                                                     lnWallet.makeInvoice(fromHumanReadableString(amount, outCurrency).toNumber()).then(res => {
//                                                         setAddress(res.paymentRequest);
//                                                     }).catch(e => console.error(e));
//                                                 }}>Fetch invoice from WebLN</a>
//                                             </div>
//                                         ) : ""}
//                                     </>
//                                 ) : ""}
//                                 {lnWallet==null && outCurrency.ticker===Tokens.BITCOIN.BTCLN.ticker && !swapper.isValidLightningInvoice(address) && !swapper.isValidLNURL(address) ? (
//                                     <Alert variant={"success"} className="mt-3 mb-0 text-center">
//                                         <label>Only lightning invoices with pre-set amount are supported! Use lightning address/LNURL for variable amount.</label>
//                                     </Alert>
//                                 ) : ""}
//                             </>
//                         ) : ""}
//                     </Card>
//
//                     {quoteError!=null ? (
//                         <Button variant="light" className="mt-3" onClick={refreshQuote}>Retry</Button>
//                     ) : ""}
//
//                     {quote!=null ? (
//                         <>
//                             <div className="mt-3">
//                                 <SimpleFeeSummaryScreen swap={quote} btcFeeRate={inCurrency.ticker===Tokens.BITCOIN.BTC.ticker ? maxSpendable?.feeRate : null}/>
//                             </div>
//                             {!(quote instanceof ToBTCSwap) || quote.getBitcoinAddress()!==RANDOM_BTC_ADDRESS ? (
//                                 <div className="mt-3 d-flex flex-column text-white">
//                                     <QuoteSummary type="swap" quote={quote} balance={maxSpendable?.amount} refreshQuote={refreshQuote} setAmountLock={(val) => {
//                                         console.log("Set locked: ", val, propSwapId);
//                                         setLocked(val);
//                                         if(val && propSwapId==null && quote!=null) navigate("/?swapId="+quote.getPaymentHash().toString("hex"));
//                                         if(!val) {
//                                             // console.log("Navigate to /");
//                                             navigate("/");
//                                         }
//                                     }} abortSwap={() => {
//                                         setLocked(false);
//                                         setQuote(null);
//                                         navigate("/");
//                                         setAmount("");
//                                     }} feeRate={maxSpendable?.feeRate}/>
//                                 </div>
//                             ) : ""}
//                         </>
//                     ) : ""}
//                 </Card>
//             </div>
//
//             <div className="text-light text-opacity-50 d-flex flex-row align-items-center justify-content-center mb-3">
//                 <div className="cursor-pointer d-flex align-items-center justify-content-center" onClick={() => navigate("/faq?tabOpen=6")}>
//                     <Icon size={18} icon={lock} style={{marginTop: "-0.5rem"}}/>
//                     <small>Audited by</small>
//                     <img className="opacity-50 d-block ms-1" height={18} src="/ackee_blockchain.svg" style={{marginTop: "-0.125rem"}}/>
//                 </div>
//             </div>
//         </>
//     )
//
// }
