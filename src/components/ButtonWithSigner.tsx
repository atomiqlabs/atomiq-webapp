import {Button} from "react-bootstrap";
import {useWalletModal} from "@solana/wallet-adapter-react-ui";
import {useContext} from "react";
import {StarknetWalletContext} from "../context/StarknetWalletContext";
import {BitcoinWalletContext} from "../context/BitcoinWalletProvider";

export function ButtonWithSigner<T>(props: {
    chainId: string,
    signer: undefined | null | T,
    onClick?: () => void,
    disabled?: boolean,
    size?: "lg" | "sm",
    variant?: "primary" | "secondary" | "danger" | "warning" | "info",
    children?: (JSX.Element | string) | (JSX.Element | string)[],
    className?: string
}) {
    const { setVisible: setModalVisible } = useWalletModal();
    const {connect: connectStarknet} = useContext(StarknetWalletContext);
    const {connect: connectBitcoin} = useContext(BitcoinWalletContext);
    return (
        <Button onClick={() => {
            if(props.signer===undefined) {
                //TODO: Redirect the user to connect the wallet for the specific chainId
                switch(props.chainId) {
                    case "STARKNET":
                        connectStarknet();
                        break;
                    case "SOLANA":
                        setModalVisible(true);
                        break;
                    case "BITCOIN":
                        connectBitcoin();
                        break;
                }
            } else {
                props.onClick();
            }
        }} disabled={props.signer===null || props.disabled} size={props.size} variant={props.signer===undefined ? "warning" : props.variant} className={props.className}>
            {props.signer===undefined ?
                "Connect "+props.chainId.charAt(0)+props.chainId.substring(1).toLowerCase()+" wallet" : props.signer===null ?
                "Invalid wallet connected" : props.children}
        </Button>
    )
}
