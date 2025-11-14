import React from 'react';
import clsx from 'clsx';

import './checkbox-input.styles.scss';

interface RecCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

const CheckboxInput: React.FC<RecCheckboxProps> = ({ label, className, ...inputProps }) => {
  const inputClass = clsx('rec-checkbox ', className);

  return (
    <label className={inputClass}>
      <input type="checkbox" className="rec-checkbox-input" {...inputProps} />
      <span className="rec-checkbox-box">
        <svg className="rec-checkbox-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M3 8.5 L6.5 12 L13 4" />
        </svg>
      </span>
      {label && <span className="rec-checkbox-label">{label}</span>}
    </label>
  );
};

export default CheckboxInput;
