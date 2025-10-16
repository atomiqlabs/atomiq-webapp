import { jsx as _jsx } from "react/jsx-runtime";
import { useContext } from 'react';
import { ChainDataContext } from './context/ChainDataContext';
import { BaseButton } from '../components/BaseButton';
export function ButtonWithWallet(props) {
    const chainData = useContext(ChainDataContext);
    const requestedChain = chainData.chains[props.chainId];
    const isWalletConnected = requestedChain?.wallet != null;
    const isCorrectWalletConnected = props.requiredWalletAddress == null ||
        requestedChain?.wallet?.address === props.requiredWalletAddress;
    return (_jsx(BaseButton, { onClick: () => {
            if (requestedChain != null && !isWalletConnected) {
                chainData.connectWallet(props.chainId);
            }
            else {
                props.onClick();
            }
        }, disabled: (isWalletConnected && !isCorrectWalletConnected) || props.disabled, size: props.size, variant: "primary", className: props.className, children: !isWalletConnected
            ? 'Connect ' +
                props.chainId.charAt(0) +
                props.chainId.substring(1).toLowerCase() +
                ' wallet'
            : !isCorrectWalletConnected
                ? 'Invalid wallet connected'
                : props.children }));
}
