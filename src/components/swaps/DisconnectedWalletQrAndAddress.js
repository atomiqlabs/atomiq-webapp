import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BaseButton } from '../common/BaseButton';
import { Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { TemporaryTooltip } from '../TemporaryTooltip';
export function DisconnectedWalletQrAndAddress(props) {
    const addressContent = useCallback((show) => (_jsxs("div", { className: "swap-panel__card__group", children: [!!props.alert && (_jsxs("div", { className: "alert-message is-warning mb-3", children: [_jsx("i", { className: "alert-message__icon icon icon-Notice" }), _jsx("div", { className: "alert-message__body", children: props.alert })] })), _jsx(QRCodeSVG, { value: props.address.hyperlink, size: 240, includeMargin: true, className: "cursor-pointer", onClick: (event) => {
                    if (props.address.copy())
                        show(event.target);
                }, imageSettings: props.nfcScanning
                    ? {
                        src: '/icons/contactless.png',
                        excavate: true,
                        height: 50,
                        width: 50,
                    }
                    : null }), _jsxs("div", { className: "wallet-address-preview", children: [_jsxs("div", { className: "wallet-address-preview__content", children: [_jsx("div", { className: "wallet-address-preview__title", children: props.address.description }), _jsxs("div", { className: "wallet-address-preview__address", children: [_jsx("div", { className: "sc-text", children: props.address.value }), _jsx("div", { className: "wallet-address-preview__indicator" })] })] }), _jsx("div", { className: "wallet-address-preview__action", onClick: (event) => {
                            if (props.address.copy())
                                show(event.target);
                        }, children: _jsx("div", { className: "icon icon-copy" }) })] }), _jsxs("div", { className: "payment-awaiting-buttons", children: [_jsx(BaseButton, { variant: "secondary", onClick: props.payWithBrowserWallet.onClick, disabled: props.payWithBrowserWallet.loading, children: typeof props.payWithBrowserWallet.text === 'string' ? (_jsxs(_Fragment, { children: [_jsx("i", { className: "icon icon-new-window" }), _jsx("div", { className: "sc-text", children: props.payWithBrowserWallet.text })] })) : (props.payWithBrowserWallet.text) }), _jsx(BaseButton, { variant: "secondary", onClick: props.payWithDeeplink.onClick, children: typeof props.payWithDeeplink.text === 'string' ? (_jsxs(_Fragment, { children: [_jsx("i", { className: "icon icon-new-window" }), _jsx("div", { className: "sc-text", children: props.payWithDeeplink.text })] })) : (props.payWithDeeplink.text) })] })] })), [
        props.payWithDeeplink,
        props.payWithBrowserWallet,
        props.address,
        props.alert,
        props.nfcScanning,
    ]);
    return (_jsxs(_Fragment, { children: [_jsx(TemporaryTooltip, { placement: "top", text: "Copied to clipboard!", children: addressContent }), !!props.autoClaim && (_jsx("div", { className: "swap-panel__card__group", children: _jsxs(Form, { className: "auto-claim", children: [_jsxs("div", { className: "auto-claim__label", children: [_jsx("label", { title: "", htmlFor: "autoclaim", className: "form-check-label", children: "Auto-claim" }), _jsx(OverlayTrigger, { overlay: _jsx(Tooltip, { id: "autoclaim-pay-tooltip", children: "Automatically requests authorization of the claim transaction through your wallet as soon as the lightning payment arrives." }), children: _jsx("i", { className: "icon icon-info" }) })] }), _jsx(Form.Check // prettier-ignore
                        , { id: "autoclaim", type: "switch", onChange: (val) => props.autoClaim.onChange(val.target.checked), checked: props.autoClaim.value })] }) }))] }));
}
