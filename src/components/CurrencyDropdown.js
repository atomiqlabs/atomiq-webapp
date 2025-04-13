import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Dropdown, Nav } from "react-bootstrap";
import { isSCToken } from "@atomiqlabs/sdk";
import { TokenIcon } from "./TokenIcon";
import { useEffect, useMemo, useState } from "react";
import { capitalizeFirstLetter } from "../utils/Utils";
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
    const [_chainId, setChainId] = useState();
    const chainId = currenciesByChainId[_chainId] != null ? _chainId : chains?.[0];
    useEffect(() => {
        if (props.value != null)
            setChainId(isSCToken(props.value) ? props.value.chainId : "BITCOIN");
    }, [props.value]);
    const [show, setShow] = useState();
    return (_jsxs(Dropdown, { autoClose: "outside", show: show, onToggle: val => setShow(val), children: [_jsx(Dropdown.Toggle, { variant: "light", id: "dropdown-basic", size: "lg", className: "px-2 py-0 " + props.className, children: _jsxs("div", { className: "d-flex flex-column", children: [_jsxs("div", { className: "d-flex flex-row align-items-center", children: [props.value == null ? "" : _jsx(TokenIcon, { tokenOrTicker: props.value, className: "currency-icon" }), props.value == null ? "Select currency" : props.value.ticker] }), _jsx("div", { className: "font-smallest d-flex flex-row align-items-center justify-content-center", style: { marginTop: "-4px" }, children: props.value != null && isSCToken(props.value) ? (_jsxs(_Fragment, { children: [_jsx("img", { src: "/icons/chains/" + props.value.chainId + ".svg", className: "currency-icon-small" }), capitalizeFirstLetter(props.value.chainId)] })) : "" })] }) }), _jsxs(Dropdown.Menu, { children: [_jsx(Nav, { variant: "underline", className: "mx-3 mb-2", activeKey: chainId, onSelect: (val) => setChainId(val), children: chains.map(val => {
                            return (_jsx(Nav.Item, { children: _jsxs(Nav.Link, { eventKey: val, className: "py-0 d-flex align-items-center", children: [_jsx("img", { src: "/icons/chains/" + val + ".svg", className: "currency-icon-medium" }), capitalizeFirstLetter(val)] }) }));
                        }) }), _jsx(CurrenciesEntry, { currencies: currenciesByChainId[chainId], onSelect: (val) => {
                            setShow(false);
                            props.onSelect(val);
                        } })] })] }));
}
