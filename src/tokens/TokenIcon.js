import { jsx as _jsx } from "react/jsx-runtime";
import { TokenIcons, TokenIconsChainSpecific } from "./Tokens";
import { isSCToken } from "@atomiqlabs/sdk";
function getTokenIconUrl(tokenOrTicker) {
    if (typeof (tokenOrTicker) === "string")
        return TokenIcons[tokenOrTicker];
    if (!isSCToken(tokenOrTicker))
        return TokenIcons[tokenOrTicker.ticker];
    return TokenIconsChainSpecific[tokenOrTicker.chainId]?.[tokenOrTicker.ticker] ?? TokenIcons[tokenOrTicker.ticker];
}
export function TokenIcon(props) {
    return _jsx("img", { src: getTokenIconUrl(props.tokenOrTicker), className: props.className, style: props.style });
}
