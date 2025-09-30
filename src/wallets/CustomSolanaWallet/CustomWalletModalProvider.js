import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { WalletModalContext } from '@solana/wallet-adapter-react-ui';
import { SolanaWalletModal } from './SolanaWalletModal';
export const CustomWalletModalProvider = ({ children, ...props }) => {
    const [visible, setVisible] = useState(false);
    return (_jsxs(WalletModalContext.Provider, { value: {
            visible,
            setVisible,
        }, children: [children, visible && _jsx(SolanaWalletModal, { ...props })] }));
};
