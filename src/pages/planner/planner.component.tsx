import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { parseISO, isToday, isYesterday, isTomorrow, format } from 'date-fns';
import { GoPlusCircle } from 'react-icons/go';
import clsx from 'clsx';
import { useNavigate } from 'react-router';

import {
  addPlanItemThunk,
  initializePlanner,
  makeSelectPlanForDate,
  selectPlannerWeekStart,
  setAnchorWeekStart,
} from '@store/planner-store';
import { getCssVar, getWeekDays, getWeekStart } from '@shared/utils';
import { AppDispatch, MealSlot, RootState } from '@api/types';
import { PeriodSwitcher, WeekTable } from '@features/planner';
import { RecIcon } from '@shared/ui';
import { RecipeImg, SearchSheet } from '@components';
import { selectAuthUserId } from '@store/auth-store';
import { MEAL_SLOTS } from '@api/misc';
import { PlanItem, RecipeCard } from '@api/models';
import { fetchRecipeById } from '@store/recipes-store';

import './planner.styles.scss';
import { s } from 'react-router/dist/development/index-react-server-client-BSxMvS7Z';

const Planner: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

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

  const handleSearchedRecipe = async (rec: RecipeCard, meal: MealSlot) => {
    if (!uid) return;
    const planItem: Omit<PlanItem, 'id'> = {
      date: selectedDateISO,
      meal: meal,
      recipeId: rec.id,
      recipeName: rec.title,
      recipeImgUrl: rec.imageUrl,
      userId: uid,
    };

    await dispatch(addPlanItemThunk({ uid, item: planItem }));
  };

  const handleRecipeTap = (recipeId: string) => {
    dispatch(fetchRecipeById(recipeId));
    navigate(`/recipe/${recipeId}`);
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
          {MEAL_SLOTS.map((meal, index) => {
            const isSnack = meal === 'snacks';
            const planItem = getItemForSlot(meal);

            const showBanner = !isSnack || (isSnack && planItem);

            const className = clsx({
              'recipe-box': planItem,
              'snack-box': isSnack && !planItem,
              'meal-box': showBanner,
            });

            return (
              <div key={index} className={className}>
                {showBanner && <h4 className="meal-type">{meal}</h4>}
                {planItem ? (
                  <button
                    aria-label="Go to recipe details"
                    onClick={() => handleRecipeTap(planItem.recipeId)}
                    className="recipe-btn"
                  >
                    <RecipeImg
                      src={planItem.recipeImgUrl}
                      alt={planItem.recipeName}
                      variant="square"
                      className="planner-img"
                    />
                    <h3>{planItem.recipeName}</h3>
                  </button>
                ) : (
                  <>
                    {isSnack && <div className="snack-divider" />}
                    <SearchSheet
                      selectedMealCategory={meal}
                      onRecipeTap={(rec) => handleSearchedRecipe(rec, meal)}
                      isMainMeal={!isSnack}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <footer className="planner__footer">
        <button className="planner__grocery-button">Generate grocery list</button>
      </footer>
    </div>
  );
};

export default Planner;
