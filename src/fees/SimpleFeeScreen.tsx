import {
    ISwap,
    Token,
} from "@atomiqlabs/sdk";
import * as React from "react";
import {Accordion, Badge, OverlayTrigger, Spinner, Tooltip} from "react-bootstrap";
import Icon from "react-icons-kit";
import {ic_receipt_outline} from 'react-icons-kit/md/ic_receipt_outline';
import {TokenIcon} from "../tokens/TokenIcon";
import {FeeDetails, useSwapFees} from "./hooks/useSwapFees";


function FeePart(props: FeeDetails) {
    return (
        <div className={"d-flex font-medium " + props.className}>
            <small className="d-flex align-items-center">
                {props.description == null ? props.text : (
                    <OverlayTrigger overlay={<Tooltip id={"fee-tooltip-desc-" + props.text}>
                        <span>{props.description}</span>
                    </Tooltip>}>
                        <span className="dottedUnderline">{props.text}</span>
                    </OverlayTrigger>
                )}
                {props.composition == null ? "" : (
                    <OverlayTrigger overlay={<Tooltip id={"fee-tooltip-" + props.text}>
                        <span>{(Math.round(props.composition.percentage.percentage*10)/10).toFixed(1)}% + {props.composition.base.amount} {props.composition.base.token.ticker}</span>
                    </Tooltip>}>
                        <Badge bg="primary" className="ms-1 pill-round px-2" pill>
                            <span className="text-decoration-dotted">{(Math.round(props.composition.percentage.percentage*10)/10).toFixed(1)}%</span>
                        </Badge>
                    </OverlayTrigger>
                )}
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

export function SimpleFeeSummaryScreen(props: {
    swap: ISwap,
    btcFeeRate?: number,
    className?: string
}) {
    const {fees, totalUsdFee} = useSwapFees(props.swap, props.btcFeeRate);

    const inputToken: Token = props.swap?.getInput().token;
    const outputToken: Token = props.swap?.getOutput().token;

    return (
        <Accordion>
            <Accordion.Item eventKey="0" className="tab-accent-nop">
                <Accordion.Header className="font-bigger d-flex flex-row" bsPrefix="fee-accordion-header">
                    <small className="me-auto">
                        1 {outputToken.ticker} = {props.swap.getPriceInfo().swapPrice.toFixed(inputToken.displayDecimals ?? inputToken.decimals)} {inputToken.ticker}
                    </small>
                    <Icon className="d-flex me-1" size={16} icon={ic_receipt_outline}/>
                    <span className="me-2">{totalUsdFee==null ? (
                        <Spinner animation="border" size="sm" />
                    ) : "$" + totalUsdFee.toFixed(2)}</span>
                </Accordion.Header>
                <Accordion.Body className="p-2">
                    {fees.map((e, index) => <FeePart key={index} {...e}/>)}
                </Accordion.Body>
            </Accordion.Item>
        </Accordion>
    );
}