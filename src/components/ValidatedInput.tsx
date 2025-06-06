import {Form, InputGroup, OverlayTrigger, Tooltip} from "react-bootstrap";
import * as React from "react";
import {useCallback, useEffect, useMemo, useRef} from "react";
import BigNumber from "bignumber.js";

import {copy} from 'react-icons-kit/fa/copy';
import {exclamationTriangle} from 'react-icons-kit/fa/exclamationTriangle'
import Icon from "react-icons-kit";

export type ValidatedInputRef = {
    validate: () => boolean,
    getValue: () => any,
    setValue: (value: any, triggerOnChange?: boolean) => void,
    input: {
        current: HTMLInputElement | HTMLTextAreaElement
    }
}

const numberValidator = (value, props) => {
    if(value!=="") {
        try {
            const number = new BigNumber(value);
            if(props.min!=null) {
                if(number.comparedTo(props.min)<0) return "Must be at least "+props.min.toString(10);
            }
            if(props.max!=null) {
                if(number.comparedTo(props.max)>0) return "Must be at most "+props.max.toString(10);
            }
            if(number.isNaN()) return "Not a number";
        } catch (e) {
            return "Not a number";
        }
    }
};

function bnEqual(a: BigNumber, b: BigNumber) {
    if(a==null && b==null) return true;
    if(a!=null && b==null) return false;
    if(a==null && b!=null) return false;
    return a.eq(b);
}

