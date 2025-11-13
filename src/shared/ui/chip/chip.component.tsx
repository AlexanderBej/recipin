import React from 'react';
import clsx from 'clsx';

import './chip.styles.scss';

export interface ChipProps {
  tag: string;
  active?: boolean;
  className?: string;
  onToggle: (tag: string) => void;
}

export const Chip: React.FC<ChipProps> = ({ tag, active = false, className, onToggle }) => {
  return (
    <button
      type="button"
      className={clsx('chip', className, { chip__active: active })}
      aria-pressed={active}
      onClick={() => onToggle(tag)}
    >
      {tag}
    </button>
  );
};

export default Chip;
