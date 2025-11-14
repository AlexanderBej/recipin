import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { GroceryRecipe } from '@api/models';

export interface GroceryState {
  recipes: GroceryRecipe[];
  lastGeneratedAt?: string; // timestamp for current week
}

const initialState: GroceryState = {
  recipes: [],
  lastGeneratedAt: '',
};

const grocerySlice = createSlice({
  name: 'grocery',
  initialState,
  reducers: {
    addGroceryRecipe(state, action: PayloadAction<GroceryRecipe>) {
      state.recipes.push(action.payload);
    },
    removeGroceryRecipe(state, action: PayloadAction<string>) {
      state.recipes = state.recipes.filter((r) => r.recipeId !== action.payload);
    },
    setLastGeneratedAt(state, action: PayloadAction<string | undefined>) {
      state.lastGeneratedAt = action.payload;
    },
    toggelItem(
      state,
      action: PayloadAction<{ recipeId: string; itemId: string; checked: boolean }>,
    ) {
      const recipe = state.recipes.find((rec) => rec.recipeId === action.payload.recipeId);
      const item = recipe?.items.find((item) => item.id === action.payload.itemId);
      if (item) {
        item.checked = action.payload.checked;
      }
    },
    clearGrocery(state) {
      state.recipes = [];
      state.lastGeneratedAt = undefined;
    },
  },
});

export const {
  addGroceryRecipe,
  removeGroceryRecipe,
  toggelItem,
  setLastGeneratedAt,
  clearGrocery,
} = grocerySlice.actions;
export default grocerySlice.reducer;
