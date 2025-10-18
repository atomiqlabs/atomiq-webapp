import { Form, InputGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BigNumber from 'bignumber.js';

import { copy } from 'react-icons-kit/fa/copy';
import { exclamationTriangle } from 'react-icons-kit/fa/exclamationTriangle';
import Icon from 'react-icons-kit';

export type ValidatedInputRef = {
  validate: () => boolean;
  getValue: () => any;
  setValue: (value: any) => void;
  input: {
    current: HTMLInputElement | HTMLTextAreaElement;
  };
};

export function numberValidator(props: { min?: BigNumber; max?: BigNumber }, allowEmpty?: boolean) {
  return (value: string) => {
    if (allowEmpty && value === '') return null;
    try {
      const number = new BigNumber(value);
      if (props.min != null) {
        if (number.comparedTo(props.min) < 0) return 'Must be at least ' + props.min.toString(10);
      }
      if (props.max != null) {
        if (number.comparedTo(props.max) > 0) return 'Must be at most ' + props.max.toString(10);
      }
      if (number.isNaN()) return 'Not a number';
    } catch (e) {
      return 'Not a number';
    }
  };
}

function ValidatedInput(props: {
  className?: any;
  inputRef?: {
    current?: ValidatedInputRef;
  };

  onSubmit?: Function;
  onChange?: (val: any, forcedChange?: boolean) => void;
  onValidate?: (val: any) => string;
  defaultValue?: any;
  placeholder?: any;
  type?: string;
  label?: string | JSX.Element;
  labelClassName?: string;
  floatingLabelClassName?: string;
  floatingLabel?: string | JSX.Element;
  expectingFloatingLabel?: boolean;
  value?: any;

  inputId?: string;
  inputClassName?: string;

  min?: BigNumber;
  max?: BigNumber;
  step?: BigNumber;

  copyEnabled?: boolean;

  options?: { key: string; value: any }[];

  size?: 'sm' | 'lg';

  elementEnd?: string | JSX.Element;
  textEnd?: string | JSX.Element;
  elementStart?: string | JSX.Element;
  textStart?: string | JSX.Element;

  feedbackEndElement?: string | JSX.Element;

  disabled?: boolean;
  validated?: string;
  readOnly?: boolean;
  successFeedback?: string | JSX.Element;
  onCopy?: () => void;
  dynamicTextEndPosition?: boolean;
}) {
  const [state, setState] = React.useState<{
    value: string;
    validated: string;
  }>({
    value: '',
    validated: null,
  });

  const value =
    props.value == null
      ? state.value === ''
        ? (props.defaultValue ?? '')
        : state.value
      : props.value;
  const valueRef = useRef<any>(null);
  valueRef.current = value;

  const inputRef = useRef<HTMLInputElement>(null);
  const inputTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const textEndRef = useRef<HTMLDivElement>(null);

  const [textEndLeftPosition, setTextEndLeftPosition] = useState<number | null>(null);

  // Function to measure text width
  const measureTextWidth = useCallback((text: string, font: string) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      context.font = font;
      return context.measureText(text).width;
    }
    return 0;
  }, []);

  // Update textEnd icon position based on text width
  useEffect(() => {
    if (!props.dynamicTextEndPosition || !props.textEnd) return;

    const currentInputRef = props.type === 'textarea' ? inputTextAreaRef.current : inputRef.current;
    if (currentInputRef && textEndRef.current) {
      const computedStyle = window.getComputedStyle(currentInputRef);
      const font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;

      const displayText = value || '';
      const textWidth = measureTextWidth(displayText, font);

      // Get input width
      const inputWidth = currentInputRef.offsetWidth;

      // 10px is the desired offset after the text
      const newPosition = textWidth + 10;

      // Cap the position at input width minus 10px
      const maxPosition = inputWidth - 10;
      const finalPosition = Math.min(newPosition, maxPosition);

      setTextEndLeftPosition(finalPosition);
    }
  }, [value, props.dynamicTextEndPosition, props.textEnd, props.type, measureTextWidth]);

  const changeValueHandler = useCallback(
    (forcedChange: boolean, value: any) => {
      const obj: any = {};
      if (obj.validated == null)
        if (props.onValidate != null) {
          obj.validated = props.onValidate(value);
        }
      obj.value = value;
      setState(obj);
      if (props.onChange != null) props.onChange(value, forcedChange);
      // if(props.onValidatedInput!=null) props.onValidatedInput(obj.validated == null ? value : null, forcedChange);
    },
    [props.onValidate, props.onChange]
  );

  const refObj = useMemo(() => {
    return {
      validate: (): boolean => {
        let validated: string = null;
        if (props.onValidate != null) {
          validated = props.onValidate(valueRef.current);
        }
        setState((initial) => {
          return { ...initial, validated };
        });
        return validated == null;
      },
      getValue: () => {
        return valueRef.current;
      },
      setValue: changeValueHandler.bind(null, true),
      input: props.type === 'textarea' ? inputTextAreaRef : inputRef,
    };
  }, [props.type, changeValueHandler]);

  useEffect(() => {
    refObj.validate();
  }, [props.onValidate]);

  if (props.inputRef != null) {
    props.inputRef.current = refObj;
  }

  const inputClassName: string =
    (props.inputClassName || '') +
    ' ' +
    (props.floatingLabel != null
      ? 'input-with-offset'
      : props.expectingFloatingLabel
        ? 'py-expect-floating-label'
        : '');

  const isInvalid = !!(props.validated === undefined ? state.validated : props.validated);

  const mainElement =
    props.type === 'select' ? (
      <Form.Select
        disabled={props.disabled}
        isInvalid={isInvalid}
        isValid={!!props.successFeedback}
        defaultValue={props.defaultValue}
        size={props.size}
        id={props.inputId}
        onChange={(evnt: any) => changeValueHandler(false, evnt.target.value)}
        value={value}
        className={inputClassName}
      >
        {props.options == null
          ? ''
          : props.options.map((e) => {
              return (
                <option key={e.key} value={e.key}>
                  {e.value}
                </option>
              );
            })}
      </Form.Select>
    ) : props.type === 'textarea' ? (
      <>
        <Form.Control
          readOnly={props.readOnly}
          disabled={props.disabled}
          ref={inputTextAreaRef}
          size={props.size}
          isInvalid={isInvalid}
          isValid={!!props.successFeedback}
          type={props.type || 'text'}
          as={'textarea'}
          placeholder={props.placeholder}
          defaultValue={props.defaultValue}
          id={props.inputId}
          onChange={(evnt: any) => changeValueHandler(false, evnt.target.value)}
          value={value}
          className={inputClassName}
          onCopy={props.onCopy}
        />
        {props.copyEnabled ? (
          <InputGroup.Text>
            <OverlayTrigger placement="top" overlay={<Tooltip id="copy-tooltip">Copy</Tooltip>}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  refObj.input.current.select();
                  refObj.input.current.setSelectionRange(0, 99999);
                  // @ts-ignore
                  navigator.clipboard.writeText(refObj.input.current.value);
                }}
              >
                <Icon icon={copy} />
              </a>
            </OverlayTrigger>
          </InputGroup.Text>
        ) : (
          ''
        )}
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
          type={props.type || 'text'}
          placeholder={props.placeholder}
          defaultValue={props.defaultValue}
          id={props.inputId}
          onChange={(evnt: any) => changeValueHandler(false, evnt.target.value)}
          min={props.min != null ? props.min.toString(10) : null}
          max={props.max != null ? props.max.toString(10) : null}
          step={props.step != null ? props.step.toString(10) : null}
          value={value}
          className={inputClassName}
          onCopy={props.onCopy}
        />
        {props.copyEnabled ? (
          <InputGroup.Text>
            <OverlayTrigger placement="top" overlay={<Tooltip id="copy-tooltip">Copy</Tooltip>}>
              <a
                href="#"
                className="d-flex align-items-center justify-content-center"
                onClick={(e) => {
                  e.preventDefault();
                  refObj.input.current.select();
                  refObj.input.current.setSelectionRange(0, 99999);
                  // @ts-ignore
                  navigator.clipboard.writeText(refObj.input.current.value);
                }}
              >
                <Icon style={{ marginTop: '-4px' }} icon={copy} />
              </a>
            </OverlayTrigger>
          </InputGroup.Text>
        ) : (
          ''
        )}
      </>
    );

  return (
    <Form
      className={props.className}
      onSubmit={(evnt) => {
        evnt.preventDefault();
        if (props.onSubmit != null) props.onSubmit();
      }}
    >
      <Form.Group controlId={props.inputId == null ? 'validationCustom01' : undefined}>
        {props.label ? <Form.Label className={props.labelClassName}>{props.label}</Form.Label> : ''}
        <InputGroup className={'has-validation'}>
          {props.type === 'checkbox' ? (
            <Form.Check
              disabled={props.disabled}
              ref={inputRef}
              isInvalid={isInvalid}
              isValid={!!props.successFeedback}
              type={'checkbox'}
              readOnly={props.readOnly}
              label={props.placeholder}
              defaultValue={props.defaultValue}
              id={props.inputId}
              onChange={(evnt: any) => changeValueHandler(false, evnt.target.checked)}
              checked={value}
            />
          ) : (
            <>
              {props.elementStart || ''}
              {props.textStart ? <InputGroup.Text>{props.textStart}</InputGroup.Text> : ''}
              {mainElement}
              {props.floatingLabel == null ? (
                ''
              ) : (
                <label className={props.floatingLabelClassName}>{props.floatingLabel}</label>
              )}
              {props.elementEnd || ''}
              {props.textEnd ? (
                <InputGroup.Text
                  ref={textEndRef}
                  style={
                    props.dynamicTextEndPosition && textEndLeftPosition !== null
                      ? { left: `${textEndLeftPosition}px` }
                      : undefined
                  }
                >
                  {props.textEnd}
                </InputGroup.Text>
              ) : (
                ''
              )}
            </>
          )}
          <Form.Control.Feedback type={props.successFeedback ? 'valid' : 'invalid'}>
            <div className="d-flex align-items-center">
              {props.successFeedback == null ? (
                <Icon className="mb-1 me-1" icon={exclamationTriangle} />
              ) : (
                ''
              )}
              <span>
                {props.successFeedback ||
                  (props.validated === undefined ? state.validated : props.validated)}
              </span>
              {props.feedbackEndElement ?? ''}
            </div>
          </Form.Control.Feedback>
        </InputGroup>
      </Form.Group>
    </Form>
  );
}

export default ValidatedInput;
