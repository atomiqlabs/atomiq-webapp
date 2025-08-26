import { jsx as _jsx } from "react/jsx-runtime";
import { Button } from "react-bootstrap";
import { useContext } from "react";
import { ChainDataContext } from "./context/ChainDataContext";
export function ButtonWithWallet(props) {
    const chainData = useContext(ChainDataContext);
    const requestedChain = chainData[props.chainId];
    const isWalletConnected = !props.requiresConnection || requestedChain?.wallet != null;
    const isCorrectWalletConnected = requestedChain?.wallet == null || props.requiredWalletAddress == null || requestedChain?.wallet?.address === props.requiredWalletAddress;
    return (_jsx(Button, { onClick: () => {
            if (requestedChain != null && !isWalletConnected) {
                requestedChain.connect();
            }
            else {
                props.onClick();
            }
        }, disabled: (isWalletConnected && !isCorrectWalletConnected) || props.disabled, size: props.size, variant: !isWalletConnected || !isCorrectWalletConnected ? "warning" : props.variant, className: props.className, children: !isWalletConnected ?
            "Connect " + props.chainId.charAt(0) + props.chainId.substring(1).toLowerCase() + " wallet" : !isCorrectWalletConnected ?
            "Invalid wallet connected" : props.children }));
}
