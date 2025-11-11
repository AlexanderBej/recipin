import React from 'react';
import { IconType } from 'react-icons';

import './icon.styles.scss';
import clsx from 'clsx';

interface GalIconProps {
  icon: IconType;
  color?: string;
  size?: number;
  className?: string;
}

const RecIcon: React.FC<GalIconProps> = ({ icon: Icon, color = 'white', size = 24, className }) => (
  <div className={clsx('icon-container', className)}>
    {React.createElement(Icon as React.FC<{ size: number; color: string }>, {
      size: size,
      color: color,
    })}
  </div>
);

export default RecIcon;
