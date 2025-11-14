import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { PlanItem } from '@api/models';

export interface PlannerState {
  items: PlanItem[]; // flat array (easy to map/filter)
  selectedWeekStart?: string; // optional helper for UI range
}

const initialState: PlannerState = {
  items: [],
  selectedWeekStart: '',
};

const plannerSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setPlanItems(state, action: PayloadAction<PlanItem[]>) {
      state.items = action.payload;
    },
  },
});

export const { setPlanItems } = plannerSlice.actions;
export default plannerSlice.reducer;
