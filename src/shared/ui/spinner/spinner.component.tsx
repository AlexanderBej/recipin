import React from 'react';

import './spinner.styles.scss';

interface SpinnerProps {
  type?: 'page' | 'local';
}

const Spinner: React.FC<SpinnerProps> = ({ type = 'local' }) => (
  <div className={`spinner spinner__${type}`}>
    <div className={`lds-dual-ring lds-dual-ring__${type}`} />
  </div>
);

export default Spinner;
