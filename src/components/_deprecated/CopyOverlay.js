import { jsx as _jsx } from "react/jsx-runtime";
import { TemporaryTooltip } from '../TemporaryTooltip';
import { useCallback } from 'react';
//TODO: Only used for LightningQR, which is also deprecated
export function CopyOverlay(props) {
    const showFunction = useCallback((show) => props.children((target, copyText, copyInput) => {
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
    }), [props.children]);
    return (_jsx(TemporaryTooltip, { text: "Copied to clipboard!", placement: props.placement, timeout: props.timeout, children: showFunction }));
}
