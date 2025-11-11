import React from 'react';
import clsx from 'clsx';

import './textarea.styles.scss';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  className?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className, ...props }) => {
  return (
    <div className={clsx('textarea-wrapper', className)}>
      {label && <label className="textarea-label">{label}</label>}
      <textarea className={clsx('textarea-field', { 'textarea-error': error })} {...props} />
      {error && <span className="textarea-error-message">{error}</span>}
    </div>
  );
};

export default Textarea;
