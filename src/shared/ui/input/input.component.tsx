import React from 'react';
import clsx from 'clsx';

import './input.styles.scss';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => {
  return (
    <div className={clsx('input-wrapper', className)}>
      {label && <label className="input-label">{label}</label>}
      <input className={clsx('input-field', { 'input-error': error })} {...props} />
      {error && <span className="input-error-message">{error}</span>}
    </div>
  );
};

export default Input;
