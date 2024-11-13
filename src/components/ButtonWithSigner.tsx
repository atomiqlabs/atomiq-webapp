import {AbstractSigner} from "@atomiqlabs/sdk";
import {Button} from "react-bootstrap";

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
    return (
        <Button onClick={() => {
            if(props.signer===undefined) {
                //TODO: Redirect the user to connect the wallet for the specific chainId
            } else {
                props.onClick();
            }
        }} disabled={props.signer===null || props.disabled} size={props.size} variant={props.variant} className={props.className}>
            {props.signer===undefined ?
                "Connect wallet" : props.signer===null ?
                "Invalid wallet connected" : props.children}
        </Button>
    )
}
