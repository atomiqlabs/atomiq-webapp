import {
    Fee,
    FromBTCSwap,
    ISwap,
    IToBTCSwap, SwapType,
    Token, Tokens, toTokenAmount
} from "@atomiqlabs/sdk";
import {
    toHumanReadableString
} from "../../utils/Currencies";
import * as BN from "bn.js";
import {BitcoinWalletContext} from "../../context/BitcoinWalletProvider";
import {useContext, useEffect, useState} from "react";
import {Accordion, Badge, OverlayTrigger, Spinner, Tooltip} from "react-bootstrap";
import {capitalizeFirstLetter, getFeePct} from "../../utils/Utils";
import * as React from "react";
import Icon from "react-icons-kit";
import {ic_receipt_outline} from 'react-icons-kit/md/ic_receipt_outline';
import {SwapsContext} from "../../context/SwapsContext";
import {TokenIcon} from "../TokenIcon";

function FeePart(props: {
    bold?: boolean,
    text: string,
    fee: Fee,
    usdValue?: number,
    className?: string,

    feePPM?: BN,
    feeBase?: BN,
    feeCurrency?: Token,
    description?: string
}) {

    return (
        <div className={"d-flex font-medium " + props.className}>
            <small className={"d-flex align-items-center" + (props.bold ? " fw-bold" : "")}>
                {props.text}
                {props.feePPM == null ? "" : props.feeBase == null ? (
                    <Badge bg="primary" className="ms-1 pill-round px-2"
                           pill>{props.feePPM.toNumber() / 10000} %</Badge>
                ) : (
                    <OverlayTrigger overlay={<Tooltip id={"fee-tooltip-" + props.text}>
                        <span>{props.feePPM.toNumber() / 10000}% + {toHumanReadableString(props.feeBase, props.feeCurrency)} {props.feeCurrency.ticker}</span>
                    </Tooltip>}>
                        <Badge bg="primary" className="ms-1 pill-round px-2" pill>
                            <span className="dottedUnderline">{props.feePPM.toNumber() / 10000}%</span>
                        </Badge>
                    </OverlayTrigger>
                )}
                {props.description != null ? (
                    <OverlayTrigger overlay={<Tooltip id={"fee-tooltip-desc-" + props.text}>
                        <span>{props.description}</span>
                    </Tooltip>}>
                        <Badge bg="primary" className="ms-1 pill-round px-2" pill>
                            <span className="dottedUnderline">?</span>
                        </Badge>
                    </OverlayTrigger>
                ) : ""}
            </small>
            <span className="ms-auto fw-bold d-flex align-items-center">
                <OverlayTrigger placement="left" overlay={
                    <Tooltip id={"fee-tooltip-" + props.text} className="font-default">
                        {props.fee.amountInDstToken==null ? (
                            <span className="ms-auto d-flex align-items-center">
                                <TokenIcon tokenOrTicker={props.fee.amountInSrcToken.token} className="currency-icon-small" style={{marginTop: "-2px"}}/>
                                <span>{props.fee.amountInSrcToken.amount} {props.fee.amountInSrcToken.token.ticker}</span>
                            </span>
                        ) : (
                            <span className="ms-auto text-end">
                                <span className="d-flex align-items-center justify-content-start">
                                    <TokenIcon tokenOrTicker={props.fee.amountInSrcToken.token}
                                               className="currency-icon-small" style={{marginTop: "-1px"}}/>
                                    <span>{props.fee.amountInSrcToken.amount} {props.fee.amountInSrcToken.token.ticker}</span>
                                </span>
                                <span className="d-flex align-items-center justify-content-center fw-bold">
                                    =
                                </span>
                                <span className="d-flex align-items-center justify-content-start">
                                    <TokenIcon tokenOrTicker={props.fee.amountInDstToken.token}
                                               className="currency-icon-small"/>
                                    <span>{props.fee.amountInDstToken.amount} {props.fee.amountInDstToken.token.ticker}</span>
                                </span>
                            </span>
                        )}
                    </Tooltip>
                }>
                    <span className="text-decoration-dotted font-monospace">${(props.usdValue==null ? 0 : props.usdValue).toFixed(2)}</span>
                </OverlayTrigger>
            </span>
        </div>
    );
}

type SingleFee = {
    text: string,
    fee: Fee,
    usdValue?: number,
    className?: string,

    feePPM?: BN,
    feeBase?: BN,
    feeCurrency?: Token,
    description?: string
}

