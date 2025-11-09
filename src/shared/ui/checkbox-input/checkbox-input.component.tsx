import React from 'react';
import clsx from 'clsx';

import './checkbox-input.styles.scss';

interface CheckboxInputProps {
  label?: string;
  onText?: string;
  offText?: string;
  name: string;
  checked: boolean;
  // eslint-disable-next-line no-unused-vars
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  /** new: choose look */
  variant?: 'checkbox' | 'switch';
  /** optional extra class */
  className?: string;
}

const CheckboxInput: React.FC<CheckboxInputProps> = ({
  label,
  onText,
  offText,
  name,
  checked,
  onChange,
  disabled = false,
  variant = 'checkbox',
  className,
}) => {
  const inputClass = clsx('form-checkbox', {
    'form-checkbox__switch': variant === 'switch',
  });

  return (
    <div className={`checkbox-input checkbox-input__${variant} ${className}`}>
      <label htmlFor={name} className="checkbox-label">
        {onText}
      </label>
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={inputClass}
        role={variant === 'switch' ? 'switch' : undefined} // optional ARIA hint
        aria-checked={checked}
      />
      <label htmlFor={name} className="checkbox-label">
        {label || offText}
      </label>
    </div>
  );
};

export default CheckboxInput;
