import {AbstractSigner} from "@atomiqlabs/sdk";
import {Button} from "react-bootstrap";
import {useWalletModal} from "@solana/wallet-adapter-react-ui";
import {useStarknetWalletContext} from "../utils/useStarknetWalletContext";
import {useContext} from "react";
import {StarknetWalletContext} from "../context/StarknetWalletContext";

export function ButtonWithSigner(props: {
    chainId: string,
    signer: undefined | null | AbstractSigner,
    onClick?: () => void,
    disabled?: boolean,
    size?: "lg" | "sm",
    variant?: "primary" | "secondary" | "danger" | "warning" | "info",
    children?: (JSX.Element | string) | (JSX.Element | string)[],
    className?: string
}) {
    const { setVisible: setModalVisible } = useWalletModal();
    const {connect} = useContext(StarknetWalletContext);
    return (
        <Button onClick={() => {
            if(props.signer===undefined) {
                //TODO: Redirect the user to connect the wallet for the specific chainId
                switch(props.chainId) {
                    case "STARKNET":
                        connect();
                        break;
                    case "SOLANA":
                        setModalVisible(true);
                        break;
                }
            } else {
                props.onClick();
            }
        }} disabled={props.signer===null || props.disabled} size={props.size} variant={props.signer===undefined ? "warning" : props.variant} className={props.className}>
            {props.signer===undefined ?
                "Connect wallet" : props.signer===null ?
                "Invalid wallet connected" : props.children}
        </Button>
    )
}
