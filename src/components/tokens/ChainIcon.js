import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TokenIcon } from './TokenIcon';
import { useChain } from '../../hooks/chains/useChain';
export function ChainIcon(props) {
    const tokenChain = useChain(props.token);
    return (_jsxs("div", { className: "chain-icon", children: [_jsx(TokenIcon, { tokenOrTicker: props.token, className: "chain-icon__img" }), _jsx("img", { src: tokenChain?.chain.icon, alt: tokenChain?.chain.name, className: "chain-icon__currency" })] }));
}
