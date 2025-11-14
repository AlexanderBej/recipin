import { RootState } from '../store';

export const selectPlannerItems = (state: RootState) => state.planner.items;
