import {FromBTCSwap, IFromBTCSwap, ISwap, IToBTCSwap, SwapType, Token, TokenAmount} from "@atomiqlabs/sdk";
import {
    toHumanReadableString
} from "../../utils/Currencies";
import * as BN from "bn.js";
import {Badge, OverlayTrigger, Tooltip} from "react-bootstrap";
import * as React from "react";
import {getFeePct} from "../../utils/Utils";
import {TokenIcon} from "../TokenIcon";

function FeePart(props: {
    text: string,
    isApproximate?: boolean,

    amount: TokenAmount,

    className?: string,

    feePPM?: BN,
    feeBase?: BN,
    feeCurrency?: Token,

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
            <span className="ms-auto">{props.isApproximate? "~" : ""}{props.amount.amount} {props.amount.token.ticker}</span>
        </div>
    );
}

export function FeeSummaryScreen(props: {
    swap: ISwap,
    className?: string
}) {

    let className: string = props.className;

    if(props.swap.getType()===SwapType.TO_BTC || props.swap.getType()===SwapType.TO_BTCLN) {
        const input = props.swap.getInput();

        return (<div className={className}>
            <FeePart
                text="Amount"
                amount={props.swap.getInputWithoutFee()}
            />
            <FeePart
                text="Swap fee"
                amount={props.swap.getSwapFee().amountInSrcToken}
                feePPM={getFeePct(props.swap, 1)} feeBase={props.swap.pricingInfo.satsBaseFee}
                feeCurrency={props.swap.getOutput().token}
            />
            <FeePart
                text="Network fee"
                amount={(props.swap as IToBTCSwap).getNetworkFee().amountInSrcToken}
                description={
                    props.swap.getType()===SwapType.TO_BTC ?
                        "Bitcoin transaction fee paid to bitcoin miners" :
                        "Lightning network fee paid for routing the payment through the network"
                }
            />

            <div className="d-flex fw-bold border-top border-light font-bigger">
                <span>Total:</span>
                <span className="ms-auto d-flex align-items-center">
                    <TokenIcon tokenOrTicker={input.token} className="currency-icon-small"/>
                    {input.amount} {input.token.ticker}
                </span>
            </div>
        </div>);
    }

    if(props.swap.getType()===SwapType.FROM_BTC) {
        const output = props.swap.getOutput();

        return (<div className={className}>
            <FeePart
                text="Amount"
                amount={(props.swap as IFromBTCSwap).getOutputWithoutFee()}
            />
            <FeePart
                text="Swap fee"
                amount={props.swap.getFee().amountInDstToken}
                feePPM={getFeePct(props.swap, 1)} feeBase={props.swap.pricingInfo.satsBaseFee}
                feeCurrency={props.swap.getInput().token}
            />
            <FeePart
                text="Watchtower fee"
                amount={(props.swap as FromBTCSwap).getClaimerBounty()}
                description="Fee paid to swap watchtowers which automatically claim the swap for you as soon as the bitcoin transaction confirms."
            />

            <div className="d-flex fw-bold border-top border-light font-bigger">
                <span>Total:</span>
                <span className="ms-auto d-flex align-items-center">
                    <TokenIcon tokenOrTicker={output.token} className="currency-icon-small"/>
                    {output.amount} {output.token.ticker}
                </span>
            </div>
        </div>);
    }
    if(props.swap.getType()===SwapType.FROM_BTCLN) {
        const output = props.swap.getOutput();

        return (<div className={className}>
            <FeePart
                text="Amount"
                amount={(props.swap as IFromBTCSwap).getOutputWithoutFee()}
            />
            <FeePart
                text="Swap fee"
                amount={props.swap.getFee().amountInDstToken}
                feePPM={getFeePct(props.swap, 1)} feeBase={props.swap.pricingInfo.satsBaseFee}
                feeCurrency={props.swap.getInput().token}
            />

            <div className="d-flex fw-bold border-top border-light font-bigger">
                <span>Total:</span>
                <span className="ms-auto d-flex align-items-center">
                    <TokenIcon tokenOrTicker={output.token} className="currency-icon-small"/>
                    {output.amount} {output.token.ticker}
                </span>
            </div>
        </div>);
    }

    return null;
}