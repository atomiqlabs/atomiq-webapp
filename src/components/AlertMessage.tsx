import * as React from 'react';

type AlertMessageVariant = 'success' | 'warning' | 'danger' | 'info';

interface AlertMessageProps {
  variant: AlertMessageVariant;
  children: React.ReactNode;
  className?: string;
}

export function AlertMessage(props: AlertMessageProps) {
  const classNames = ['alert-message', `is-${props.variant}`, props.className]
    .filter(Boolean)
    .join(' ');

  const iconMap = {
    success: 'check-circle',
    warning: 'Notice',
    danger: 'invalid-error',
    info: 'info',
  };

  const iconClass = iconMap[props.variant];

  return (
    <div className={classNames}>
      <i className={`alert-message__icon icon icon-${iconClass}`}></i>
      <div className="alert-message__body">{props.children}</div>
    </div>
  );
}
