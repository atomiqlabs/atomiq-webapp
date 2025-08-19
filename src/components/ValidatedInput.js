import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Form, InputGroup, OverlayTrigger, Tooltip } from "react-bootstrap";
import * as React from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import BigNumber from "bignumber.js";
import { copy } from 'react-icons-kit/fa/copy';
import { exclamationTriangle } from 'react-icons-kit/fa/exclamationTriangle';
import Icon from "react-icons-kit";
export function numberValidator(props, allowEmpty) {
    return (value) => {
        if (allowEmpty && value === "")
            return null;
        try {
            const number = new BigNumber(value);
            if (props.min != null) {
                if (number.comparedTo(props.min) < 0)
                    return "Must be at least " + props.min.toString(10);
            }
            if (props.max != null) {
                if (number.comparedTo(props.max) > 0)
                    return "Must be at most " + props.max.toString(10);
            }
            if (number.isNaN())
                return "Not a number";
        }
        catch (e) {
            return "Not a number";
        }
    };
}
function ValidatedInput(props) {
    const [state, setState] = React.useState({
        value: "",
        validated: null
    });
    const value = props.value == null ? (state.value === "" ? (props.defaultValue ?? "") : state.value) : props.value;
    const valueRef = useRef(null);
    valueRef.current = value;
    const inputRef = useRef(null);
    const inputTextAreaRef = useRef(null);
    const changeValueHandler = useCallback((forcedChange, value) => {
        const obj = {};
        if (obj.validated == null)
            if (props.onValidate != null) {
                obj.validated = props.onValidate(value);
            }
        obj.value = value;
        setState(obj);
        if (props.onChange != null)
            props.onChange(value, forcedChange);
        // if(props.onValidatedInput!=null) props.onValidatedInput(obj.validated == null ? value : null, forcedChange);
    }, [props.onValidate, props.onChange]);
    const refObj = useMemo(() => {
        return {
            validate: () => {
                let validated = null;
                if (props.onValidate != null) {
                    validated = props.onValidate(valueRef.current);
                }
                setState(initial => {
                    return { ...initial, validated };
                });
                return validated == null;
            },
            getValue: () => {
                return valueRef.current;
            },
            setValue: changeValueHandler.bind(null, true),
            input: props.type === "textarea" ? inputTextAreaRef : inputRef
        };
    }, [props.type, changeValueHandler]);
    useEffect(() => {
        refObj.validate();
    }, [props.onValidate, props.value]);
    if (props.inputRef != null) {
        props.inputRef.current = refObj;
    }
    const inputClassName = (props.inputClassName || "")
        + " "
        + (props.floatingLabel != null ? "input-with-offset" : props.expectingFloatingLabel ? "py-expect-floating-label" : "");
    const isInvalid = !!(props.validated === undefined ? state.validated : props.validated);
    const mainElement = props.type === "select" ? (_jsx(Form.Select, { disabled: props.disabled, isInvalid: isInvalid, isValid: !!props.successFeedback, defaultValue: props.defaultValue, size: props.size, id: props.inputId, onChange: (evnt) => changeValueHandler(false, evnt.target.value), value: value, className: inputClassName, children: props.options == null ? "" : props.options.map((e) => {
            return (_jsx("option", { value: e.key, children: e.value }, e.key));
        }) })) : props.type === "textarea" ? (_jsxs(_Fragment, { children: [_jsx(Form.Control, { readOnly: props.readOnly, disabled: props.disabled, ref: inputTextAreaRef, size: props.size, isInvalid: isInvalid, isValid: !!props.successFeedback, type: props.type || "text", as: "textarea", placeholder: props.placeholder, defaultValue: props.defaultValue, id: props.inputId, onChange: (evnt) => changeValueHandler(false, evnt.target.value), value: value, className: inputClassName, onCopy: props.onCopy }), props.copyEnabled ? (_jsx(InputGroup.Text, { children: _jsx(OverlayTrigger, { placement: "top", overlay: _jsx(Tooltip, { id: "copy-tooltip", children: "Copy" }), children: _jsx("a", { href: "#", onClick: (e) => {
                            e.preventDefault();
                            refObj.input.current.select();
                            refObj.input.current.setSelectionRange(0, 99999);
                            // @ts-ignore
                            navigator.clipboard.writeText(refObj.input.current.value);
                        }, children: _jsx(Icon, { icon: copy }) }) }) })) : ""] })) : (_jsxs(_Fragment, { children: [_jsx(Form.Control, { readOnly: props.readOnly, disabled: props.disabled, ref: inputRef, size: props.size, isInvalid: isInvalid, isValid: !!props.successFeedback, type: props.type || "text", placeholder: props.placeholder, defaultValue: props.defaultValue, id: props.inputId, onChange: (evnt) => changeValueHandler(false, evnt.target.value), min: props.min != null ? props.min.toString(10) : null, max: props.max != null ? props.max.toString(10) : null, step: props.step != null ? props.step.toString(10) : null, value: value, className: inputClassName, onCopy: props.onCopy }), props.copyEnabled ? (_jsx(InputGroup.Text, { children: _jsx(OverlayTrigger, { placement: "top", overlay: _jsx(Tooltip, { id: "copy-tooltip", children: "Copy" }), children: _jsx("a", { href: "#", className: "d-flex align-items-center justify-content-center", onClick: (e) => {
                            e.preventDefault();
                            refObj.input.current.select();
                            refObj.input.current.setSelectionRange(0, 99999);
                            // @ts-ignore
                            navigator.clipboard.writeText(refObj.input.current.value);
                        }, children: _jsx(Icon, { style: { marginTop: "-4px" }, icon: copy }) }) }) })) : ""] }));
    return (_jsx(Form, { className: props.className, onSubmit: (evnt) => {
            evnt.preventDefault();
            if (props.onSubmit != null)
                props.onSubmit();
        }, children: _jsxs(Form.Group, { controlId: props.inputId == null ? "validationCustom01" : undefined, children: [props.label ? (_jsx(Form.Label, { children: props.label })) : "", _jsxs(InputGroup, { className: "has-validation " + (props.floatingLabel != null || props.expectingFloatingLabel ? "form-floating" : ""), children: [props.type === "checkbox" ? (_jsx(Form.Check, { disabled: props.disabled, ref: inputRef, isInvalid: isInvalid, isValid: !!props.successFeedback, type: "checkbox", readOnly: props.readOnly, label: props.placeholder, defaultValue: props.defaultValue, id: props.inputId, onChange: (evnt) => changeValueHandler(false, evnt.target.checked), checked: value })) : (_jsxs(_Fragment, { children: [props.elementStart || "", props.textStart ? (_jsx(InputGroup.Text, { children: props.textStart })) : "", mainElement, props.floatingLabel == null ? "" : _jsx("label", { children: props.floatingLabel }), props.elementEnd || "", props.textEnd ? (_jsx(InputGroup.Text, { children: props.textEnd })) : ""] })), _jsx(Form.Control.Feedback, { type: props.successFeedback ? "valid" : "invalid", children: _jsxs("div", { className: "d-flex align-items-center", children: [props.successFeedback == null ? (_jsx(Icon, { className: "mb-1 me-1", icon: exclamationTriangle })) : "", _jsx("span", { children: props.successFeedback || (props.validated === undefined ? state.validated : props.validated) }), props.feedbackEndElement ?? ""] }) })] })] }) }));
}
export default ValidatedInput;
