import React from 'react';

import './card-loading.styles.scss';

const CardLoading: React.FC = () => {
  return (
    <div className="card-loading-wrapper">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="card-loading">
          <div className="card-loading-img" />
          <div className="card-loading-content">
            <div className="content-row" />
            <div className="content-row" />
            <div className="content-row" />
            <div className="content-row" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default CardLoading;
