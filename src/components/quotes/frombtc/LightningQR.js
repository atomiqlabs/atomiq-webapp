import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Badge, Button, Form, OverlayTrigger, Spinner, Tooltip } from "react-bootstrap";
import { CopyOverlay } from "../../CopyOverlay";
import { QRCodeSVG } from "qrcode.react";
import { LNNFCStartResult } from "../../../lnnfc/LNNFCReader";
import ValidatedInput from "../../ValidatedInput";
import Icon from "react-icons-kit";
import { clipboard } from "react-icons-kit/fa/clipboard";
import { externalLink } from 'react-icons-kit/fa/externalLink';
import { useLightningWallet } from "../../../bitcoin/lightning/useLightningWallet";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLNNFCScanner } from "../../../lnnfc/useLNNFCScanner";
import { FromBTCLNSwap } from "@atomiqlabs/sdk";
import { ErrorAlert } from "../../ErrorAlert";
export function LightningQR(props) {
    const { walletConnected, disconnect, pay, payLoading, payError } = useLightningWallet();
    const [payingWithLNURL, setPayingWithLNURL] = useState(false);
    const NFCScanning = useLNNFCScanner((result) => {
        //TODO: Maybe we need to stop the scanning here as well
        if (result.type !== "withdraw")
            return;
        props.quote.settleWithLNURLWithdraw(result).then(() => {
            setPayingWithLNURL(true);
        });
    }, !(props.quote instanceof FromBTCLNSwap));
    const textFieldRef = useRef();
    useEffect(() => {
        if (props.quote == null || !props.payInstantly)
            return;
        if (walletConnected && pay != null)
            pay(props.quote.getLightningInvoice());
    }, [props.quote, props.payInstantly]);
    const qrContent = useCallback((show) => {
        return _jsxs(_Fragment, { children: [_jsx("div", { className: "mb-2", children: _jsx(QRCodeSVG, { value: props.quote.getQrData(), size: 300, includeMargin: true, className: "cursor-pointer", onClick: (event) => {
                            show(event.target, props.quote.getLightningInvoice(), textFieldRef.current?.input?.current);
                        }, imageSettings: NFCScanning === LNNFCStartResult.OK ? {
                            src: "/icons/contactless.png",
                            excavate: true,
                            height: 50,
                            width: 50
                        } : null }) }), _jsx("label", { children: "Please initiate a payment to this lightning network invoice" }), _jsx(ValidatedInput, { type: "text", value: props.quote.getLightningInvoice(), textEnd: (_jsx("a", { href: "#", onClick: (event) => {
                            event.preventDefault();
                            show(event.target, props.quote.getLightningInvoice(), textFieldRef.current?.input?.current);
                        }, children: _jsx(Icon, { icon: clipboard }) })), inputRef: textFieldRef }), _jsx("div", { className: "d-flex justify-content-center mt-2", children: _jsxs(Button, { variant: "light", onClick: props.onHyperlink || (() => {
                            window.location.href = props.quote.getQrData();
                        }), className: "d-flex flex-row align-items-center justify-content-center", children: [_jsx(Icon, { icon: externalLink, className: "d-flex align-items-center me-2" }), " Open in Lightning wallet app"] }) })] });
    }, [props.quote, props.onHyperlink]);
    return (_jsxs("div", { className: "tab-accent mb-3", children: [payingWithLNURL ? (_jsxs("div", { className: "d-flex flex-column align-items-center justify-content-center", children: [_jsx(Spinner, { animation: "border" }), "Paying via NFC card..."] })) : walletConnected ? (_jsxs(_Fragment, { children: [_jsx(ErrorAlert, { className: "mb-2", title: "Sending BTC failed", error: payError }), _jsxs("div", { className: "d-flex flex-column align-items-center justify-content-center", children: [_jsxs(Button, { variant: "light", className: "d-flex flex-row align-items-center", disabled: payLoading, onClick: () => {
                                    pay(props.quote.getLightningInvoice());
                                }, children: [payLoading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : "", "Pay with", _jsx("img", { width: 20, height: 20, src: "/wallets/WebLN.png", className: "ms-2 me-1" }), "WebLN"] }), _jsx("small", { className: "mt-2", children: _jsx("a", { href: "#", onClick: (e) => {
                                        e.preventDefault();
                                        disconnect();
                                    }, children: "Or use a QR code/LN invoice" }) })] })] })) : (_jsx(CopyOverlay, { placement: "top", children: qrContent })), !walletConnected && props.setAutoClaim != null ? (_jsxs(Form, { className: "text-start d-flex align-items-center justify-content-center font-bigger mt-3", children: [_jsx(Form.Check // prettier-ignore
                    , { id: "autoclaim", type: "switch", onChange: (val) => props.setAutoClaim(val.target.checked), checked: props.autoClaim }), _jsx("label", { title: "", htmlFor: "autoclaim", className: "form-check-label me-2", children: "Auto-claim" }), _jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "autoclaim-pay-tooltip", children: "Automatically requests authorization of the claim transaction through your wallet as soon as the lightning payment arrives." }), children: _jsx(Badge, { bg: "primary", className: "pill-round", pill: true, children: "?" }) })] })) : ""] }));
}
