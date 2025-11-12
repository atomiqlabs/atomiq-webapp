import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BaseButton } from "../../components/BaseButton";
import { Spinner } from "react-bootstrap";
export function ConnectedWalletPayButtons(props) {
    return (_jsx("div", { className: "swap-panel__card__group", children: _jsxs("div", { className: "payment-awaiting-buttons", children: [_jsxs(BaseButton, { variant: "secondary", textSize: "sm", className: "d-flex flex-row align-items-center", disabled: props.payWithBrowserWallet.loading, onClick: props.payWithBrowserWallet.onClick, children: [props.payWithBrowserWallet.loading ? (_jsx(Spinner, { animation: "border", size: "sm", className: "mr-2" })) : (''), "Pay with", ' ', _jsx("img", { width: 20, height: 20, src: props.wallet.icon }), ' ', props.wallet.name] }), _jsx(BaseButton, { variant: "secondary", textSize: "sm", className: "d-flex flex-row align-items-center", onClick: props.useExternalWallet.onClick, children: "Use a QR/wallet address" })] }) }));
}
