import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addDays, format, isValid } from 'date-fns';
import { Link } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiShoppingBag, FiTrash2 } from 'react-icons/fi';
import {
  addPlanItemThunk,
  initializePlanner,
  removePlanItemThunk,
  selectPlannerState,
} from '@store/planner-store';
import { generatePlannedGroceries } from '@store/grocery-store';
import { selectAuthUserId } from '@store/auth-store';
import { getWeekStart, displayTag } from '@shared/utils';
import type { AppDispatch, MealSlot } from '@api/types';
import type { PlanItem, RecipeCard } from '@api/models';
import { MEAL_SLOTS } from '@api/misc';
import { SearchSheet } from '@components';
import RecipePhoto from '../../features/recipe-card/recipe-photo.component';
import { recipeTitle } from '../../features/recipe-card/collection.utils';
import '../../features/recipe-card/recipe-card.styles.scss';
import '../../features/recipe-card/recipes-collection.styles.scss';
import './planner.styles.scss';

export default function Planner() {
  const dispatch = useDispatch<AppDispatch>();
  const uid = useSelector(selectAuthUserId);
  const { byDate, anchorWeekStart, loading, error } = useSelector(selectPlannerState);
  const currentUid = useRef(uid);
  currentUid.current = uid;
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [feedback, setFeedback] = useState('');
  const [actionError, setActionError] = useState('');
  const [generating, setGenerating] = useState(false);
  useEffect(() => {
    if (!uid) return;
    let active = true;
    setReady(false);
    dispatch(initializePlanner(uid))
      .unwrap()
      .then(() => {
        if (active) setReady(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [uid, dispatch, attempt]);
  const start = useMemo(() => {
    const candidate = anchorWeekStart ? new Date(anchorWeekStart) : getWeekStart(new Date(), 1);
    return addDays(isValid(candidate) ? candidate : getWeekStart(new Date(), 1), weekOffset * 7);
  }, [anchorWeekStart, weekOffset]);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const dates = days.map((day) => format(day, 'yyyy-MM-dd'));
  const selectedDate = dates.includes(selected) ? selected : dates[0];
  const visibleItems = ready
    ? dates.flatMap((date) => byDate[date] ?? []).filter((item) => item.userId === uid)
    : [];
  const selectedItems = visibleItems.filter((item) => item.date === selectedDate);
  const changeWeek = (offset: number) => {
    setWeekOffset(offset);
    setFeedback('');
    setActionError('');
  };
  const add = async (recipe: RecipeCard, meal: MealSlot) => {
    if (!uid) return;
    await dispatch(
      addPlanItemThunk({
        uid,
        item: {
          userId: uid,
          date: selectedDate,
          meal,
          recipeId: recipe.id,
          recipeName: recipeTitle(recipe),
          recipeImgUrl: recipe.imageUrl,
        },
      }),
    ).unwrap();
    if (currentUid.current === uid)
      setFeedback(`${recipeTitle(recipe)} added to ${displayTag(meal)}.`);
  };
  const remove = async (item: PlanItem) => {
    setActionError('');
    try {
      await dispatch(removePlanItemThunk({ planItemId: item.id, date: item.date })).unwrap();
      setFeedback(`${item.recipeName} removed from Planner.`);
    } catch {
      setActionError('Could not remove this planned recipe. Try again.');
    }
  };
  const generate = async () => {
    if (!uid || generating) return;
    setGenerating(true);
    setActionError('');
    setFeedback('');
    try {
      const result = await dispatch(
        generatePlannedGroceries({ uid, items: visibleItems }),
      ).unwrap();
      if (currentUid.current !== uid) return;
      setFeedback(
        `${result.added ? `Added ${result.added} recipe group${result.added === 1 ? '' : 's'} to Groceries.` : 'No new groceries to add.'}${result.existing ? ` ${result.existing} already in your list; checked items kept.` : ''}${result.unavailable ? ` ${result.unavailable} missing or without ingredients.` : ''}`,
      );
    } catch {
      if (currentUid.current === uid)
        setActionError('Could not generate Groceries. Your list was not changed. Try again.');
    } finally {
      if (currentUid.current === uid) setGenerating(false);
    }
  };
  return (
    <section className="recipes-page planner-page">
      <header className="planner-period">
        <button
          className="tool-icon"
          title="Previous week"
          aria-label="Previous week"
          disabled={weekOffset === -1}
          onClick={() => changeWeek(weekOffset - 1)}
        >
          <FiChevronLeft />
        </button>
        <div>
          <h2>
            {weekOffset === -1 ? 'Previous week' : weekOffset === 1 ? 'Next week' : 'Current week'}
          </h2>
          <p>
            {format(start, 'MMM d')} – {format(addDays(start, 6), 'MMM d, yyyy')}
          </p>
        </div>
        <button
          className="tool-icon"
          title="Next week"
          aria-label="Next week"
          disabled={weekOffset === 1}
          onClick={() => changeWeek(weekOffset + 1)}
        >
          <FiChevronRight />
        </button>
      </header>
      <nav className="planner-days" aria-label="Plan days">
        {days.map((day) => {
          const date = format(day, 'yyyy-MM-dd');
          const count = visibleItems.filter((item) => item.date === date).length;
          return (
            <button
              key={date}
              aria-label={format(day, 'EEEE, MMMM d')}
              aria-pressed={date === selectedDate}
              onClick={() => {
                setSelected(date);
                setFeedback('');
              }}
            >
              <span>{format(day, 'EEE')}</span>
              <strong>{format(day, 'd')}</strong>
              <small>{count ? `${count} planned` : 'No plans'}</small>
            </button>
          );
        })}
      </nav>
      {!ready && !loading && error && (
        <div role="alert" className="tool-error">
          <p>{error}</p>
          <button className="recipes-action" onClick={() => setAttempt((value) => value + 1)}>
            Try again
          </button>
        </div>
      )}
      {!ready && (loading || !error) && <p role="status">Loading your plan…</p>}
      {ready && (
        <>
          <div className="planner-day-heading">
            <h2>{format(new Date(`${selectedDate}T12:00:00`), 'EEEE, MMMM d')}</h2>
            <p>
              {selectedItems.length
                ? `${selectedItems.length} planned`
                : 'Nothing planned for this day.'}
            </p>
          </div>
          <div className="planner-slots">
            {MEAL_SLOTS.map((meal) => (
              <section className="planner-slot" key={meal}>
                <h3>{displayTag(meal)}</h3>
                {selectedItems
                  .filter((item) => item.meal === meal)
                  .map((item) => (
                    <div className="planned-recipe" key={item.id}>
                      {item.recipeId ? (
                        <Link
                          aria-label={item.recipeName || 'Untitled recipe'}
                          to={`/recipe/${item.recipeId}`}
                          className="planned-recipe-link"
                        >
                          <RecipePhoto src={item.recipeImgUrl} title={item.recipeName} />
                          <span>{item.recipeName || 'Untitled recipe'}</span>
                        </Link>
                      ) : (
                        <span>Recipe unavailable</span>
                      )}
                      <button
                        className="tool-icon"
                        title="Remove planned recipe"
                        aria-label={`Remove ${item.recipeName || 'recipe'} from ${meal}`}
                        disabled={loading || generating}
                        onClick={() => remove(item)}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                <SearchSheet
                  selectedMealCategory={meal}
                  onRecipeTap={(recipe) => add(recipe, meal)}
                  disabled={loading || generating}
                />
              </section>
            ))}
          </div>
          <footer className="planner-generation">
            <div>
              <h2>Groceries for this week</h2>
              <p>
                {visibleItems.length
                  ? `${visibleItems.length} planned meal${visibleItems.length === 1 ? '' : 's'}`
                  : 'Nothing planned this week.'}
              </p>
            </div>
            <button
              className="recipes-action recipes-action--primary"
              disabled={loading || generating}
              onClick={generate}
            >
              <FiShoppingBag />
              {generating ? 'Generating…' : 'Generate Grocery List'}
            </button>
            <Link to="/grocery">View Groceries</Link>
          </footer>
        </>
      )}
      {actionError && (
        <p role="alert" className="tool-error">
          {actionError}
        </p>
      )}
      {feedback && (
        <p role="status" className="tool-feedback">
          {feedback}
        </p>
      )}
    </section>
  );
}
