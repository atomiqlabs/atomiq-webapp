import {Alert, Button, Spinner} from "react-bootstrap";
import {useLocation, useNavigate} from "react-router-dom";
import {SwapTopbar} from "../components/SwapTopbar";
import * as React from "react";
import {useContext, useEffect} from "react";
import Icon from "react-icons-kit";
import {LnForGasSwapState, Tokens} from "@atomiqlabs/sdk";
import * as BN from "bn.js";
import ValidatedInput from "../components/ValidatedInput";
import {ic_south} from 'react-icons-kit/md/ic_south'
import {SwapsContext} from "../context/SwapsContext";
import {TokenIcon} from "../components/TokenIcon";
import {useAnchorNavigate} from "../utils/useAnchorNavigate";
import {useAsync} from "../utils/useAsync";
import {TrustedFromBTCLNQuoteSummary} from "../components/quotes/frombtc/TrustedFromBTCLNQuoteSummary";
import {useSwapState} from "../utils/useSwapState";

const defaultSwapAmount = "12500000";

export function SwapForGas() {
    const {swapper, chains} = useContext(SwapsContext);

    const navigate = useNavigate();
    const navigateHref = useAnchorNavigate();

    const {state} = useLocation() as {state: {returnPath?: string, chainId?: string, amount: string}};
    const chainId = state?.chainId ?? "SOLANA";
    const amount = new BN(state?.amount ?? defaultSwapAmount);

    const [createSwap, loading, swapData, error] = useAsync(
        () => {
            if(swapper==null) return null;
            if(
                chains[chainId]==null ||
                chains[chainId].random
            ) return null;
            return swapper.createTrustedLNForGasSwap(chainId, chains[chainId].signer.getAddress(), amount);
        },
        [swapper, chains, chainId]
    );
    const {state: swapState} = useSwapState(swapData);

    useEffect(() => {
        createSwap();
    }, [createSwap]);

    const nativeCurrency = swapper==null ? null : swapper.getNativeToken(chainId);

    return (
        <>
            <SwapTopbar selected={3} enabled={true}/>

            <div className="d-flex flex-column flex-fill justify-content-center align-items-center text-white">
                <div className="quickscan-summary-panel d-flex flex-column flex-fill">
                    <div className="p-3 d-flex flex-column tab-bg border-0 card mb-3">
                        <Alert variant={"danger"} className="mb-3" show={!!error}>
                            <p><strong>Loading error</strong></p>
                            {error?.message}
                        </Alert>

                        <Alert className="text-center mb-3 d-flex align-items-center flex-column" show={!error} variant="success" closeVariant="white">
                            <label>
                                Swap for gas is a trusted service allowing you to swap BTCLN to {nativeCurrency?.ticker}, so you can then cover the gas fees of a trustless atomiq swap.
                                Note that this is a trusted service and is therefore only used for small amounts! You can read more about it in our <a href="/faq?tabOpen=11" onClick={navigateHref}>FAQ</a>.
                            </label>
                        </Alert>

                        {loading ? (
                            <div className="d-flex flex-column align-items-center justify-content-center tab-accent">
                                <Spinner animation="border" />
                                Creating gas swap...
                            </div>
                        ) : ""}

                        {swapData!=null ? (
                            <div className="mb-3 tab-accent-p3 text-center">
                                <ValidatedInput
                                    type={"number"}
                                    textEnd={(
                                        <span className="text-white font-bigger d-flex align-items-center">
                                            <TokenIcon tokenOrTicker={Tokens.BITCOIN.BTCLN} className="currency-icon"/>
                                            BTCLN
                                        </span>
                                    )}
                                    disabled={true}
                                    size={"lg"}
                                    value={swapData.getInput().amount}
                                    onChange={() => {}}
                                    placeholder={"Input amount"}
                                />

                                <Icon size={24} icon={ic_south} className="my-1"/>

                                <ValidatedInput
                                    type={"number"}
                                    textEnd={(
                                        <span className="text-white font-bigger d-flex align-items-center">
                                            <TokenIcon tokenOrTicker={nativeCurrency} className="currency-icon"/>
                                            {nativeCurrency.ticker}
                                        </span>
                                    )}
                                    disabled={true}
                                    size={"lg"}
                                    value={swapData.getOutput().amount}
                                    onChange={() => {}}
                                    placeholder={"Output amount"}
                                />
                            </div>
                        ) : ""}

                        {swapData!=null ? (
                            <TrustedFromBTCLNQuoteSummary quote={swapData} refreshQuote={createSwap} abortSwap={() => {
                                if(state?.returnPath!=null) navigate(state.returnPath);
                            }}/>
                        ) : ""}

                        {swapState===LnForGasSwapState.FINISHED && state?.returnPath!=null ? (
                            <Button onClick={() => {
                                navigate(state.returnPath);
                            }} variant="primary" className="mt-3">
                                Continue
                            </Button>
                        ) : ""}
                    </div>
                </div>
            </div>
        </>
    )
}