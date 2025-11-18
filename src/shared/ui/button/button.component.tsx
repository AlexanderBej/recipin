import React from 'react';
import clsx from 'clsx';

import { Spinner } from '../spinner';

import './button.styles.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'neutral';
export type ButtonShape = 'round' | 'square';
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  shape?: ButtonShape;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  shape = 'square',
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}) => {
  return (
    <button
      className={clsx(
        'recipin-btn',
        `recipin-btn__${variant}`,
        `recipin-btn__${shape}`,
        className,
        {
          'recipin-btn__loading': isLoading,
        },
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Spinner type="local" /> : children}
    </button>
  );
};

export default Button;
