import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Dropdown, Nav } from 'react-bootstrap';
import { isBtcToken, isSCToken } from '@atomiqlabs/sdk';
import { TokenIcon } from './TokenIcon';
import { useEffect, useMemo, useState } from 'react';
import { capitalizeFirstLetter } from '../utils/Utils';
import { toTokenIdentifier } from './Tokens';
function CurrenciesEntry(props) {
    return (_jsx(_Fragment, { children: props.currencies != null
            ? props.currencies.map((curr) => {
                return (_jsxs(Dropdown.Item, { onClick: () => {
                        props.onSelect(curr);
                    }, children: [_jsx(TokenIcon, { tokenOrTicker: curr, className: "currency-icon" }), curr.name] }, toTokenIdentifier(curr)));
            })
            : '' }));
}
export function CurrencyDropdown(props) {
    //Group by chainId
    const { currenciesByChainId, chains } = useMemo(() => {
        const currenciesByChainId = {};
        if (props.currencyList != null)
            props.currencyList.forEach((currency) => {
                const chainId = isSCToken(currency) ? currency.chainId : 'BITCOIN';
                currenciesByChainId[chainId] ?? (currenciesByChainId[chainId] = []);
                currenciesByChainId[chainId].push(currency);
            });
        const chains = Object.keys(currenciesByChainId);
        return { currenciesByChainId, chains };
    }, [props.currencyList]);
    const [_chainId, setChainId] = useState();
    const chainId = currenciesByChainId[_chainId] != null ? _chainId : chains?.[0];
    useEffect(() => {
        if (props.value != null)
            setChainId(isSCToken(props.value) ? props.value.chainId : 'BITCOIN');
    }, [props.value]);
    const [show, setShow] = useState();
    let currencyChainId;
    if (props.value != null) {
        if (isSCToken(props.value))
            currencyChainId = props.value.chainId;
        if (isBtcToken(props.value))
            currencyChainId = props.value.lightning ? 'LIGHTNING' : 'BITCOIN';
    }
    return (_jsxs(Dropdown, { show: show, onToggle: (val) => setShow(val), autoClose: "outside", className: "currency-dropdown", children: [_jsxs(Dropdown.Toggle, { id: "dropdown-basic", className: 'currency-dropdown__toggle ' + props.className, children: [_jsxs("div", { className: "currency-dropdown__token", children: [props.value == null ? ('') : (_jsx(TokenIcon, { tokenOrTicker: props.value, className: "currency-dropdown__token__img" })), _jsx("img", { src: '/icons/chains/' + currencyChainId + '.svg', className: "currency-dropdown__token__currency" })] }), _jsxs("div", { className: "currency-dropdown__details", children: [_jsx("div", { className: "currency-dropdown__currency", children: props.value == null ? 'Select currency' : props.value.ticker }), _jsxs("div", { className: "currency-dropdown__second", children: ["on ", currencyChainId != null ? capitalizeFirstLetter(currencyChainId) : ''] })] }), _jsx("div", { className: "currency-dropdown__dropdown icon icon-dropdown" })] }), show && _jsx("div", { className: "currency-dropdown__overlay", onClick: () => setShow(false) }), _jsxs(Dropdown.Menu, { children: [_jsx(Nav, { style: { maxWidth: '80vw' }, activeKey: chainId, onSelect: (val) => setChainId(val), children: chains.map((val) => {
                            return (_jsx(Nav.Item, { children: _jsx(Nav.Link, { eventKey: val, className: "currency-dropdown__nav-link", children: _jsx("img", { src: '/icons/chains/' + val + '.svg', className: "currency-icon-medium" }) }) }, val));
                        }) }), _jsx("div", { className: "currency-dropdown__items", children: _jsx(CurrenciesEntry, { currencies: currenciesByChainId[chainId], onSelect: (val) => {
                                setShow(false);
                                props.onSelect(val);
                            } }) })] })] }));
}
