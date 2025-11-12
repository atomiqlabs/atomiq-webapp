import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Dropdown, Nav } from 'react-bootstrap';
import { isSCToken } from '@atomiqlabs/sdk';
import { TokenIcon } from './TokenIcon';
import { useEffect, useMemo, useState } from 'react';
import { toTokenIdentifier } from '../../utils/Tokens';
import { useChain } from "../../hooks/chains/useChain";
export function TokensDropdown(props) {
    //Group by chainId
    const { tokensByChainId, chains } = useMemo(() => {
        const tokensByChainId = {};
        if (props.tokensList != null)
            props.tokensList.forEach((token) => {
                const chainId = isSCToken(token) ? token.chainId : 'BITCOIN';
                tokensByChainId[chainId] ?? (tokensByChainId[chainId] = []);
                tokensByChainId[chainId].push(token);
            });
        const chains = Object.keys(tokensByChainId);
        return { tokensByChainId, chains };
    }, [props.tokensList]);
    const [_chainId, setChainId] = useState();
    const chainId = tokensByChainId[_chainId] != null ? _chainId : chains?.[0];
    useEffect(() => {
        if (props.value != null)
            setChainId(isSCToken(props.value) ? props.value.chainId : 'BITCOIN');
    }, [props.value]);
    const [show, setShow] = useState();
    const [searchQuery, setSearchQuery] = useState('');
    const displayedTokens = useMemo(() => {
        const q = (searchQuery || '').trim().toLowerCase();
        if (!q) {
            return chainId && tokensByChainId[chainId] ? tokensByChainId[chainId] : [];
        }
        const list = props.tokensList ?? [];
        return list.filter((c) => {
            const t = c.ticker ? String(c.ticker).toLowerCase() : '';
            const n = c.name ? String(c.name).toLowerCase() : '';
            return t.includes(q) || n.includes(q);
        });
    }, [searchQuery, chainId, tokensByChainId, props.tokensList]);
    const tokenChain = useChain(props.value);
    return (_jsxs(Dropdown, { show: show, onToggle: (val) => setShow(val), autoClose: "outside", className: "currency-dropdown", children: [_jsxs(Dropdown.Toggle, { id: "dropdown-basic", className: 'currency-dropdown__toggle ' + props.className, children: [_jsxs("div", { className: "currency-dropdown__token", children: [props.value == null ? ('') : (_jsx(TokenIcon, { tokenOrTicker: props.value, className: "currency-dropdown__token__img" })), _jsx("img", { src: tokenChain?.chain.icon, className: "currency-dropdown__token__currency" })] }), _jsxs("div", { className: "currency-dropdown__details", children: [_jsx("div", { className: "currency-dropdown__currency", children: props.value == null ? 'Select currency' : props.value.ticker }), _jsxs("div", { className: "currency-dropdown__second", children: ["on ", tokenChain?.chain.name ?? ''] })] }), _jsx("div", { className: "currency-dropdown__dropdown icon icon-dropdown" })] }), show && _jsx("div", { className: "currency-dropdown__overlay", onClick: () => setShow(false) }), _jsxs(Dropdown.Menu, { children: [_jsx(Nav, { style: { maxWidth: '80vw' }, activeKey: chainId, onSelect: (val) => setChainId(val), children: chains.map((val) => {
                            return (_jsx(Nav.Item, { children: _jsx(Nav.Link, { eventKey: val, className: "currency-dropdown__nav-link", children: _jsx("img", { src: '/icons/chains/' + val + '.svg', className: "currency-icon-medium" }) }) }, val));
                        }) }), _jsxs("div", { className: "currency-dropdown__items", children: [_jsxs("div", { className: "currency-dropdown__search", children: [_jsx("input", { type: "text", className: "currency-dropdown__search__input form-control", placeholder: "Search tokens...", value: searchQuery ?? '', onChange: (e) => setSearchQuery(e.target.value) }), _jsx("div", { className: "icon icon-search" })] }), !!displayedTokens && displayedTokens.map(token => (_jsxs(Dropdown.Item, { onClick: () => {
                                    setShow(false);
                                    props.onSelect(token);
                                }, children: [_jsx(TokenIcon, { tokenOrTicker: token, className: "currency-icon" }), _jsx("div", { className: "sc-ticker", children: token.ticker }), _jsx("div", { className: "sc-name", children: token.name })] }, toTokenIdentifier(token))))] })] })] }));
}
