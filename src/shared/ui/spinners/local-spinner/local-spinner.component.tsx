import React from 'react';
import clsx from 'clsx';

import './local-spinner.styles.scss';

interface LocalSpinnerProps {
  isSmall?: boolean;
}

const LocalSpinner: React.FC<LocalSpinnerProps> = ({ isSmall = false }) => {
  const spinnerClass = clsx('lds-dual-ring', {
    'lds-dual-ring__small': isSmall,
  });
  return (
    <div className="local-spinner">
      <div className={spinnerClass} />
    </div>
  );
};

export default LocalSpinner;
