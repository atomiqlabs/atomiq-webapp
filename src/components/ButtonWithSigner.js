import { jsx as _jsx } from "react/jsx-runtime";
import { Button } from "react-bootstrap";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useContext } from "react";
import { StarknetWalletContext } from "../context/StarknetWalletContext";
export function ButtonWithSigner(props) {
    const { setVisible: setModalVisible } = useWalletModal();
    const { connect } = useContext(StarknetWalletContext);
    return (_jsx(Button, { onClick: () => {
            if (props.signer === undefined) {
                //TODO: Redirect the user to connect the wallet for the specific chainId
                switch (props.chainId) {
                    case "STARKNET":
                        connect();
                        break;
                    case "SOLANA":
                        setModalVisible(true);
                        break;
                }
            }
            else {
                props.onClick();
            }
        }, disabled: props.signer === null || props.disabled, size: props.size, variant: props.signer === undefined ? "warning" : props.variant, className: props.className, children: props.signer === undefined ?
            "Connect wallet" : props.signer === null ?
            "Invalid wallet connected" : props.children }));
}
