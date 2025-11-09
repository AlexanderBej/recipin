import React from 'react';

import './page-spinner.styles.scss';

const PageSpinner: React.FC = () => (
  <div className="page-spinner">
    <div className="lds-dual-ring" />
  </div>
);

export default PageSpinner;
