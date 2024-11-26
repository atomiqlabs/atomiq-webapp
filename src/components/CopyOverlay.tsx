import {Placement} from "react-bootstrap/types";
import {TemporaryOverlay} from "./TemporaryOverlay";
import {useCallback} from "react";

export function CopyOverlay(props: {
    children?: (show: (target: HTMLElement, copyText: string, copyInput?: HTMLInputElement | HTMLTextAreaElement) => void) => JSX.Element | JSX.Element[];
    placement: Placement,
    timeout?: number
}) {
    const showFunction = useCallback((show) => props.children((target: HTMLElement, copyText: string, copyInput?: HTMLInputElement | HTMLTextAreaElement) => {
        try {
            // @ts-ignore
            navigator.clipboard.writeText(copyText);
        } catch (e) {
            console.error(e);
        }

        if(copyInput!=null) try {
            // @ts-ignore
            copyInput.select();
            // @ts-ignore
            document.execCommand('copy');
            // @ts-ignore
            copyInput.blur();
        } catch (e) {
            console.error(e);
        }

        show(target);
    }), [props.children]);

    return (
        <TemporaryOverlay text="Copied to clipboard!" placement={props.placement} timeout={props.timeout}>
            {showFunction}
        </TemporaryOverlay>
    )
}