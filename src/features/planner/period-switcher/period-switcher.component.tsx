import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import { getCssVar } from '@shared/utils';
import { RecIcon } from '@shared/ui';

import './period-switcher.styles.scss';

interface PeriodSwitcherProps {
  anchorWeekStart: Date;
  weekOffset: -1 | 0 | 1;
  setWeekOffset: React.Dispatch<React.SetStateAction<-1 | 0 | 1>>;
}

const PeriodSwitcher: React.FC<PeriodSwitcherProps> = ({
  anchorWeekStart,
  weekOffset,
  setWeekOffset,
}) => {
  const visibleStart = useMemo(() => {
    const d = new Date(anchorWeekStart);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [anchorWeekStart, weekOffset]);

  const getEndOfWeek = (date: Date) => {
    const d = new Date(date);
    d.setDate(d.getDate() + 6);
    return d;
  };

  const label = weekOffset === -1 ? 'Last week' : weekOffset === 0 ? 'Current week' : 'Next week';

  return (
    <header className="period-switcher">
      <button
        className="period-toggler period-toggler__left"
        onClick={() => setWeekOffset((o) => (o > -1 ? ((o - 1) as -1 | 0 | 1) : o))}
        disabled={weekOffset === -1}
      >
        <RecIcon
          icon={FaChevronLeft}
          size={24}
          color={getCssVar(weekOffset === -1 ? '--color-text-secondary' : '--color-primary')}
        />
      </button>
      <div className="week-range">
        <span className="week-text">{label}</span>
        <span>
          {format(visibleStart, 'MMM do')} – {format(getEndOfWeek(visibleStart), 'MMM do')}
        </span>
      </div>
      <button
        className="period-toggler period-toggler__right"
        onClick={() => setWeekOffset((o) => (o < 1 ? ((o + 1) as -1 | 0 | 1) : o))}
        disabled={weekOffset === 1}
      >
        <RecIcon
          icon={FaChevronRight}
          size={24}
          color={getCssVar(weekOffset === 1 ? '--color-text-secondary' : '--color-primary')}
        />
      </button>
    </header>
  );
};

export default PeriodSwitcher;
