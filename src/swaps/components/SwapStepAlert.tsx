import * as React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import Icon from 'react-icons-kit';
import { ic_content_copy } from 'react-icons-kit/md/ic_content_copy';
import { BaseButton } from '../../components/BaseButton';

type SwapStepAlertType = 'success' | 'error' | 'warning' | 'info' | 'danger';

interface SwapStepAlertAction {
  type: 'link' | 'button';
  text: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

interface SwapStepAlertProps {
  type: SwapStepAlertType;
  icon?: any;
  title: string;
  description: string;
  action?: SwapStepAlertAction;
  error?: Error;
  onCopyError?: () => void;
  show?: boolean;
  className?: string;
  actionElement?: (JSX.Element | string) | (JSX.Element | string)[];
}

export function SwapStepAlert(props: SwapStepAlertProps) {
  const handleCopyError = (event: React.MouseEvent) => {
    event.preventDefault();
    if (props.error) {
      // @ts-ignore
      navigator.clipboard.writeText(
        JSON.stringify(
          {
            error: props.error.name,
            message: props.error.message,
            stack: props.error.stack,
          },
          null,
          4
        )
      );
    }
    if (props.onCopyError) {
      props.onCopyError();
    }
  };

  // Handle show prop for conditional rendering
  if (props.show === false) {
    return null;
  }

  const classNames = [
    'swap-step-alert',
    `is-${props.type}`,
    !props.icon && 'no-icon',
    props.className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames}>
      {props.icon && (
        <div className="swap-step-alert__icon">
          <Icon size={20} icon={props.icon} />
        </div>
      )}

      <strong className="swap-step-alert__title">
        {props.title}
        {props.error && (
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip id="copy-error-tooltip">Copy full error stack</Tooltip>}
          >
            <a
              href="#"
              className="swap-step-alert__copy d-inline-flex align-items-center justify-content-middle"
              onClick={handleCopyError}
            >
              <Icon className="ms-1 mb-1" size={16} icon={ic_content_copy} />
            </a>
          </OverlayTrigger>
        )}
      </strong>

      <label className="swap-step-alert__description">{props.description}</label>

      {props.action && (
        <>
          {props.action.type === 'link' ? (
            <a
              href={props.action.href}
              target="_blank"
              rel="noopener noreferrer"
              className="swap-step-alert__action"
              onClick={props.action.onClick}
            >
              <div className="sc-text">{props.action.text}</div>
              {props.action.icon || <div className="icon icon-new-window"></div>}
            </a>
          ) : (
            <BaseButton
              variant={props.action.variant || 'secondary'}
              className="swap-step-alert__button"
              icon={props.action.icon}
              onClick={props.action.onClick}
            >
              {props.action.text}
            </BaseButton>
          )}
        </>
      )}
      {props.actionElement ?? null}
    </div>
  );
}
