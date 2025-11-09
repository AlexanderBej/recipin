import React, { ReactNode, useRef, useState } from 'react';

import { useOnClickOutside } from '@shared/hooks';

import './dropdown.styles.scss';

interface GalDropdownProps {
  customClassName?: string;
  /** The element that toggles the dropdown open/closed */
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  /** The actual dropdown menu, rendered only when open=true */
  menu: (props: { close: () => void }) => ReactNode;
}

const Dropdown: React.FC<GalDropdownProps> = ({ customClassName, trigger, menu }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const toggle = () => setOpen((o) => !o);
  const close = () => setOpen(false);

  useOnClickOutside(ref, close);
  return (
    <div ref={ref} className="dropdown-container">
      {trigger({ open, toggle })}
      {open && <div className={`dropdown-menu ${customClassName}`}>{menu({ close })}</div>}
    </div>
  );
};

export default Dropdown;
