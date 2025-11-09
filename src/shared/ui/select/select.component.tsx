import React from 'react';
import { IconType } from 'react-icons';
import clsx from 'clsx';

import './select.styles.scss';

export interface SelectOption {
  value: string | number;
  label: string | React.ReactElement;
  icon?: IconType;
}

interface SelectProps {
  label?: string;
  name: string;
  value: string | number;
  options: SelectOption[];
  required?: boolean;
  errors?: string;
  customClassName?: string;
  // eslint-disable-next-line , no-unused-vars
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  // Allow additional props (e.g., className, id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

const Select: React.FC<SelectProps> = ({
  label,
  name,
  value,
  options,
  errors,
  customClassName,
  required = false,
  onChange,
  ...otherProps
}) => {
  const labelClass = clsx('form-input-label', {
    shrink: value,
  });

  return (
    <div className={`group ${customClassName}`}>
      {label && (
        <label className={labelClass} htmlFor={name}>
          {label} {required && <span className="text-red">*</span>}
        </label>
      )}
      <select
        className="form-input select-input"
        name={name}
        id={name}
        value={value}
        required={required}
        onChange={onChange}
        {...otherProps}
      >
        <option value="" disabled hidden>
          {label ? `Select ${label}` : 'Select...'}
        </option>
        {options.map((opt, index) => (
          <option key={index} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {errors && (
        <p className="field-error" id={`err-${name}`}>
          {errors}
        </p>
      )}
    </div>
  );
};

export default Select;
