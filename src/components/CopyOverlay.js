import { jsx as _jsx } from "react/jsx-runtime";
import { TemporaryOverlay } from "./TemporaryOverlay";
export function CopyOverlay(props) {
    return (_jsx(TemporaryOverlay, { text: "Copied to clipboard!", placement: props.placement, timeout: props.timeout, children: (show) => props.children((target, copyText, copyInput) => {
            try {
                // @ts-ignore
                navigator.clipboard.writeText(copyText);
            }
            catch (e) {
                console.error(e);
            }
            if (copyInput != null)
                try {
                    // @ts-ignore
                    copyInput.select();
                    // @ts-ignore
                    document.execCommand('copy');
                    // @ts-ignore
                    copyInput.blur();
                }
                catch (e) {
                    console.error(e);
                }
            show(target);
        }) }));
}
