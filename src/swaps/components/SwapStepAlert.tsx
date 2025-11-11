import * as React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import Icon from 'react-icons-kit';
import { ic_content_copy } from 'react-icons-kit/md/ic_content_copy';
import { BaseButton } from '../../components/BaseButton';
import { ic_warning } from 'react-icons-kit/md/ic_warning';
import { ic_check_circle } from 'react-icons-kit/md/ic_check_circle';
import { ic_info } from 'react-icons-kit/md/ic_info';
import { ic_error} from 'react-icons-kit/md/ic_error';

type SwapStepAlertType = 'success' | 'error' | 'warning' | 'info' | 'danger';

const DefaultIcons = {
  success: ic_check_circle,
  error: ic_warning,
  warning: ic_warning,
  info: ic_info,
  danger: ic_error
};

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
  title: string;
  description?: string | JSX.Element;
  error?: Error;
  icon?: any | null;
  action?: SwapStepAlertAction;
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
  };

  // Handle show prop for conditional rendering
  if (props.show === false) {
    return null;
  }

  const icon = props.icon === null ? undefined : props.icon ?? DefaultIcons[props.type];

  const classNames = [
    'swap-step-alert',
    `is-${props.type}`,
    !icon && 'no-icon',
    props.className,
  ]
    .filter(Boolean)
    .join(' ');

  const description = props.description ?? props.error?.message ?? props.error?.toString();

  return (
    <div className={classNames}>
      {!!icon && (
        <div className="swap-step-alert__icon">
          <Icon size={20} icon={icon} />
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

      {/* Dont need to type error 2 times, if description is not really description */}
      {description && (
        <label className="swap-step-alert__description">{description}</label>
      )}

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
