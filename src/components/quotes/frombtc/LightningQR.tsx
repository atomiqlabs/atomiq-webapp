import {Badge, Button, Form, OverlayTrigger, Spinner, Tooltip} from "react-bootstrap";
import {CopyOverlay} from "../../CopyOverlay";
import {QRCodeSVG} from "qrcode.react";
import {LNNFCStartResult} from "../../../lnnfc/LNNFCReader";
import ValidatedInput, {ValidatedInputRef} from "../../ValidatedInput";
import Icon from "react-icons-kit";
import {clipboard} from "react-icons-kit/fa/clipboard";
import {externalLink} from 'react-icons-kit/fa/externalLink';
import * as React from "react";
import {useLightningWallet} from "../../../bitcoin/lightning/useLightningWallet";
import {useCallback, useEffect, useRef, useState} from "react";
import {useLNNFCScanner} from "../../../lnnfc/useLNNFCScanner";
import {FromBTCLNSwap, LnForGasSwap, LNURLWithdraw} from "@atomiqlabs/sdk";
import {ErrorAlert} from "../../ErrorAlert";


export function LightningQR(props: {
    quote: FromBTCLNSwap | LnForGasSwap,
    payInstantly: boolean,
    setAutoClaim?: (val: boolean) => void,
    autoClaim?: boolean,
    onHyperlink?: () => void
}) {

    const {walletConnected, disconnect, pay, payLoading, payError} = useLightningWallet();

    const [payingWithLNURL, setPayingWithLNURL] = useState<boolean>(false);
    const NFCScanning = useLNNFCScanner((result) => {
        //TODO: Maybe we need to stop the scanning here as well
        if(result.type!=="withdraw") return;
        (props.quote as FromBTCLNSwap).settleWithLNURLWithdraw(result as LNURLWithdraw).then(() => {
            setPayingWithLNURL(true);
        });
    }, !(props.quote instanceof FromBTCLNSwap));

    const textFieldRef = useRef<ValidatedInputRef>();

    useEffect(() => {
        if(props.quote==null || !props.payInstantly) return;
        if(walletConnected && pay!=null) pay(props.quote.getLightningInvoice());
    }, [props.quote, props.payInstantly]);

    const qrContent = useCallback((show) => {
        return <>
            <div className="mb-2">
                <QRCodeSVG
                    value={props.quote.getQrData()}
                    size={300}
                    includeMargin={true}
                    className="cursor-pointer"
                    onClick={(event) => {
                        show(event.target, props.quote.getLightningInvoice(), textFieldRef.current?.input?.current);
                    }}
                    imageSettings={NFCScanning === LNNFCStartResult.OK ? {
                        src: "/icons/contactless.png",
                        excavate: true,
                        height: 50,
                        width: 50
                    } : null}
                />
            </div>
            <label>Please initiate a payment to this lightning network invoice</label>
            <ValidatedInput
                type={"text"}
                value={props.quote.getLightningInvoice()}
                textEnd={(
                    <a href="#" onClick={(event) => {
                        event.preventDefault();
                        show(event.target as HTMLElement, props.quote.getLightningInvoice(), textFieldRef.current?.input?.current);
                    }}>
                        <Icon icon={clipboard}/>
                    </a>
                )}
                inputRef={textFieldRef}
            />
            <div className="d-flex justify-content-center mt-2">
                <Button
                    variant="light" onClick={props.onHyperlink || (() => {
                    window.location.href = props.quote.getQrData();
                })}
                    className="d-flex flex-row align-items-center justify-content-center"
                >
                    <Icon icon={externalLink} className="d-flex align-items-center me-2"/> Open in Lightning wallet app
                </Button>
            </div>
        </>;
    }, [props.quote, props.onHyperlink]);

    return (
        <div className="tab-accent mb-3">
            {payingWithLNURL ? (
                <div className="d-flex flex-column align-items-center justify-content-center">
                    <Spinner animation="border"/>
                    Paying via NFC card...
                </div>
            ) : walletConnected ? (
                <>
                    <ErrorAlert className="mb-2" title="Sending BTC failed" error={payError}/>

                    <div className="d-flex flex-column align-items-center justify-content-center">
                        <Button
                            variant="light" className="d-flex flex-row align-items-center" disabled={payLoading}
                            onClick={() => {
                                pay(props.quote.getLightningInvoice());
                            }}
                        >
                            {payLoading ? <Spinner animation="border" size="sm" className="mr-2"/> : ""}
                            Pay with
                            <img width={20} height={20} src="/wallets/WebLN.png" className="ms-2 me-1"/>
                            WebLN
                        </Button>
                        <small className="mt-2">
                            <a href="#" onClick={(e) => {
                                e.preventDefault();
                                disconnect();
                            }}>
                                Or use a QR code/LN invoice
                            </a>
                        </small>
                    </div>
                </>
            ) : (
                <CopyOverlay placement="top">
                    {qrContent}
                </CopyOverlay>
            )}

            {!walletConnected && props.setAutoClaim!=null ? (
                <Form className="text-start d-flex align-items-center justify-content-center font-bigger mt-3">
                    <Form.Check // prettier-ignore
                        id="autoclaim"
                        type="switch"
                        onChange={(val) => props.setAutoClaim(val.target.checked)}
                        checked={props.autoClaim}
                    />
                    <label title="" htmlFor="autoclaim" className="form-check-label me-2">Auto-claim</label>
                    <OverlayTrigger overlay={<Tooltip id="autoclaim-pay-tooltip">
                        Automatically requests authorization of the claim transaction through your wallet as soon as the
                        lightning payment arrives.
                    </Tooltip>}>
                        <Badge bg="primary" className="pill-round" pill>?</Badge>
                    </OverlayTrigger>
                </Form>
            ) : ""}

        </div>
    );
}