import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { WalletIcon } from '@solana/wallet-adapter-react-ui';
export const CustomWalletListItem = ({ handleClick, tabIndex, wallet, }) => {
    return (_jsx("li", { children: _jsxs("button", { onClick: handleClick, tabIndex: tabIndex, children: [_jsx(WalletIcon, { wallet: wallet }), wallet.adapter.name, wallet.readyState === WalletReadyState.Installed && _jsx("span", { children: "Detected" })] }) }));
};
