import { jsx as _jsx } from "react/jsx-runtime";
import { TokenIcons } from "../utils/Currencies";
export function TokenIcon(props) {
    return _jsx("img", { src: TokenIcons[typeof (props.tokenOrTicker) === "string" ? props.tokenOrTicker : props.tokenOrTicker.ticker], className: props.className, style: props.style });
}
