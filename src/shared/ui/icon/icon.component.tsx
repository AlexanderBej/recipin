import React from 'react';
import { IconType } from 'react-icons';
import clsx from 'clsx';

import './icon.styles.scss';

interface RecIconProps {
  icon: IconType;
  color?: string;
  size?: number;
  className?: string;
}

const RecIcon: React.FC<RecIconProps> = ({ icon: Icon, color = 'white', size = 24, className }) => (
  <div className={clsx('icon-container', className)}>
    {React.createElement(Icon as React.FC<{ size: number; color: string }>, {
      size: size,
      color: color,
    })}
  </div>
);

export default RecIcon;
