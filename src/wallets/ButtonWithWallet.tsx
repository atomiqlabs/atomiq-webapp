import {Button} from "react-bootstrap";
import {useContext} from "react";
import {ChainDataContext} from "./context/ChainDataContext";
import {ChainWalletData} from "./ChainDataProvider";

export function ButtonWithWallet(props: {
    chainId: string,
    requiredWalletAddress?: string,
    onClick?: () => void,
    disabled?: boolean,
    size?: "lg" | "sm",
    variant?: "primary" | "secondary" | "danger" | "warning" | "info",
    children?: (JSX.Element | string) | (JSX.Element | string)[],
    className?: string,
    requiresConnection?: boolean
}) {
    const chainData = useContext(ChainDataContext);
    const requestedChain: ChainWalletData<any> = chainData[props.chainId];
    const isWalletConnected = !props.requiresConnection || requestedChain?.wallet!=null;
    const isCorrectWalletConnected = requestedChain?.wallet==null || props.requiredWalletAddress==null || requestedChain?.wallet?.address===props.requiredWalletAddress;

    return (
        <Button onClick={() => {
            if(requestedChain!=null && !isWalletConnected) {
                requestedChain.connect();
            } else {
                props.onClick();
            }
        }} disabled={(isWalletConnected && !isCorrectWalletConnected) || props.disabled} size={props.size} variant={!isWalletConnected || !isCorrectWalletConnected ? "warning" : props.variant} className={props.className}>
            {!isWalletConnected ?
                "Connect "+props.chainId.charAt(0)+props.chainId.substring(1).toLowerCase()+" wallet" : !isCorrectWalletConnected ?
                "Invalid wallet connected" : props.children}
        </Button>
    )
}
