import ValidatedInput from "../../components/ValidatedInput";
import {CurrencyDropdown} from "../../components/CurrencyDropdown";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {FeeSummaryScreen} from "../../components/fees/FeeSummaryScreen";
import {Badge, Button, Form, OverlayTrigger, Spinner, Tooltip} from "react-bootstrap";
import {
    SCToken,
    SwapType
} from "@atomiqlabs/sdk";
import BigNumber from "bignumber.js";
import {
    smartChainTokenArray,
} from "../../utils/Currencies";
import {QuoteSummary} from "../../components/quotes/QuoteSummary";
import {useLocation, useNavigate} from "react-router-dom";
import {SwapTopbar} from "../../components/SwapTopbar";
import {SwapsContext} from "../../context/SwapsContext";
import {TokenIcon} from "../../components/TokenIcon";
import {useAddressData} from "../../utils/useAddressData";
import {useAmountConstraints} from "../../utils/useAmountConstraints";
import {useQuote} from "../../utils/useQuote";
import {useBigNumberState} from "../../utils/useBigNumberState";
import {useWalletBalance} from "../../utils/useWalletBalance";
import {ScrollAnchor} from "../../components/ScrollAnchor";
import {useLocalStorage} from "../../utils/useLocalStorage";
import {ErrorAlert} from "../../components/ErrorAlert";
import {Tokens} from "../../FEConstants";

