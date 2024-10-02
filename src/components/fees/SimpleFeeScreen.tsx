import {
    FromBTCSwap,
    ISwap,
    IToBTCSwap,
    Swapper,
    ToBTCSwap
} from "sollightning-sdk";
import {
    bitcoinCurrencies, CurrencySpec,
    getCurrencySpec, getNativeCurrency,
    toHumanReadable,
    toHumanReadableString
} from "../../utils/Currencies";
import * as BN from "bn.js";
import {BitcoinWalletContext} from "../../context/BitcoinWalletContext";
import {useContext, useEffect, useState} from "react";
import {Accordion, Badge, OverlayTrigger, Placeholder, Spinner, Tooltip} from "react-bootstrap";
import {getFeePct} from "../../utils/Utils";
import * as React from "react";
import Icon from "react-icons-kit";
import {ic_receipt_outline} from 'react-icons-kit/md/ic_receipt_outline';
import {FEConstants} from "../../FEConstants";
import {SwapsContext} from "../../context/SwapsContext";

function FeePart(props: {
    bold?: boolean,
    text: string,
    currency1: CurrencySpec,
    amount1: BN,
    currency2?: CurrencySpec,
    amount2?: BN,
    usdValue?: number,
    className?: string,

    feePPM?: BN,
    feeBase?: BN,
    feeCurrency?: CurrencySpec,
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
                        {props.currency2==null ? (
                            <span className="ms-auto d-flex align-items-center">
                                <img src={props.currency1.icon} className="currency-icon-small" style={{marginTop: "-2px"}}/>
                                <span>{toHumanReadableString(props.amount1, props.currency1)} {props.currency1.ticker}</span>
                            </span>
                        ) : (
                            <span className="ms-auto text-end">
                                <span className="d-flex align-items-center justify-content-start">
                                    <img src={props.currency1.icon} className="currency-icon-small"
                                         style={{marginTop: "-1px"}}/>
                                    <span>{toHumanReadableString(props.amount1, props.currency1)} {props.currency1.ticker}</span>
                                </span>
                                <span className="d-flex align-items-center justify-content-center fw-bold">
                                    =
                                </span>
                                <span className="d-flex align-items-center justify-content-start">
                                    <img src={props.currency2.icon} className="currency-icon-small"/>
                                    <span>{toHumanReadableString(props.amount2, props.currency2)} {props.currency2.ticker}</span>
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
    currency1: CurrencySpec,
    amount1: BN,
    usdValue?: number,
    currency2?: CurrencySpec,
    amount2?: BN,
    className?: string,

    feePPM?: BN,
    feeBase?: BN,
    feeCurrency?: CurrencySpec,
    description?: string
}

function FeeSummary(props: {
    srcCurrency: CurrencySpec,
    dstCurrency: CurrencySpec,
    feeBreakdown: SingleFee[],
    swapPrice: number,
    loading?: boolean
}) {
    const totalUsdFee = props.feeBreakdown==null ? 0 : props.feeBreakdown.reduce((value, e) => e.usdValue==null ? value : value+parseFloat(e.usdValue.toFixed(2)), 0);

    return (
        <Accordion>
            <Accordion.Item eventKey="0" className="tab-accent-nop">
                <Accordion.Header className="font-bigger d-flex flex-row" bsPrefix="fee-accordion-header">
                    <small className="me-auto">1 {props.dstCurrency.ticker} = {props.swapPrice.toFixed(props.srcCurrency.decimals)} {props.srcCurrency.ticker}</small>
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
                                currency1={e.currency1}
                                currency2={e.currency2}
                                amount1={e.amount1}
                                amount2={e.amount2}
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
    const btcTxFeeLoading = bitcoinWallet!=null && props.btcFeeRate!=null && props.btcFeeRate!=0 && props.swap!=null && props.swap instanceof FromBTCSwap && _btcTxFeeLoading;
    useEffect(() => {
        if(swapper==null) return;
        setBtcTxFee(null);
        if(bitcoinWallet==null || props.btcFeeRate==null || props.btcFeeRate==0 || props.swap==null || !(props.swap instanceof FromBTCSwap)) return;
        const swap = props.swap as FromBTCSwap<any>;
        setBtcTxFeeLoading(true);
        let cancelled = false;
        (async() => {
            try {
                const [usdcPrice, btcTxFee] = await Promise.all([
                    swapper.prices.preFetchPrice(FEConstants.usdcToken),
                    bitcoinWallet.getTransactionFee(swap.address, props.swap.getInAmount(), props.btcFeeRate)
                ]);
                if(btcTxFee==null) {
                    if(cancelled) return;
                    setBtcTxFeeLoading(false);
                    return;
                }
                const btcTxFeeBN = new BN(btcTxFee);
                const usdcNetworkFee = await swapper.prices.getFromBtcSwapAmount(btcTxFeeBN, FEConstants.usdcToken, null, usdcPrice);
                if(cancelled) return;
                setBtcTxFee({
                    text: "Network fee",
                    description: "Bitcoin transaction fee paid to bitcoin miners (this is a fee on top of your specified input amount)",
                    currency1: bitcoinCurrencies[0],
                    amount1: btcTxFeeBN,
                    usdValue: toHumanReadable(usdcNetworkFee, FEConstants.usdcToken).toNumber()
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

    const [scSideFees, setScSideFees] = useState<SingleFee[]>();
    useEffect(() => {
        if(swapper==null) return;
        setScSideFees(null);
        const inputCurrency = getCurrencySpec(props.swap.getInToken());
        const outputCurrency = getCurrencySpec(props.swap.getOutToken());
        const isFromBtc = props.swap.getInToken().chain==="BTC";
        const btcCurrency = isFromBtc ? inputCurrency : outputCurrency;

        const abortController = new AbortController();
        const fees: Promise<SingleFee>[] = [];
        const usdcPricePromise = swapper.prices.preFetchPrice(FEConstants.usdcToken, abortController.signal);

        const swapFee = props.swap.getSwapFee();
        const swapFeeBtc = isFromBtc ? swapFee.amountInSrcToken : swapFee.amountInDstToken;

        fees.push(usdcPricePromise.then(usdcPrice => swapper.prices.getFromBtcSwapAmount(
            swapFeeBtc, FEConstants.usdcToken, abortController.signal, usdcPrice
        )).then(swapFeeUsdc => {
            return {
                text: "Swap fee",
                feePPM: getFeePct(props.swap, 1),
                feeBase: props.swap.pricingInfo.satsBaseFee,
                feeCurrency: btcCurrency,
                currency1: inputCurrency,
                amount1: swapFee.amountInSrcToken,
                currency2: outputCurrency,
                amount2: swapFee.amountInDstToken,
                usdValue: toHumanReadable(swapFeeUsdc, FEConstants.usdcToken).toNumber()
            };
        }))

        if(props.swap instanceof IToBTCSwap) {
            const networkFee = props.swap.getNetworkFee();

            fees.push(usdcPricePromise.then(usdcPrice => swapper.prices.getFromBtcSwapAmount(
                networkFee.amountInDstToken, FEConstants.usdcToken, abortController.signal, usdcPrice
            )).then(networkFeeUsdc => {
                return {
                    text: "Network fee",
                    description: props.swap instanceof ToBTCSwap ?
                        "Bitcoin transaction fee paid to bitcoin miners" :
                        "Lightning network fee paid for routing the payment through the network",
                    currency1: inputCurrency,
                    amount1: networkFee.amountInSrcToken,
                    currency2: outputCurrency,
                    amount2: networkFee.amountInDstToken,
                    usdValue: toHumanReadable(networkFeeUsdc, FEConstants.usdcToken).toNumber()
                };
            }));
        }

        if(props.swap instanceof FromBTCSwap) {
            const nativeCurrency = swapper.getNativeCurrency();
            const claimerBounty = props.swap.getClaimerBounty();
            fees.push(
                Promise.all([
                    usdcPricePromise,
                    swapper.prices.getToBtcSwapAmount(claimerBounty, nativeCurrency, abortController.signal)
                ])
                    .then(([usdcPrice, claimerBountyBtc]) =>
                        swapper.prices.getFromBtcSwapAmount(claimerBountyBtc, FEConstants.usdcToken, abortController.signal, usdcPrice)
                    )
                    .then(claimerBountyUsdc => {
                        return {
                            text: "Watchtower fee",
                            description: "Fee paid to swap watchtowers which automatically claim the swap for you as soon as the bitcoin transaction confirms.",
                            currency1: getNativeCurrency(),
                            amount1: claimerBounty,
                            usdValue: toHumanReadable(claimerBountyUsdc, FEConstants.usdcToken).toNumber()
                        };
                    })
            )
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

    return (<FeeSummary
        srcCurrency={getCurrencySpec(props.swap.getInToken())}
        dstCurrency={getCurrencySpec(props.swap.getOutToken())}
        swapPrice={props.swap.getSwapPrice()}
        feeBreakdown={scSideFees || []}
        loading={scSideFees==null || btcTxFeeLoading}
    />);
}