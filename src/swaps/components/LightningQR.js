import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Badge, Form, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { CopyOverlay } from '../../components/CopyOverlay';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useContext, useEffect, useState } from 'react';
import { FromBTCLNSwap } from '@atomiqlabs/sdk';
import { ChainDataContext } from '../../wallets/context/ChainDataContext';
import { useAsync } from '../../utils/hooks/useAsync';
import { useNFCScanner } from '../../nfc/hooks/useNFCScanner';
import { SwapsContext } from '../context/SwapsContext';
import { NFCStartResult } from '../../nfc/NFCReader';
import { useChain } from '../../wallets/hooks/useChain';
import { BaseButton } from '../../components/BaseButton';
import { SwapStepAlert } from './SwapStepAlert';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { WalletAddressPreview } from '../../components/WalletAddressPreview';
import { AlertMessage } from '../../components/AlertMessage';
export function LightningQR(props) {
    const { swapper } = useContext(SwapsContext);
    const { disconnectWallet } = useContext(ChainDataContext);
    const lightningChainData = useChain('LIGHTNING');
    const [payingWithLNURL, setPayingWithLNURL] = useState(false);
    const NFCScanning = useNFCScanner((address) => {
        //TODO: Maybe we need to stop the scanning here as well
        swapper.Utils.getLNURLTypeAndData(address, false)
            .then((result) => {
            if (result.type !== 'withdraw')
                return;
            return result;
        })
            .then((lnurlWithdraw) => {
            return props.quote.settleWithLNURLWithdraw(lnurlWithdraw);
        })
            .then(() => {
            setPayingWithLNURL(true);
        });
    }, !(props.quote instanceof FromBTCLNSwap));
    const [pay, payLoading, payResult, payError] = useAsync(() => lightningChainData.wallet.instance.sendPayment(props.quote.getAddress()), [lightningChainData.wallet, props.quote]);
    useEffect(() => {
        if (props.quote == null || !props.payInstantly)
            return;
        if (lightningChainData.wallet != null)
            pay();
    }, [props.quote, props.payInstantly]);
    const qrContent = useCallback((show) => {
        return (_jsxs(_Fragment, { children: [_jsxs(AlertMessage, { variant: "warning", className: "mb-3", children: ["Please initiate a payment to this ", _jsx("strong", { children: "Lightning Network invoice" })] }), _jsx(QRCodeSVG, { value: props.quote.getHyperlink(), size: 240, includeMargin: true, className: "cursor-pointer", onClick: (event) => {
                        show(event.target, props.quote.getAddress());
                    }, imageSettings: NFCScanning === NFCStartResult.OK
                        ? {
                            src: '/icons/contactless.png',
                            excavate: true,
                            height: 50,
                            width: 50,
                        }
                        : null }), _jsx(WalletAddressPreview, { address: props.quote.getAddress(), chainName: "Lightning Network", numberName: 'invoice', onCopy: () => {
                        // Optional: Add any copy callback logic here
                    } }), _jsx("div", { className: "payment-awaiting-buttons", children: _jsxs(BaseButton, { variant: "secondary", onClick: props.onHyperlink ||
                            (() => {
                                window.location.href = props.quote.getHyperlink();
                            }), children: [_jsx("i", { className: "icon icon-new-window" }), _jsx("div", { className: "sc-text", children: "Open in Lightning Wallet" })] }) })] }));
    }, [props.quote, props.onHyperlink, NFCScanning]);
    return (_jsxs("div", { children: [payingWithLNURL ? (_jsxs("div", { className: "d-flex flex-column align-items-center justify-content-center", children: [_jsx(Spinner, { animation: "border" }), "Paying via NFC card..."] })) : lightningChainData.wallet != null ? (_jsxs(_Fragment, { children: [_jsx(SwapStepAlert, { show: !!payError, type: "error", icon: ic_warning, title: "Sending Lightning payment failed", description: payError?.message || payError?.toString(), error: payError, className: "mb-4 mt-0" }), _jsxs("div", { className: "payment-awaiting-buttons", children: [_jsxs(BaseButton, { variant: "secondary", textSize: "sm", className: "d-flex flex-row align-items-center", disabled: payLoading, onClick: () => {
                                    pay();
                                }, children: [payLoading ? _jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" }) : '', _jsx("img", { width: 20, height: 20, src: "/wallets/WebLN.png", className: "ms-2 me-1" }), "Pay with WebLN"] }), _jsx(BaseButton, { variant: "secondary", textSize: "sm", className: "d-flex flex-row align-items-center", onClick: () => {
                                    disconnectWallet('LIGHTNING');
                                }, children: "Or use a QR code/LN invoice" })] })] })) : (_jsx(CopyOverlay, { placement: "top", children: qrContent })), lightningChainData.wallet == null && props.setAutoClaim != null ? (_jsxs(Form, { className: "text-start d-flex align-items-center justify-content-center font-bigger mt-3", children: [_jsx(Form.Check // prettier-ignore
                    , { id: "autoclaim", type: "switch", onChange: (val) => props.setAutoClaim(val.target.checked), checked: props.autoClaim }), _jsx("label", { title: "", htmlFor: "autoclaim", className: "form-check-label me-2", children: "Auto-claim" }), _jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "autoclaim-pay-tooltip", children: "Automatically requests authorization of the claim transaction through your wallet as soon as the lightning payment arrives." }), children: _jsx(Badge, { bg: "primary", className: "pill-round", pill: true, children: "?" }) })] })) : ('')] }));
}
