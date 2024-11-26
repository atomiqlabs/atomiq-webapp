import {Alert, OverlayTrigger, Tooltip} from "react-bootstrap";
import Icon from "react-icons-kit";
import {ic_content_copy} from "react-icons-kit/md/ic_content_copy";
import * as React from "react";


export function ErrorAlert(props: {
    error: any,
    clearError?: () => void
}) {
    return (
        <Alert className="text-center" show={props.error!=null} variant="danger" onClose={props.clearError}>
            <div className="d-flex align-items-center justify-content-center">
                <strong>Quoting error</strong>
                <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip id="scan-qr-tooltip">Copy full error stack</Tooltip>}
                >
                    <a href="#" className="d-inline-flex align-items-center justify-content-middle"
                       onClick={(evnt) => {
                           evnt.preventDefault();
                           // @ts-ignore
                           navigator.clipboard.writeText(JSON.stringify({
                               error: props.error.name,
                               message: props.error.message,
                               stack: props.error.stack
                           }, null, 4));
                       }}><Icon className="ms-1 mb-1" size={16} icon={ic_content_copy}/></a>
                </OverlayTrigger>
            </div>
            <label>
                {props.error?.message || props.error?.toString()}
            </label>
        </Alert>
    )
}
