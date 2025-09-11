import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { WalletIcon } from '@solana/wallet-adapter-react-ui';
export const CustomWalletListItem = ({ handleClick, tabIndex, wallet, }) => {
    return (_jsx("li", { children: _jsxs("button", { className: "wallet-modal__item", onClick: handleClick, tabIndex: tabIndex, children: [_jsx(WalletIcon, { className: "wallet-modal__item__icon", wallet: wallet }), wallet.readyState !== WalletReadyState.Installed ? 'Install ' : '', wallet.adapter.name, wallet.readyState === WalletReadyState.Installed && (_jsx("div", { className: "wallet-modal__item__status", children: "Installed TODO connect s argumentom" }))] }) }));
};
