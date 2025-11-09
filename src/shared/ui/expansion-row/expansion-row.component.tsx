import React, { ReactNode, useEffect, useId, useState } from 'react';

import './expansion-row.styles.scss';

interface ExpansionRowProps {
  children: ReactNode;
  expandedContent: ReactNode;
  containerClassName?: string;
  buttonClassName?: string;
  defaultExpanded?: boolean;
  canToggle?: boolean;
}

const ExpansionRow: React.FC<ExpansionRowProps> = ({
  children,
  containerClassName = '',
  buttonClassName = '',
  defaultExpanded = false,
  canToggle = true,
  expandedContent,
}) => {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [expanded]);

  const toggle = () => {
    if (!canToggle) return;
    setExpanded(!expanded);
  };

  useEffect(() => {
    if (canToggle) {
      setExpanded(defaultExpanded);
    }
  }, [defaultExpanded, canToggle]);

  const panelId = useId();
  const btnId = useId();

  return (
    <div className={`expansion-row ${containerClassName}`}>
      <button
        id={btnId}
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className={`expansion-btn ${buttonClassName}`}
      >
        {children}
      </button>

      {expanded && (
        <div
          id={panelId}
          aria-labelledby={btnId}
          hidden={!expanded}
          data-open={expanded ? 'true' : 'false'}
          className="expanded-content"
        >
          {expandedContent}
        </div>
      )}
    </div>
  );
};

export default ExpansionRow;
