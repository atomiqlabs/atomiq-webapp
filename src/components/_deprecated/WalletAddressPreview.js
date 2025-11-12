import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import classNames from 'classnames';
//TODO: Only used for LightningQR, which is also deprecated
export function WalletAddressPreview(props) {
    const { address, chainName, className, onCopy, showIndicator = true, numberName = 'wallet address', } = props;
    const handleCopy = () => {
        navigator.clipboard.writeText(address);
        if (onCopy) {
            onCopy();
        }
    };
    const componentClassName = classNames('wallet-address-preview', className);
    return (_jsxs("div", { className: componentClassName, children: [_jsxs("div", { className: "wallet-address-preview__content", children: [_jsxs("div", { className: "wallet-address-preview__title", children: [chainName, " ", numberName] }), _jsxs("div", { className: "wallet-address-preview__address", children: [_jsx("div", { className: "sc-text", children: address }), showIndicator && _jsx("div", { className: "wallet-address-preview__indicator" })] })] }), _jsx("div", { className: "wallet-address-preview__action", onClick: handleCopy, children: _jsx("div", { className: "icon icon-copy" }) })] }));
}
