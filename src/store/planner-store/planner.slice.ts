import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { PlanItem } from '@api/models';
import { createAppAsyncThunk, RootState } from '@api/types';
import { computeThreeWeekWindow, getWeekStart, groupPlanItemsByDate } from '@shared/utils';
import {
  addPlanItem,
  listPlanItemsForRange,
  removePlanItemFromDb,
} from '@api/services/planner.service';

export type PlannerByDate = Record<string, PlanItem[]>;

export interface PlannerState {
  byDate: PlannerByDate; // flat array (easy to map/filter)
  anchorWeekStart?: string;
  loading: boolean;
  error?: string | null;
}

const initialState: PlannerState = {
  byDate: {},
  anchorWeekStart: '',
  loading: false,
  error: null,
};

export const initializePlanner = createAppAsyncThunk<string, string>(
  'planner/initializePlanner',
  async (uid, { rejectWithValue, dispatch, getState }) => {
    try {
      const state: RootState = getState();
      const existingAnchorISO = state.planner.anchorWeekStart;
      let anchorDate: Date;

      if (existingAnchorISO) {
        anchorDate = new Date(existingAnchorISO);
      } else {
        // 1 = Monday; adjust if your getWeekStart uses a different convention
        const currentWeekStart = getWeekStart(new Date(), 1);
        anchorDate = currentWeekStart;
        dispatch(setAnchorWeekStart(currentWeekStart.toISOString()));
      }

      await dispatch(loadPlannerWindowForAnchor({ uid, anchorDate }));
      return '';
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const loadPlannerWindowForAnchor = createAppAsyncThunk<
  PlannerByDate,
  { uid: string; anchorDate: Date }
>('planner/loadPlannerWindowForAnchor', async ({ uid, anchorDate }, { rejectWithValue }) => {
  try {
    const { fromISO, toISO } = computeThreeWeekWindow(anchorDate);

    const items = await listPlanItemsForRange(uid, fromISO, toISO);
    const byDate = groupPlanItemsByDate(items);

    return byDate;
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const removePlanItemThunk = createAppAsyncThunk<
  { date: string; id: string },
  { planItemId: string; date: string }
>('planner/removePlanItem', async ({ planItemId, date }, { dispatch, rejectWithValue }) => {
  try {
    await removePlanItemFromDb(planItemId);

    return { date, id: planItemId };
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const addPlanItemThunk = createAppAsyncThunk<
  PlanItem,
  { uid: string; item: Omit<PlanItem, 'id'> }
>('planner/addPlanItem', async ({ uid, item }, { dispatch, rejectWithValue }) => {
  try {
    const res = await addPlanItem(uid, item);
    return res;
  } catch (error) {
    return rejectWithValue(error);
  }
});

const plannerSlice = createSlice({
  name: 'planner',
  initialState,
  reducers: {
    setAnchorWeekStart(state, action: PayloadAction<string>) {
      state.anchorWeekStart = action.payload;
    },

    setDayItems(state, action: PayloadAction<{ date: string; items: PlanItem[] }>) {
      const { date, items } = action.payload;
      state.byDate[date] = items;
    },

    // Update an item by id (e.g. change servings or notes)
    updatePlanItem(state, action: PayloadAction<PlanItem>) {
      const item = action.payload;
      const list = state.byDate[item.date];
      if (!list) return;

      const idx = list.findIndex((it) => it.id === item.id);
      if (idx === -1) return;

      list[idx] = item;
    },

    // Optional: clear everything (e.g. when user logs out)
    clearPlannerState(state) {
      state.byDate = {};
      state.anchorWeekStart = undefined;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPlannerWindowForAnchor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        loadPlannerWindowForAnchor.fulfilled,
        (state, action: PayloadAction<PlannerByDate>) => {
          state.byDate = action.payload;
          state.loading = false;
        },
      )
      .addCase(loadPlannerWindowForAnchor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load planned items';
      })

      .addCase(addPlanItemThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addPlanItemThunk.fulfilled, (state, action: PayloadAction<PlanItem>) => {
        const item = action.payload;
        const list = state.byDate[item.date] ?? [];
        state.byDate[item.date] = [...list, item];
        state.loading = false;
      })
      .addCase(addPlanItemThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to load planned items';
      })

      .addCase(removePlanItemThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        removePlanItemThunk.fulfilled,
        (state, action: PayloadAction<{ id: string; date: string }>) => {
          const { date, id } = action.payload;
          const list = state.byDate[date];
          if (!list) return;

          const next = list.filter((it) => it.id !== id);
          if (next.length === 0) {
            delete state.byDate[date];
          } else {
            state.byDate[date] = next;
          }
          state.loading = false;
        },
      )
      .addCase(removePlanItemThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to remove plan item';
      });
  },
});

export const {
  // setPlanByDate,
  setAnchorWeekStart,
  setDayItems,
  // addPlanItem,
  updatePlanItem,
  // removePlanItem,
  clearPlannerState,
} = plannerSlice.actions;
export default plannerSlice.reducer;
