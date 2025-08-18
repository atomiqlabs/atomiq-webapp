import { Button, Spinner } from 'react-bootstrap';
import * as React from 'react';
import classNames from 'classnames';

export type BaseButtonVariantProps = 'primary' | 'secondary' | 'transparent' | 'clear';

interface BaseButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  size?: 'smaller' | 'small' | 'large' | 'lg' | 'sm' | 'md';
  variant?: BaseButtonVariantProps;
  disabled?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  customIcon?: string;
  icon?: React.ReactNode;
}

export const BaseButton = React.forwardRef<HTMLButtonElement, BaseButtonProps>(function BaseButton(
  {
    children,
    className,
    onClick,
    size = 'small',
    variant = 'primary',
    disabled = false,
    isLoading = false,
    loadingText = 'Loading...',
    icon,
    customIcon,
  },
  ref
) {
  const btnClass = classNames(
    'base-button',
    {
      'base-button--smaller': size === 'smaller',
      'base-button--small': size === 'small' || size === 'sm',
      'base-button--large': size === 'large' || size === 'lg',
      'base-button--primary': variant === 'primary',
      'base-button--secondary': variant === 'secondary',
      'base-button--transparent': variant === 'transparent',
      'base-button--clear': variant === 'clear',
      'base-button--icon-only': !children,
    },
    className
  );

  return (
    <Button
      ref={ref}
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
          {customIcon && <span className={`base-button__icon icon icon-${customIcon}`}></span>}
          <div className="base-button__content">{children}</div>
        </>
      )}
    </Button>
  );
});
