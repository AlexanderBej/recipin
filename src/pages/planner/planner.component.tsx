import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { parseISO, isToday, isYesterday, isTomorrow, format } from 'date-fns';
import { GoPlusCircle } from 'react-icons/go';

import {
  initializePlanner,
  makeSelectPlanForDate,
  selectPlannerWeekStart,
  setAnchorWeekStart,
} from '@store/planner-store';
import { getCssVar, getWeekDays, getWeekStart } from '@shared/utils';
import { AppDispatch, MealSlot, RootState } from '@api/types';
import { PeriodSwitcher, WeekTable } from '@features/planner';
import { RecIcon } from '@shared/ui';
import { SearchSheet } from '@components';
import { selectAuthUserId } from '@store/auth-store';

import './planner.styles.scss';
import { MEAL_SLOTS } from '@api/misc';

const Planner: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const uid = useSelector(selectAuthUserId);

  const anchorWeekStartISO = useSelector(selectPlannerWeekStart);
  const anchorWeekStart = useMemo(
    () => (anchorWeekStartISO ? new Date(anchorWeekStartISO) : getWeekStart(new Date(), 1)),
    [anchorWeekStartISO],
  );
  useEffect(() => {
    if (!anchorWeekStartISO) {
      dispatch(setAnchorWeekStart(anchorWeekStart.toISOString()));
    }
  }, [anchorWeekStartISO, anchorWeekStart, dispatch]);

  useEffect(() => {
    if (!uid) return;
    dispatch(initializePlanner(uid));
  }, [uid, dispatch]);

  // -1 = last week, 0 = current, 1 = next
  const [weekOffset, setWeekOffset] = useState<-1 | 0 | 1>(0);

  const visibleWeekStart = useMemo(() => {
    const d = new Date(anchorWeekStart);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [anchorWeekStart, weekOffset]);

  // the 7 visible days
  const days = useMemo(() => getWeekDays(visibleWeekStart), [visibleWeekStart]);

  const [selectedDateISO, setSelectedDateISO] = useState<string>(() =>
    format(new Date(), 'yyyy-MM-dd'),
  );

  // When week changes, if selectedDateISO is not in this week, reset to the first day
  useEffect(() => {
    if (days.length === 0) return;

    const inThisWeek = days.some((d) => format(d, 'yyyy-MM-dd') === selectedDateISO);

    if (!inThisWeek) {
      setSelectedDateISO(format(days[0], 'yyyy-MM-dd'));
    }
  }, [days, selectedDateISO]);

  const selectPlanForDate = useMemo(makeSelectPlanForDate, []);
  const itemsForSelectedDate = useSelector((state: RootState) =>
    selectPlanForDate(state, selectedDateISO),
  );

  const getItemForSlot = (meal: MealSlot) => {
    return itemsForSelectedDate.find((item) => item.meal === meal);
  };

  const formatSelectedDay = (dateISO: string) => {
    const date = parseISO(dateISO);

    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, dd MMM');
  };

  return (
    <div className="planner">
      <PeriodSwitcher
        anchorWeekStart={anchorWeekStart}
        weekOffset={weekOffset}
        setWeekOffset={setWeekOffset}
      />

      <div className="planner-table">
        <WeekTable
          anchorWeekStart={anchorWeekStart}
          weekOffset={weekOffset}
          selectedDate={selectedDateISO}
          setSelectedDate={setSelectedDateISO}
        />
      </div>

      <div className="planner-day-container">
        <div className="planner-day-header">
          <h3>{formatSelectedDay(selectedDateISO)}</h3>
        </div>
        <div className="planner-day-content">
          {/* <div className="meal-box">
            <h4 className="meal-type">Breakfast</h4>
            {getItemForSlot('breakfast') ? (
              <div></div>
            ) : (
              <SearchSheet selectedMealCategory="breakfast" />
            )}
          </div> */}

          {MEAL_SLOTS.map((meal, index) => {
            const isSnack = meal === 'snacks';
            const planItem = getItemForSlot(meal);

            return (
              <div key={index} className={isSnack ? 'snack-box' : 'meal-box'}>
                {!isSnack && <h4 className="meal-type">{meal}</h4>}
                {planItem ? (
                  <div className="recipe-info"></div>
                ) : isSnack ? (
                  <>
                    <div className="snack-divider" />
                    <button aria-label="Add recipe to snack slot">
                      <RecIcon
                        icon={GoPlusCircle}
                        size={32}
                        color={getCssVar('--color-text-primary')}
                      />
                    </button>
                  </>
                ) : (
                  <SearchSheet selectedMealCategory={meal} />
                )}
              </div>
            );
          })}

          {/* <div className="meal-box">
            <h4 className="meal-type">Lunch</h4>
            <SearchSheet selectedMealCategory="lunch" />
          </div>
          <div className="snack-box">
            <div className="snack-divider" />
            <button aria-label="Add recipe to snack slot">
              <RecIcon icon={GoPlusCircle} size={32} color={getCssVar('--color-text-primary')} />
            </button>
          </div>
          <div className="meal-box">
            <h4 className="meal-type">Dinner</h4>
            <SearchSheet selectedMealCategory="dinner" />
          </div> */}
          {/* {itemsForSelectedDate.map((item) => {
            return <div key={item.id}></div>
          })} */}
        </div>
      </div>

      <footer className="planner__footer">
        <button className="planner__grocery-button">Generate grocery list</button>
      </footer>
    </div>
  );
};

export default Planner;
