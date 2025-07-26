import { Button, Spinner } from 'react-bootstrap';
import * as React from 'react';
import classNames from 'classnames';

interface BaseButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  size?: 'small' | 'large';
  variant?: 'primary' | 'secondary' | 'transparent';
  disabled?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
}

export function BaseButton({
  children,
  className,
  onClick,
  size = 'small',
  variant = 'primary',
  disabled = false,
  isLoading = false,
  loadingText = 'Loading...',
  icon,
}: BaseButtonProps) {
  const btnClass = classNames(
    'base-button',
    {
      'base-button--small': size === 'small',
      'base-button--large': size === 'large',
      'base-button--primary': variant === 'primary',
      'base-button--secondary': variant === 'secondary',
      'base-button--transparent': variant === 'transparent',
    },
    className
  );

  return (
    <Button
      className={btnClass}
      onClick={onClick}
      variant={variant}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <>
          {loadingText}
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
            className="me-2"
          />
        </>
      ) : (
        <>
          {icon && <div className="base-button__icon">{icon}</div>}
          <div className="base-button__content">{children}</div>
        </>
      )}
    </Button>
  );
}
