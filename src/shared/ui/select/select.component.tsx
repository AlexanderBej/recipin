import React from 'react';
import { IconType } from 'react-icons';
import clsx from 'clsx';
import { IoChevronDown } from 'react-icons/io5';

import './select.styles.scss';
import { RecIcon } from '../icon';

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
  small?: boolean;
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
  small = false,
  onChange,
  ...otherProps
}) => {
  const labelClass = clsx('form-select-label', {
    shrink: value,
  });

  return (
    <div className={`select-wrapper ${customClassName}`}>
      {label && (
        <label className={labelClass} htmlFor={name}>
          {label} {required && <span className="text-red">*</span>}
        </label>
      )}
      <div className={clsx('select-row', { 'select-row__small': small })}>
        <select
          className="form-select"
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
        <RecIcon icon={IoChevronDown} size={18} className="select-chevron" />
      </div>

      {errors && (
        <p className="field-error" id={`err-${name}`}>
          {errors}
        </p>
      )}
    </div>
  );
};

export default Select;
