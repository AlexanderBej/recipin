import React, { useEffect, useMemo, useState } from 'react';
import { FaRegCalendarPlus } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';

import { BottomSheet, RecIcon } from '@shared/ui';
import { PlanItem, RecipeEntity } from '@api/models';
import { getWeekDays, getWeekStart } from '@shared/utils';
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
    if (weekStartISO && weekStartISO === getWeekStart(new Date(), 1).toISOString())
      return new Date(weekStartISO);
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
    if (!days.length) return;
    if (!days.some((day) => format(day, 'yyyy-MM-dd') === selectedDateISO))
      setSelectedDateISO(format(days.find((day) => day >= today) ?? days[0], 'yyyy-MM-dd'));
  }, [days, selectedDateISO, today]);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const onConfirmClick = async () => {
    if (!selectedDateISO || !recipe || !uid) return;

    setSubmitting(true);
    setError('');
    try {
      const planItem: Omit<PlanItem, 'id'> = {
        date: selectedDateISO,
        meal: selectedMeal,
        recipeId: recipe.id,
        recipeName: recipe.title,
        recipeImgUrl: typeof recipe.imageUrl === 'string' ? recipe.imageUrl : '',
        userId: uid,
      };

      await dispatch(addPlanItemThunk({ uid, item: planItem })).unwrap();

      setOpen(false);
      setFeedback('Recipe added to Planner.');
    } catch {
      setError('Could not add this recipe to Planner. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <button
        type="button"
        className="open-modal-bnt"
        aria-label="Add to Planner"
        onClick={() => setOpen(true)}
      >
        <RecIcon icon={FaRegCalendarPlus} size={24} color="var(--hub-accent)" />
        Add to Planner
      </button>
      {feedback && <p role="status">{feedback}</p>}
      <BottomSheet
        open={open}
        onOpenChange={(value) => {
          if (!submitting) setOpen(value);
        }}
        title="Plan a meal"
        className="plan-meal-sheet recipes-page"
        nonDismissable={submitting}
        showClose={!submitting}
      >
        <div className="planner-body">
          <div className="select-week">
            <button
              type="button"
              disabled={submitting}
              className={period === 'current' ? 'period-btn active' : 'period-btn'}
              onClick={() => setPeriod('current')}
            >
              This Week
            </button>
            <button
              type="button"
              disabled={submitting}
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
                  aria-label={format(d, 'EEEE, MMMM d')}
                  aria-pressed={isSelected}
                  disabled={dayIsPast || submitting}
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
              <button
                key={index}
                type="button"
                disabled={submitting}
                aria-pressed={selectedMeal === meal}
                className={clsx('meal-box', { 'meal-box__selected': selectedMeal === meal })}
                onClick={() => setSelectedMeal(meal)}
              >
                {meal}
              </button>
            ))}
          </div>
        </div>

        {error && <p role="alert">{error}</p>}
        <button
          type="button"
          onClick={onConfirmClick}
          className="recipes-action recipes-action--primary plan-meal-save"
          disabled={
            submitting ||
            !selectedMeal ||
            !selectedDateISO ||
            !days.some((day) => day >= today && format(day, 'yyyy-MM-dd') === selectedDateISO)
          }
        >
          <span>{submitting ? 'Saving…' : 'Save'}</span>
        </button>
      </BottomSheet>
    </>
  );
};

export default PlannerModal;
