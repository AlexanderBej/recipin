import React, { useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { useSelector } from 'react-redux';
import { FaCheck, FaMinus } from 'react-icons/fa';

import { RootState } from '@api/types';
import { makeSelectWeekGrid } from '@store/planner-store';
import { MEAL_SLOTS } from '@api/misc';
import { RecIcon } from '@shared/ui';
import { getCssVar } from '@shared/utils';

import './week-table.styles.scss';

interface WeekTableProps {
  anchorWeekStart: Date;
  weekOffset: -1 | 0 | 1;
  selectedDate: string;
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
}

const WeekTable: React.FC<WeekTableProps> = ({
  anchorWeekStart,
  weekOffset,
  selectedDate,
  setSelectedDate,
}) => {
  const visibleStart = useMemo(() => {
    const d = new Date(anchorWeekStart);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [anchorWeekStart, weekOffset]);
  const selectWeekGrid = useMemo(makeSelectWeekGrid, []);
  const grid = useSelector((state: RootState) =>
    selectWeekGrid(state, format(visibleStart, 'yyyy-MM-dd')),
  );

  const days = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => {
        const date = addDays(visibleStart, i);
        return {
          iso: format(date, 'yyyy-MM-dd'),
          labelDay: format(date, 'EEE'),
          labelNum: format(date, 'dd'),
        };
      }),
    [visibleStart],
  );

  const today = new Date();

  return (
    <table className="planner-week-table">
      <thead>
        <tr>
          {days.map((day) => (
            <th
              key={day.iso}
              style={{
                backgroundColor:
                  selectedDate === day.iso ? getCssVar('--color-primary-light') : 'transparent',
                borderColor:
                  selectedDate === day.iso ? 'transparent' : getCssVar('--color-bg-card'),
              }}
            >
              <button
                type="button"
                aria-label="Select day"
                onClick={() => setSelectedDate(day.iso)}
                className="week-heading"
              >
                <span>{day.labelDay}</span>
                <span
                  className="label-num"
                  style={{
                    backgroundColor: getCssVar(
                      day.labelNum === today.getDate().toString()
                        ? '--color-primary'
                        : '--color-bg-card',
                    ),
                  }}
                >
                  {day.labelNum}
                </span>
              </button>
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {MEAL_SLOTS.map((meal) => {
          if (meal === 'snacks') return null;
          return (
            <tr key={meal}>
              {days.map((day) => {
                const hasMeal = grid[day.iso]?.[meal] ?? false;

                return (
                  <td key={day.iso} className={hasMeal ? 'cell cell--has' : 'cell cell--empty'}>
                    <RecIcon
                      icon={hasMeal ? FaCheck : FaMinus}
                      size={18}
                      color={getCssVar(hasMeal ? '--color-primary' : '--color-text-primary')}
                    />
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default WeekTable;
