import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Dropdown } from "react-bootstrap";
import { isSCToken } from "@atomiqlabs/sdk";
import { TokenIcon } from "./TokenIcon";
import { useMemo } from "react";
function CurrenciesEntry(props) {
    return (_jsx(_Fragment, { children: props.currencies.map(curr => {
            return (_jsxs(Dropdown.Item, { onClick: () => {
                    props.onSelect(curr);
                }, children: [_jsx(TokenIcon, { tokenOrTicker: curr, className: "currency-icon" }), curr.name] }, curr.ticker));
        }) }));
}
export function CurrencyDropdown(props) {
    //Group by chainId
    const { currenciesByChainId, chains } = useMemo(() => {
        const currenciesByChainId = {};
        if (props.currencyList != null)
            props.currencyList.forEach(currency => {
                const chainId = isSCToken(currency) ? currency.chainId : "BITCOIN";
                currenciesByChainId[chainId] ?? (currenciesByChainId[chainId] = []);
                currenciesByChainId[chainId].push(currency);
            });
        const chains = Object.keys(currenciesByChainId);
        return { currenciesByChainId, chains };
    }, [props.currencyList]);
    return (_jsxs(Dropdown, { children: [_jsxs(Dropdown.Toggle, { variant: "light", id: "dropdown-basic", size: "lg", className: "px-2 " + props.className, children: [props.value == null ? "" : _jsx(TokenIcon, { tokenOrTicker: props.value, className: "currency-icon" }), props.value == null ? "Select currency" : props.value.ticker] }), _jsx(Dropdown.Menu, { children: chains.length > 1 ? chains.map(chainId => {
                    return (_jsxs(_Fragment, { children: [_jsx(Dropdown.Header, { children: chainId }), _jsx(CurrenciesEntry, { currencies: currenciesByChainId[chainId], onSelect: props.onSelect })] }));
                }) : (_jsx(CurrenciesEntry, { currencies: props.currencyList, onSelect: props.onSelect })) })] }));
}
