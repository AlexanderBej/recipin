import React from 'react';
import clsx from 'clsx';

import { LocalSpinner } from '../spinners';

import './button.styles.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
export type ButtonShape = 'round' | 'square';
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  shape?: ButtonShape;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
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
      {isLoading ? <LocalSpinner /> : children}
    </button>
  );
};

export default Button;
