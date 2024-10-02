import {FromBTCLNSwap, FromBTCSwap, ISwap, IToBTCSwap, ToBTCLNSwap, ToBTCSwap} from "sollightning-sdk";
import {
    bitcoinCurrencies,
    CurrencySpec,
    getCurrencySpec,
    getNativeCurrency,
    toHumanReadable,
    toHumanReadableString
} from "../../utils/Currencies";
import * as BN from "bn.js";
import {Badge, OverlayTrigger, Tooltip} from "react-bootstrap";
import * as React from "react";
import {getFeePct} from "../../utils/Utils";

function FeePart(props: {
    text: string,
    isApproximate?: boolean,

    currency: CurrencySpec,
    amount: BN,

    className?: string,

    feePPM?: BN,
    feeBase?: BN,
    feeCurrency?: CurrencySpec,

    description?: string
}) {
    return (
        <div className="d-flex my-2">
            <span className="d-flex align-items-center">
                {props.text}
                {props.feePPM==null ? "" : props.feeBase==null ? (
                    <Badge bg="primary" className="ms-1 pill-round px-2" pill>{props.feePPM.toNumber()/10000} %</Badge>
                ) : (
                    <OverlayTrigger overlay={<Tooltip id={"fee-tooltip-"+props.text}>
                        <span>{props.feePPM.toNumber()/10000}% + {toHumanReadableString(props.feeBase, props.feeCurrency)} {props.feeCurrency.ticker}</span>
                    </Tooltip>}>
                        <Badge bg="primary" className="ms-1 pill-round px-2" pill>
                            <span className="dottedUnderline">{props.feePPM.toNumber()/10000}%</span>
                        </Badge>
                    </OverlayTrigger>
                )}
                {props.description!=null ? (
                    <OverlayTrigger overlay={<Tooltip id={"fee-tooltip-desc-"+props.text}>
                        <span>{props.description}</span>
                    </Tooltip>}>
                        <Badge bg="primary" className="ms-1 pill-round px-2" pill>
                            <span className="dottedUnderline">?</span>
                        </Badge>
                    </OverlayTrigger>
                ) : ""}
            </span>
            <span className="ms-auto">{props.isApproximate? "~" : ""}{toHumanReadableString(props.amount, props.currency)} {props.currency.ticker}</span>
        </div>
    );
}

export function FeeSummaryScreen(props: {
    swap: ISwap,
    className?: string
}) {

    let className: string = props.className;

    if(props.swap instanceof IToBTCSwap) {
        const currency = getCurrencySpec(props.swap.getInToken());
        const btcCurrency = getCurrencySpec(props.swap.getOutToken());

        return (<div className={className}>
            <FeePart
                text="Amount"
                currency={currency}
                amount={props.swap.getInAmountWithoutFee()}
            />
            <FeePart
                text="Swap fee"
                currency={currency}
                amount={props.swap.getSwapFee().amountInSrcToken}
                feePPM={getFeePct(props.swap, 1)} feeBase={props.swap.pricingInfo.satsBaseFee} feeCurrency={btcCurrency}
            />
            <FeePart
                text="Network fee"
                currency={currency}
                amount={props.swap.getNetworkFee().amountInSrcToken}
                description={
                    props.swap instanceof ToBTCSwap ?
                        "Bitcoin transaction fee paid to bitcoin miners" :
                        "Lightning network fee paid for routing the payment through the network"
                }
            />

            <div className="d-flex fw-bold border-top border-light font-bigger">
                <span>Total:</span>
                <span className="ms-auto d-flex align-items-center">
                    <img src={currency.icon} className="currency-icon-small"/>
                    {toHumanReadableString(props.swap.getInAmount(), currency)} {currency.ticker}
                </span>
            </div>
        </div>);
    }

    const currency = getCurrencySpec(props.swap.getOutToken());
    const btcCurrency = getCurrencySpec(props.swap.getInToken());

    if(props.swap instanceof FromBTCSwap) {

        return (<div className={className}>
            <FeePart
                text="Amount"
                currency={currency}
                amount={props.swap.getOutAmount().add(props.swap.getFee().amountInDstToken)}
            />
            <FeePart
                text="Swap fee"
                currency={currency}
                amount={props.swap.getFee().amountInDstToken}
                feePPM={getFeePct(props.swap, 1)} feeBase={props.swap.pricingInfo.satsBaseFee} feeCurrency={btcCurrency}
            />
            <FeePart
                text="Watchtower fee"
                currency={getNativeCurrency()}
                amount={props.swap.getClaimerBounty()}
                description="Fee paid to swap watchtowers which automatically claim the swap for you as soon as the bitcoin transaction confirms."
            />

            <div className="d-flex fw-bold border-top border-light font-bigger">
                <span>Total:</span>
                <span className="ms-auto d-flex align-items-center">
                    <img src={currency.icon} className="currency-icon-small"/>
                    {toHumanReadableString(props.swap.getOutAmount(), currency)} {currency.ticker}
                </span>
            </div>
        </div>);
    }
    if(props.swap instanceof FromBTCLNSwap) {
        return (<div className={className}>
            <FeePart
                text="Amount"
                currency={currency}
                amount={props.swap.getOutAmount().add(props.swap.getFee().amountInDstToken)}
            />
            <FeePart
                text="Swap fee"
                currency={currency}
                amount={props.swap.getFee().amountInDstToken}
                feePPM={getFeePct(props.swap, 1)} feeBase={props.swap.pricingInfo.satsBaseFee} feeCurrency={btcCurrency}
            />

            <div className="d-flex fw-bold border-top border-light font-bigger">
                <span>Total:</span>
                <span className="ms-auto d-flex align-items-center">
                    <img src={currency.icon} className="currency-icon-small"/>
                    {toHumanReadableString(props.swap.getOutAmount(), currency)} {currency.ticker}
                </span>
            </div>
        </div>);
    }

    return null;
}