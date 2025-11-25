import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Dropdown, Form } from 'react-bootstrap';
export function MultiSelectDropdown({ id, label, allLabel, options, selectedValues, onToggle, onClear, show, onShowChange, }) {
    return (_jsxs(Dropdown, { show: show, onToggle: onShowChange, autoClose: "outside", className: "multi-select-dropdown", children: [_jsx(Dropdown.Toggle, { id: `${id}-dropdown`, children: selectedValues.length > 0 ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "sc-count", children: selectedValues.length }), label, onClear && (_jsx("span", { className: "clear-filter icon icon-circle-x-clear", onClick: (e) => {
                                e.stopPropagation();
                                onClear();
                            } }))] })) : (allLabel) }), _jsx(Dropdown.Menu, { children: options.map((option) => (_jsx(Dropdown.Item, { as: "div", onClick: (e) => {
                        e.preventDefault();
                        onToggle(option.id);
                    }, children: _jsx(Form.Check, { type: "checkbox", id: `${id}-${option.id}`, label: _jsxs(_Fragment, { children: [option.icon && (_jsx("img", { src: option.icon, alt: option.label, className: "chain-icon" })), option.label] }), checked: selectedValues.includes(option.id), onChange: () => onToggle(option.id) }) }, option.id))) })] }));
}
