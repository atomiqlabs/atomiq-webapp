import { jsx as _jsx } from "react/jsx-runtime";
import { Button } from "react-bootstrap";
export function ButtonWithSigner(props) {
    return (_jsx(Button, { onClick: () => {
            if (props.signer === undefined) {
                //TODO: Redirect the user to connect the wallet for the specific chainId
            }
            else {
                props.onClick();
            }
        }, disabled: props.signer === null || props.disabled, size: props.size, variant: props.variant, className: props.className, children: props.signer === undefined ?
            "Connect wallet" : props.signer === null ?
            "Invalid wallet connected" : props.children }));
}