function FeeSummary(props: {
    srcCurrency: Token,
    dstCurrency: Token,
    feeBreakdown: SingleFee[],
    swapPrice: number,
    loading?: boolean
}) {
    const totalUsdFee = props.feeBreakdown==null ? 0 : props.feeBreakdown.reduce((value, e) => e.usdValue==null ? value : value+parseFloat(e.usdValue.toFixed(2)), 0);

    return (
        <Accordion>
            <Accordion.Item eventKey="0" className="tab-accent-nop">
                <Accordion.Header className="font-bigger d-flex flex-row" bsPrefix="fee-accordion-header">
                    <small className="me-auto">1 {props.dstCurrency.ticker} = {props.swapPrice.toFixed(props.srcCurrency.displayDecimals ?? props.srcCurrency.decimals)} {props.srcCurrency.ticker}</small>
                    <Icon className="d-flex me-1" size={16} icon={ic_receipt_outline}/>
                    <span className="me-2">{props.loading ? (
                        <Spinner animation="border" size="sm" />
                    ) : "$" + totalUsdFee.toFixed(2)}</span>
                </Accordion.Header>
                <Accordion.Body className="p-2">
                    {props.feeBreakdown.map((e, index) => {
                        return (
                            <FeePart
                                key={index}
                                className={e.className}
                                usdValue={e.usdValue}
                                text={e.text}
                                description={e.description}
                                fee={e.fee}
                                feePPM={e.feePPM}
                                feeBase={e.feeBase}
                                feeCurrency={e.feeCurrency}
                            />
                        )
                    })}
                </Accordion.Body>
            </Accordion.Item>
        </Accordion>
    );

}

