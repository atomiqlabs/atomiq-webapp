import {ProgressBar} from "react-bootstrap";
import * as React from "react";
import {getDeltaTextHours} from "../utils/Utils";

export function SwapExpiryProgressBar(props: {
    timeRemaining: number,
    totalTime: number,
    expired?: boolean,
    show?: boolean,
    expiryText?: string,
    quoteAlias?: string
}) {
    const timeRemaining = Math.max(0, props.timeRemaining ?? 0);
    return (
        <div className={props.show===false ? "d-none" : "d-flex flex-column mb-3 tab-accent"}>
            {props.expired ? (
                <label>{props.expiryText ?? "Quote expired!"}</label>
            ) : (
                <label>{props.quoteAlias ?? "Quote"} expires in {getDeltaTextHours(timeRemaining*1000)}</label>
            )}
            <ProgressBar animated now={timeRemaining} max={props.totalTime} min={0}/>
        </div>
    );
}