function ValidatedInput(props : {
    className?: any,
    inputRef?: {
        current?: ValidatedInputRef
    },

    onSubmit?: Function,
    onChange?: Function,
    onValidate?: (val: any) => string,
    onValidatedInput?: (val: any) => void,
    defaultValue?: any,
    placeholder?: any,
    type?: string,
    label?: string | JSX.Element,
    floatingLabel?: string | JSX.Element,
    expectingFloatingLabel?: boolean,
    value?: any,

    inputId?: string,
    inputClassName?: string,

    min?: BigNumber,
    max?: BigNumber,
    step?: BigNumber,

    copyEnabled?: boolean,

    options?: {key: string, value: any}[],

    size?: "sm" | "lg",

    elementEnd?: string | JSX.Element,
    textEnd?: string | JSX.Element,
    elementStart?: string | JSX.Element,
    textStart?: string | JSX.Element,

    feedbackEndElement?: string | JSX.Element,

    disabled?: boolean,
    validated?: string,
    readOnly?: boolean,
    successFeedback?: string | JSX.Element,
    onCopy?: () => void
}) {

    const [state, setState] = React.useState<{value: string, validated: string}>({
        value: "",
        validated: null
    });

    const value = props.value==null ? (state.value==="" ? (props.defaultValue ?? "") : state.value) : props.value;
    const valueRef = useRef<any>(null);
    valueRef.current = value;

    const inputRef = useRef<HTMLInputElement>(null);
    const inputTextAreaRef = useRef<HTMLTextAreaElement>(null);

    const changeValueHandler = useCallback((value: any, triggerOnChange: boolean = true) => {
        const obj: any = {};
        if(props.type==="number") {
            obj.validated = numberValidator(value, props);
            if(obj.validated==null && value!=="") value = new BigNumber(value).toString(10);
        }
        if(obj.validated==null) if(props.onValidate!=null) {
            obj.validated = props.onValidate(value);
        }
        obj.value = value;
        setState(obj);
        if(triggerOnChange && props.onChange!=null) props.onChange(value);
        if(props.onValidatedInput!=null) props.onValidatedInput(obj.validated == null ? value : null);
    }, [props.min, props.max, props.onValidate, props.onChange, props.onValidatedInput]);

    const refObj = useMemo(() => {
        return {
            validate: (): boolean => {
                let validated: string = null;
                if (props.type === "number") {
                    validated = numberValidator(valueRef.current, props);
                }
                if (validated == null) if (props.onValidate != null) {
                    validated = props.onValidate(valueRef.current);
                }
                setState(initial => {
                    return {...initial, validated}
                });
                return validated == null;
            },
            getValue: () => {
                return valueRef.current;
            },
            setValue: changeValueHandler,
            input: props.type==="textarea" ? inputTextAreaRef : inputRef
        };
    }, [props.type, props.min, props.max, changeValueHandler]);

    const minMaxRef = useRef<{min: BigNumber, max: BigNumber}>(null);
    useEffect(() => {
        if(minMaxRef.current!=null && bnEqual(minMaxRef.current.min, props.min) && bnEqual(minMaxRef.current.max, props.max)) return;
        const isValid = refObj.validate();
        if(props.onValidatedInput!=null) props.onValidatedInput(isValid ? value : null);
        minMaxRef.current = {min: props.min, max: props.max};
    }, [props.min, props.max]);
    useEffect(() => {
        const isValid = refObj.validate();
        if(props.onValidatedInput!=null) props.onValidatedInput(isValid ? value : null);
    }, [value, props.onValidate]);

    if(props.inputRef!=null) {
        props.inputRef.current = refObj;
    }

    const inputClassName: string = (props.inputClassName || "")
        + " "
        + (props.floatingLabel!=null ? "input-with-offset" : props.expectingFloatingLabel ? "py-expect-floating-label" : "");

    const isInvalid = !!(props.validated===undefined ? state.validated : props.validated);

    const mainElement = props.type==="select" ? (
            <Form.Select
                disabled={props.disabled}
                isInvalid={isInvalid}
                isValid={!!props.successFeedback}
                defaultValue={props.defaultValue}
                size={props.size}
                id={props.inputId}
                onChange={(evnt: any) => changeValueHandler(evnt.target.value)}
                value={value}
                className={inputClassName}
            >
                {props.options==null ? "" : props.options.map((e) => {
                    return (<option key={e.key} value={e.key}>{e.value}</option>)
                })}
            </Form.Select>
        ) : props.type==="textarea" ? (
            <>
                <Form.Control
                    readOnly={props.readOnly}
                    disabled={props.disabled}
                    ref={inputTextAreaRef}
                    size={props.size}
                    isInvalid={isInvalid}
                    isValid={!!props.successFeedback}
                    type={props.type || "text"}
                    as={"textarea"}
                    placeholder={props.placeholder}
                    defaultValue={props.defaultValue}
                    id={props.inputId}
                    onChange={(evnt: any) => changeValueHandler(evnt.target.value)}
                    value={value}
                    className={inputClassName}
                    onCopy={props.onCopy}
                />
                {props.copyEnabled ? (
                    <InputGroup.Text>
                        <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip id="copy-tooltip">Copy</Tooltip>}
                        >
                            <a href="#" onClick={(e) => {
                                e.preventDefault();
                                refObj.input.current.select();
                                refObj.input.current.setSelectionRange(0, 99999);
                                // @ts-ignore
                                navigator.clipboard.writeText(refObj.input.current.value);
                            }}><Icon icon={copy}/></a>
                        </OverlayTrigger>
                    </InputGroup.Text>
                ) : ""}
            </>
        ) : (
            <>
                <Form.Control
                    readOnly={props.readOnly}
                    disabled={props.disabled}
                    ref={inputRef}
                    size={props.size}
                    isInvalid={isInvalid}
                    isValid={!!props.successFeedback}
                    type={props.type || "text"}
                    placeholder={props.placeholder}
                    defaultValue={props.defaultValue}
                    id={props.inputId}
                    onChange={(evnt: any) => changeValueHandler(evnt.target.value)}
                    min={props.min!=null ? props.min.toString(10): null}
                    max={props.max!=null ? props.max.toString(10): null}
                    step={props.step!=null ? props.step.toString(10): null}
                    value={value}
                    className={inputClassName}
                    onCopy={props.onCopy}
                />
                {props.copyEnabled ? (
                    <InputGroup.Text>
                        <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip id="copy-tooltip">Copy</Tooltip>}
                        >
                            <a href="#" className="d-flex align-items-center justify-content-center" onClick={(e) => {
                                e.preventDefault();
                                refObj.input.current.select();
                                refObj.input.current.setSelectionRange(0, 99999);
                                // @ts-ignore
                                navigator.clipboard.writeText(refObj.input.current.value);
                            }}><Icon style={{marginTop: "-4px"}} icon={copy}/></a>
                        </OverlayTrigger>
                    </InputGroup.Text>
                ) : ""}
            </>
        );

    return (
        <Form className={props.className} onSubmit={(evnt) => {
            evnt.preventDefault();
            if(props.onSubmit!=null) props.onSubmit();
        }}>
            <Form.Group controlId={props.inputId==null ? "validationCustom01" : undefined}>
                {props.label ? (<Form.Label>{props.label}</Form.Label>) : ""}
                <InputGroup className={"has-validation "+(props.floatingLabel!=null || props.expectingFloatingLabel ? "form-floating" : "")}>
                    {props.type==="checkbox" ? (
                        <Form.Check
                            disabled={props.disabled}
                            ref={inputRef}
                            isInvalid={isInvalid}
                            isValid={!!props.successFeedback}
                            type={"checkbox"}
                            readOnly={props.readOnly}
                            label={props.placeholder}
                            defaultValue={props.defaultValue}
                            id={props.inputId}
                            onChange={(evnt: any) =>  changeValueHandler(evnt.target.checked)}
                            checked={value}
                        />
                    ) : (
                        <>
                            {props.elementStart || ""}
                            {props.textStart ? (
                                <InputGroup.Text>
                                    {props.textStart}
                                </InputGroup.Text>
                            ) : ""}
                            {mainElement}
                            {props.floatingLabel==null ? "" : <label>{props.floatingLabel}</label>}
                            {props.elementEnd || ""}
                            {props.textEnd ? (
                                <InputGroup.Text>
                                    {props.textEnd}
                                </InputGroup.Text>
                            ) : ""}
                        </>
                    )}
                    <Form.Control.Feedback type={props.successFeedback ? "valid" : "invalid"}>
                        <div className="d-flex align-items-center">
                            {props.successFeedback==null ? (<Icon className="mb-1 me-1" icon={exclamationTriangle}/>) : ""}
                            <span>{props.successFeedback || (props.validated===undefined ? state.validated : props.validated)}</span>
                            {props.feedbackEndElement ?? ""}
                        </div>
                    </Form.Control.Feedback>
                </InputGroup>
            </Form.Group>
        </Form>
    );

}

export default ValidatedInput;