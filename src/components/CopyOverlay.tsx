import {Placement} from "react-bootstrap/types";
import {TemporaryOverlay} from "./TemporaryOverlay";

export function CopyOverlay(props: {
    children?: (show: (target: HTMLElement, copyText: string, copyInput?: HTMLInputElement | HTMLTextAreaElement) => void) => JSX.Element | JSX.Element[];
    placement: Placement,
    timeout?: number
}) {
    return (
        <TemporaryOverlay text="Copied to clipboard!" placement={props.placement} timeout={props.timeout}>
            {(show) => props.children((target: HTMLElement, copyText: string, copyInput?: HTMLInputElement | HTMLTextAreaElement) => {
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
            })}
        </TemporaryOverlay>
    )
}