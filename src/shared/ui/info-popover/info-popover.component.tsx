import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { CiCircleInfo } from 'react-icons/ci';

import RecIcon from '../icon/icon.component';

import './info-popover.styles.scss';

interface PopoverProps {
  children: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

const InfoPopover: React.FC<PopoverProps> = ({ children, position = 'bottom', className }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const containerClass = clsx('info-popover', className);

  return (
    <div ref={ref} className={containerClass}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="info-popover-toggler">
        <RecIcon icon={CiCircleInfo} size={18} />
      </button>
      {open && (
        <div className={`info-popover-container info-popover-container__${position}`}>
          {children}
        </div>
      )}
    </div>
  );
};

export default InfoPopover;