export function SimpleFeeSummaryScreen(props: {
    swap: ISwap,
    btcFeeRate?: number,
    className?: string
}) {
    const {swapper} = useContext(SwapsContext);
    const {bitcoinWallet} = useContext(BitcoinWalletContext);

    const [btcTxFee, setBtcTxFee] = useState<SingleFee>();
    const [_btcTxFeeLoading, setBtcTxFeeLoading] = useState<boolean>(false);
    const btcTxFeeLoading = bitcoinWallet!=null && props.btcFeeRate!=null && props.btcFeeRate!=0 && props.swap!=null && props.swap.getType()===SwapType.FROM_BTC && _btcTxFeeLoading;
    useEffect(() => {
        if(swapper==null) return;
        setBtcTxFee(null);
        if(bitcoinWallet==null || props.btcFeeRate==null || props.btcFeeRate==0 || props.swap==null || props.swap.getType()!==SwapType.FROM_BTC) return;
        const swap = props.swap as FromBTCSwap<any>;
        setBtcTxFeeLoading(true);
        let cancelled = false;
        (async() => {
            try {
                const input = props.swap.getInput();
                const [usdPrice, btcTxFee] = await Promise.all([
                    swapper.prices.preFetchUsdPrice(),
                    bitcoinWallet.getTransactionFee(swap.address, input.rawAmount, props.btcFeeRate)
                ]);
                if(btcTxFee==null) {
                    if(cancelled) return;
                    setBtcTxFeeLoading(false);
                    return;
                }
                const feeInBtc = toTokenAmount(new BN(btcTxFee), Tokens.BITCOIN.BTC, swapper.prices);

                const btcNetworkFee: Fee = {
                    amountInSrcToken: feeInBtc,
                    amountInDstToken: null,
                    usdValue: feeInBtc.usdValue
                };
                if(cancelled) return;
                setBtcTxFee({
                    text: "Bitcoin network fee",
                    description: "Bitcoin transaction fee paid to bitcoin miners (this is a fee on top of your specified input amount)",
                    fee: btcNetworkFee,
                    usdValue: await btcNetworkFee.usdValue(null, usdPrice)
                });
                setBtcTxFeeLoading(false);
            } catch (e) {
                if(cancelled) return;
                console.error(e);
                setBtcTxFeeLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        }
    }, [bitcoinWallet, props.btcFeeRate, props.swap, swapper]);

    const [scTxFee, setScTxFee] = useState<SingleFee>();
    const [_scTxFeeLoading, setScTxFeeLoading] = useState<boolean>(false);
    const scTxFeeLoading = props.swap.getSmartChainNetworkFee!=null && _scTxFeeLoading;
    useEffect(() => {
        if(swapper==null) return;
        setScTxFee(null);
        if(props.swap.getSmartChainNetworkFee==null) return;
        setScTxFeeLoading(true);
        let cancelled = false;
        (async() => {
            try {
                const [usdPrice, tokenAmount] = await Promise.all([
                    swapper.prices.preFetchUsdPrice(),
                    props.swap.getSmartChainNetworkFee()
                ]);
                const scNetworkFee: Fee = {
                    amountInSrcToken: tokenAmount,
                    amountInDstToken: null,
                    usdValue: tokenAmount.usdValue
                };
                if(cancelled) return;
                setScTxFee({
                    text: capitalizeFirstLetter(tokenAmount.token.chainId)+" network fee",
                    description: capitalizeFirstLetter(tokenAmount.token.chainId)+" transaction fee (this is a fee on top of your specified input amount)",
                    fee: scNetworkFee,
                    usdValue: await scNetworkFee.usdValue(null, usdPrice)
                });
                setScTxFeeLoading(false);
            } catch (e) {
                if(cancelled) return;
                console.error(e);
                setScTxFeeLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        }
    }, [props.swap, swapper]);

    const [scSideFees, setScSideFees] = useState<SingleFee[]>();
    useEffect(() => {
        if(swapper==null) return;
        setScSideFees(null);

        const abortController = new AbortController();
        const fees: Promise<SingleFee>[] = [];
        const usdPricePromise = swapper.prices.preFetchUsdPrice(abortController.signal);

        const swapFee = props.swap.getSwapFee();
        const isFromBtc = swapFee.amountInSrcToken.token.chain==="BTC";
        const btcCurrency = isFromBtc ? swapFee.amountInSrcToken.token : swapFee.amountInDstToken.token;

        fees.push(usdPricePromise.then(usdPrice => swapFee.usdValue(abortController.signal, usdPrice)).then(swapFeeUsd => {
            return {
                text: "Swap fee",
                feePPM: getFeePct(props.swap, 1),
                feeBase: props.swap.pricingInfo.satsBaseFee,
                feeCurrency: btcCurrency,
                fee: swapFee,
                usdValue: swapFeeUsd
            };
        }))

        if(props.swap.getType()===SwapType.TO_BTC || props.swap.getType()===SwapType.TO_BTCLN) {
            const networkFee = (props.swap as IToBTCSwap).getNetworkFee();

            fees.push(usdPricePromise.then(usdPrice => networkFee.usdValue(abortController.signal, usdPrice)).then(networkFeeUsd => {
                return {
                    text: props.swap.getType()===SwapType.TO_BTC ? "Bitcoin network fee" : "Lightning network fee",
                    description: props.swap.getType()===SwapType.TO_BTC ?
                        "Bitcoin transaction fee paid to bitcoin miners" :
                        "Lightning network fee paid for routing the payment through the network",
                    fee: networkFee,
                    usdValue: networkFeeUsd
                };
            }));
        }

        if(props.swap.getType()===SwapType.FROM_BTC) {
            const claimerBounty = (props.swap as FromBTCSwap).getClaimerBounty();
            fees.push(
                usdPricePromise.then(usdPrice => claimerBounty.usdValue(abortController.signal, usdPrice)).then(claimerBountyUsd => {
                    return {
                        text: "Watchtower fee",
                        description: "Fee paid to swap watchtowers which automatically claim the swap for you as soon as the bitcoin transaction confirms.",
                        fee: {
                            amountInSrcToken: claimerBounty,
                            amountInDstToken: null,
                            usdValue: claimerBounty.usdValue
                        },
                        usdValue: claimerBountyUsd
                    };
                })
            );
        }

        Promise.all(fees).then(fees => {
            if(abortController.signal.aborted) return;
            setScSideFees(fees)
        }).catch(e => {
            if(abortController.signal.aborted) return;
            console.error(e)
        });

        return () => abortController.abort();
    }, [props.swap, swapper]);

    const additionalFees: SingleFee[] = [];
    if(btcTxFee!=null) additionalFees.push(btcTxFee);
    if(scTxFee!=null) additionalFees.push(scTxFee);

    const allFees = additionalFees.concat(scSideFees || []);

    return (<FeeSummary
        srcCurrency={props.swap.getInput().token}
        dstCurrency={props.swap.getOutput().token}
        swapPrice={props.swap.getSwapPrice()}
        feeBreakdown={allFees}
        loading={scSideFees==null || btcTxFeeLoading || scTxFeeLoading}
    />);
}