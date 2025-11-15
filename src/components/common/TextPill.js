import { jsx as _jsx } from "react/jsx-runtime";
export function TextPill(props) {
    return _jsx("div", { className: `text-pill text-pill--${props.variant}`, children: props.children });
}
