import React, { useEffect, useMemo, useState } from 'react';
import { FaRegCalendarPlus } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';

import { Button, Modal, RecIcon } from '@shared/ui';
import { PlanItem, RecipeEntity } from '@api/models';
import { getCssVar, getWeekDays, getWeekStart } from '@shared/utils';
import { addPlanItemThunk, selectPlannerWeekStart } from '@store/planner-store';

import './planner-modal.styles.scss';
import { format } from 'date-fns';
import { MEAL_SLOTS } from '@api/misc';
import clsx from 'clsx';
import { AppDispatch, MealSlot } from '@api/types';
import { selectAuthUserId } from '@store/auth-store';

interface ConfirmationModalProps {
  recipe: RecipeEntity | null;
}

type Period = 'current' | 'next';

const PlannerModal: React.FC<ConfirmationModalProps> = ({ recipe }) => {
  const dispatch = useDispatch<AppDispatch>();

  const weekStartISO = useSelector(selectPlannerWeekStart);
  const uid = useSelector(selectAuthUserId);
  // 1) Which period is selected inside the modal
  const [period, setPeriod] = useState<Period>('current');

  // 2) Base "anchor" week start (Monday of current week)
  const anchorWeekStart = useMemo(() => {
    if (weekStartISO) return new Date(weekStartISO);
    // fallback if Redux not initialized yet
    return getWeekStart(new Date(), 1); // 1 = Monday in your utils
  }, [weekStartISO]);

  // 3) Visible week start depends on period (current vs next)
  const visibleWeekStart = useMemo(() => {
    if (period === 'current') return anchorWeekStart;
    const d = new Date(anchorWeekStart);
    d.setDate(d.getDate() + 7); // next week
    return d;
  }, [anchorWeekStart, period]);

  // 4) All days in that week
  const days = useMemo(() => getWeekDays(visibleWeekStart), [visibleWeekStart]);
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  // 5) Selected day (ISO string 'YYYY-MM-DD')
  const [selectedDateISO, setSelectedDateISO] = useState<string | null>(
    format(today, 'yyyy-MM-dd'),
  );
  const [selectedMeal, setSelectedMeal] = useState<MealSlot>('lunch');

  // When the visible week changes, default to the first day of that week
  useEffect(() => {
    if (!days.length || period === 'current') return;
    setSelectedDateISO(format(days[0], 'yyyy-MM-dd'));
  }, [days, period]);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onConfirmClick = async () => {
    if (!selectedDateISO || !recipe || !uid) return;

    setSubmitting(true);
    try {
      const planItem: Omit<PlanItem, 'id'> = {
        date: selectedDateISO,
        meal: selectedMeal,
        recipeId: recipe.id,
        recipeName: recipe.title,
        recipeImgUrl: recipe.imageUrl,
        userId: uid,
      };

      await dispatch(addPlanItemThunk({ uid, item: planItem }));

      setOpen(false);
    } catch (e) {
      // handle error
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <button type="button" className="open-modal-bnt" onClick={() => setOpen(true)}>
        <RecIcon icon={FaRegCalendarPlus} size={24} color={getCssVar('--color-primary-light')} />
      </button>
      <Modal isOpen={open} onClose={() => (submitting ? null : setOpen(false))} title="Plan a meal">
        <div className="planner-body">
          <div className="select-week">
            <button
              type="button"
              className={period === 'current' ? 'period-btn active' : 'period-btn'}
              onClick={() => setPeriod('current')}
            >
              This Week
            </button>
            <button
              type="button"
              className={period === 'next' ? 'period-btn active' : 'period-btn'}
              onClick={() => setPeriod('next')}
            >
              Next Week
            </button>
          </div>

          <div className="days-grid">
            {days.map((d) => {
              const iso = format(d, 'yyyy-MM-dd');
              const isSelected = iso === selectedDateISO;
              const dayIsPast = d < today;
              return (
                <button
                  key={iso}
                  type="button"
                  className={clsx('day-pill', {
                    'day-pill__selected': isSelected,
                    'day-pill__disabled': dayIsPast,
                  })}
                  disabled={dayIsPast}
                  onClick={() => setSelectedDateISO(iso)}
                >
                  <span className="day-pill-name">{format(d, 'EEE')}</span>
                  <span className="day-pill-number">{format(d, 'd')}</span>
                </button>
              );
            })}
          </div>

          <div className="meal-selector">
            {MEAL_SLOTS.map((meal, index) => (
              <div
                key={index}
                className={clsx('meal-box', { 'meal-box__selected': selectedMeal === meal })}
                onClick={() => setSelectedMeal(meal)}
              >
                {meal}
              </div>
            ))}
          </div>
        </div>

        <Button
          variant="primary"
          type="button"
          onClick={onConfirmClick}
          isLoading={submitting}
          className="save-btn"
          disabled={!selectedMeal || !selectedDateISO}
        >
          <span>Save</span>
        </Button>
      </Modal>
    </>
  );
};

export default PlannerModal;