export function QuickScanExecute() {
    const {swapper, getSigner} = useContext(SwapsContext);

    const navigate = useNavigate();
    const goBack = () => navigate("/scan");

    const {search} = useLocation() as {search: string};
    const params = new URLSearchParams(search);
    const propAddress = params.get("address") || params.get("lightning");
    useEffect(() => {
        if (propAddress == null) goBack();
    }, [propAddress]);

    const [isLocked, setLocked] = useState<boolean>(false);
    const [validatedAmount, setValidatedAmount] = useBigNumberState(null);
    const [selectedCurrency, setSelectedCurrency] = useState<SCToken>(null);
    const [isCurrencyPreselected, setCurrencyPreselected] = useState<boolean>(false);
    const signer = getSigner(selectedCurrency);

    useEffect(() => {
        const propToken = params.get("token");
        const propChainId = params.get("chainId");
        console.log("Prop token: ", propToken);
        if(propToken!=null && propChainId!=null) {
            setSelectedCurrency(Tokens[propChainId][propToken]);
            setCurrencyPreselected(true);
        }
    }, []);

    const [autoContinue, setAutoContinue] = useLocalStorage("crossLightning-autoContinue", false);

    const [addressLoading, addressResult] = useAddressData(propAddress);
    const inToken = addressResult?.swapType==null ? null :
        addressResult.swapType===SwapType.FROM_BTCLN ? Tokens.BITCOIN.BTCLN : selectedCurrency;
    const outToken = addressResult?.swapType==null ? null :
        addressResult.swapType===SwapType.TO_BTCLN ? Tokens.BITCOIN.BTCLN :
        addressResult.swapType===SwapType.TO_BTC ? Tokens.BITCOIN.BTC : selectedCurrency;

    const exactIn = !addressResult?.isSend;
    const btcToken = (exactIn ? inToken : outToken) ?? Tokens.BITCOIN.BTC;

    const {inConstraints, outConstraints, supportedTokensSet} = useAmountConstraints(exactIn, inToken, outToken);
    const btcConstraints = exactIn ? inConstraints : outConstraints;
    const amountConstraints = {
        min: BigNumber.max(btcConstraints?.min ?? 0, addressResult?.min ?? 0),
        max: BigNumber.min(btcConstraints?.max ?? Infinity, addressResult?.max ?? Infinity)
    };

    const [refresh, quote, quoteLoading, quoteError] = useQuote(signer, validatedAmount, exactIn, inToken, outToken, addressResult?.address);

    const selectableCurrencies = supportedTokensSet==null ?
        smartChainTokenArray :
        smartChainTokenArray.filter(token => supportedTokensSet.has(token.chainId+":"+token.address));

    const walletBalanceResp = useWalletBalance(signer, inToken);
    const walletBalance = walletBalanceResp?.rawAmount ?? null;

    return (
        <>
            <SwapTopbar selected={1} enabled={!isLocked}/>

            <div className="d-flex flex-column flex-fill justify-content-center align-items-center text-white">
                <div className="quickscan-summary-panel d-flex flex-column flex-fill">
                    <div className="p-3 d-flex flex-column tab-bg border-0 card">
                        <ValidatedInput
                            type={"text"}
                            className=""
                            disabled={true}
                            value={addressResult?.address ?? propAddress}
                        />

                        <ErrorAlert className="mt-3" title="Destination parsing error" error={addressResult?.error}/>

                        {addressLoading ? (
                            <div className="d-flex flex-column align-items-center justify-content-center tab-accent mt-3">
                                <Spinner animation="border" />
                                Loading data...
                            </div>
                        ) : ""}

                        {addressResult?.error==null && swapper!=null && !addressLoading ? (
                            <div className="mt-3 tab-accent-p3 text-center">
                                <label className="fw-bold mb-1">{addressResult?.isSend ? "Pay" : "Withdraw"}</label>

                                <ValidatedInput
                                    type={"number"}
                                    textEnd={(
                                        <span className="text-white font-bigger d-flex align-items-center">
                                            <TokenIcon tokenOrTicker={btcToken} className="currency-icon"/>
                                            BTC
                                        </span>
                                    )}
                                    step={new BigNumber(10).pow(new BigNumber(-btcToken.decimals))}
                                    min={amountConstraints.min}
                                    max={amountConstraints.max}
                                    disabled={
                                        addressResult?.amount!=null ||
                                        isLocked
                                    }
                                    size={"lg"}
                                    defaultValue={!addressResult?.isLnurl ? null : addressResult.isSend ? amountConstraints.min.toString(10) : amountConstraints.max.toString(10)}
                                    value={addressResult?.amount?.toString(10) ?? null}
                                    onValidatedInput={setValidatedAmount}
                                    placeholder={"Input amount"}
                                />

                                <label className="fw-bold mb-1">{addressResult?.isSend ? "with" : "to"}</label>

                                <div className="d-flex justify-content-center">
                                    <CurrencyDropdown currencyList={selectableCurrencies} onSelect={val => {
                                        if(isLocked) return;
                                        setSelectedCurrency(val as SCToken);
                                        setCurrencyPreselected(false);
                                    }} value={selectedCurrency} className="bg-black bg-opacity-10 text-white"/>
                                </div>

                                <Form className="text-start d-flex align-items-center justify-content-center font-bigger mt-2">
                                    <Form.Check // prettier-ignore
                                        id="autoclaim-pay"
                                        type="switch"
                                        onChange={(val) => setAutoContinue(val.target.checked)}
                                        checked={autoContinue}
                                    />
                                    <label title="" htmlFor="autoclaim-pay" className="form-check-label me-2">{addressResult?.isSend ? "Auto-pay" : "Auto-claim"}</label>
                                    <OverlayTrigger overlay={<Tooltip id="autoclaim-pay-tooltip">
                                        Automatically requests authorization of the transaction through your wallet - as soon as the swap pricing is returned.
                                    </Tooltip>}>
                                        <Badge bg="primary" className="pill-round" pill>?</Badge>
                                    </OverlayTrigger>
                                </Form>
                            </div>
                        ) : ""}

                        {quoteLoading? (
                            <div className="d-flex flex-column align-items-center justify-content-center tab-accent mt-3">
                                <Spinner animation="border" />
                                Fetching quote...
                            </div>
                        ) : ""}

                        {quoteError ? (
                            <>
                                <ErrorAlert className="mt-3 mb-0" title="Quoting error" error={quoteError}/>
                                <Button onClick={refresh} variant="secondary">Retry</Button>
                            </>
                        ) : ""}

                        {quote!=null ? (
                            <>
                                <FeeSummaryScreen swap={quote} className="mt-3 mb-3 tab-accent"/>
                                <QuoteSummary
                                    setAmountLock={setLocked} type={"payment"} quote={quote} balance={walletBalance}
                                    refreshQuote={refresh} autoContinue={autoContinue && (!isCurrencyPreselected || addressResult?.amount!=null)}
                                />
                            </>
                        ) : ""}

                        <ScrollAnchor trigger={quote!=null}/>
                    </div>
                    <div className="d-flex mt-auto py-4">
                        <Button variant="secondary flex-fill" disabled={isLocked} onClick={goBack}>
                            &lt; Back
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}