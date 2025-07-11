import {Badge, Button, Form, OverlayTrigger, Spinner, Tooltip} from "react-bootstrap";
import {CopyOverlay} from "../../components/CopyOverlay";
import {QRCodeSVG} from "qrcode.react";
import ValidatedInput, {ValidatedInputRef} from "../../components/ValidatedInput";
import Icon from "react-icons-kit";
import {clipboard} from "react-icons-kit/fa/clipboard";
import {externalLink} from 'react-icons-kit/fa/externalLink';
import * as React from "react";
import {useCallback, useContext, useEffect, useRef, useState} from "react";
import {FromBTCLNSwap, LnForGasSwap} from "@atomiqlabs/sdk";
import {ErrorAlert} from "../../components/ErrorAlert";
import {ChainDataContext} from "../../wallets/context/ChainDataContext";
import {useAsync} from "../../utils/hooks/useAsync";
import {useNFCScanner} from "../../nfc/hooks/useNFCScanner";
import {SwapsContext} from "../context/SwapsContext";
import {NFCStartResult} from "../../nfc/NFCReader";


export function LightningQR(props: {
    quote: FromBTCLNSwap | LnForGasSwap,
    payInstantly: boolean,
    setAutoClaim?: (val: boolean) => void,
    autoClaim?: boolean,
    onHyperlink?: () => void
}) {
    const {swapper} = useContext(SwapsContext);
    const lightningChainData = useContext(ChainDataContext).LIGHTNING;

    const [payingWithLNURL, setPayingWithLNURL] = useState<boolean>(false);
    const NFCScanning = useNFCScanner((address) => {
        //TODO: Maybe we need to stop the scanning here as well
        swapper.Utils.getLNURLTypeAndData(address, false).then(result => {
            if(result.type!=="withdraw") return;
            return result;
        }).then((lnurlWithdraw) => {
            return (props.quote as FromBTCLNSwap).settleWithLNURLWithdraw(lnurlWithdraw);
        }).then(() => {
            setPayingWithLNURL(true);
        });
    }, !(props.quote instanceof FromBTCLNSwap));

    const textFieldRef = useRef<ValidatedInputRef>();

    const [pay, payLoading, payResult, payError] = useAsync(
        () => lightningChainData.wallet.instance.sendPayment(props.quote.getAddress()),
        [lightningChainData.wallet, props.quote]
    );

    useEffect(() => {
        if(props.quote==null || !props.payInstantly) return;
        if(lightningChainData.wallet!=null) pay();
    }, [props.quote, props.payInstantly]);

    const qrContent = useCallback((show) => {
        return <>
            <div className="mb-2">
                <QRCodeSVG
                    value={props.quote.getHyperlink()}
                    size={300}
                    includeMargin={true}
                    className="cursor-pointer"
                    onClick={(event) => {
                        show(event.target, props.quote.getAddress(), textFieldRef.current?.input?.current);
                    }}
                    imageSettings={NFCScanning === NFCStartResult.OK ? {
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
                value={props.quote.getAddress()}
                textEnd={(
                    <a href="#" onClick={(event) => {
                        event.preventDefault();
                        show(event.target as HTMLElement, props.quote.getAddress(), textFieldRef.current?.input?.current);
                    }}>
                        <Icon icon={clipboard}/>
                    </a>
                )}
                inputRef={textFieldRef}
            />
            <div className="d-flex justify-content-center mt-2">
                <Button
                    variant="light" onClick={props.onHyperlink || (() => {
                    window.location.href = props.quote.getHyperlink();
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
            ) : lightningChainData.wallet!=null ? (
                <>
                    <ErrorAlert className="mb-2" title="Sending BTC failed" error={payError}/>

                    <div className="d-flex flex-column align-items-center justify-content-center">
                        <Button
                            variant="light" className="d-flex flex-row align-items-center" disabled={payLoading}
                            onClick={() => {
                                pay();
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
                                lightningChainData.disconnect();
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

            {lightningChainData.wallet==null && props.setAutoClaim!=null ? (
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