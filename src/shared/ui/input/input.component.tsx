import React from 'react';
import clsx from 'clsx';
import { IoMdSearch } from 'react-icons/io';

import './input.styles.scss';
import { RecIcon } from '../icon';
import { getCssVar } from '@shared/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
  prefix?: 'none' | 'search';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className,
  prefix = 'none',
  ...props
}) => {
  const inputClass = clsx('input-field', {
    'input-error': error,
    'input-with-prefix': prefix && prefix !== 'none',
  });

  return (
    <div className={clsx('input-wrapper', className)}>
      {label && <label className="input-label">{label}</label>}
      <div className="input-row">
        {prefix !== 'none' && (
          <RecIcon
            className="input-prefix"
            icon={IoMdSearch}
            color={getCssVar('--color-text-secondary')}
            size={24}
          />
        )}
        <input className={inputClass} {...props} />
      </div>
      {error && <span className="input-error-message">{error}</span>}
    </div>
  );
};

export default Input;
