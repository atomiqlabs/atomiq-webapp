import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Dropdown } from "react-bootstrap";
import { TokenIcon } from "./TokenIcon";
export function CurrencyDropdown(props) {
    return (_jsxs(Dropdown, { children: [_jsxs(Dropdown.Toggle, { variant: "light", id: "dropdown-basic", size: "lg", className: "px-2 " + props.className, children: [props.value == null ? "" : _jsx(TokenIcon, { tokenOrTicker: props.value, className: "currency-icon" }), props.value == null ? "Select currency" : props.value.ticker] }), _jsx(Dropdown.Menu, { children: props.currencyList.map(curr => {
                    return (_jsxs(Dropdown.Item, { onClick: () => {
                            props.onSelect(curr);
                        }, children: [_jsx(TokenIcon, { tokenOrTicker: curr, className: "currency-icon" }), curr.name] }, curr.ticker));
                }) })] }));
}
