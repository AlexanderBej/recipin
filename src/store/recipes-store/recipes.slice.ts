import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import { Recipe } from '@api/models/recipes';
import {
  listRecipesByOwner,
  getRecipe,
  addRecipe,
  updateRecipe,
  deleteRecipe,
} from '@api/services';
import { createAppAsyncThunk } from '@api/types';

type RecipesState = {
  items: Recipe[];
  selected?: Recipe | null;
  loading: boolean;
  error?: string | null;
};

const initialState: RecipesState = { items: [], loading: false, selected: null, error: null };

export const fetchMyRecipes = createAppAsyncThunk<Recipe[], { uid: string }>(
  'recipes/fetchMine',
  async ({ uid }, { rejectWithValue }) => {
    try {
      const next = await listRecipesByOwner(uid);
      return next;
    } catch (error: any) {
      return rejectWithValue(error.message ?? 'Failed to load your recipes');
    }
  },
);

// export const fetchMyRecipes = createAsyncThunk('recipes/fetchMine', async (uid: string) => {
//   return await listRecipesByOwner(uid);
// });

export const fetchRecipeById = createAsyncThunk('recipes/fetchOne', async (id: string) => {
  return await getRecipe(id);
});

export const createRecipe = createAppAsyncThunk<
  string,
  { data: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'> }
>('recipes/create', async ({ data }, { rejectWithValue }) => {
  try {
    const id = await addRecipe(data);
    return id;
  } catch (error: any) {
    return rejectWithValue(error.message ?? 'Failed to create new recipes');
  }
});

// export const createRecipe = createAsyncThunk(
//   'recipes/create',
//   async (data: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => {
//     return await addRecipe(data);
//   },
// );

export const saveRecipe = createAsyncThunk(
  'recipes/save',
  async ({ id, data }: { id: string; data: Partial<Recipe> }) => {
    await updateRecipe(id, data);
    return { id, data };
  },
);

export const removeRecipe = createAsyncThunk('recipes/remove', async (id: string) => {
  await deleteRecipe(id);
  return id;
});

const recipesSlice = createSlice({
  name: 'recipes',
  initialState,
  reducers: {
    clearSelected(state) {
      state.selected = null;
    },
    setItems(state, action: PayloadAction<Recipe[]>) {
      state.items = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyRecipes.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(fetchMyRecipes.fulfilled, (s, a: PayloadAction<Recipe[]>) => {
        s.loading = false;
        s.items = a.payload;
      })
      .addCase(fetchMyRecipes.rejected, (s, a) => {
        s.loading = false;
        s.error = a.error.message ?? 'Error fetching your recipes';
      })

      .addCase(createRecipe.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(createRecipe.fulfilled, (s) => {
        s.loading = false;
      })
      .addCase(createRecipe.rejected, (s, a) => {
        s.loading = false;
        s.error = a.error.message ?? 'Error creating recipe';
      })

      .addCase(fetchRecipeById.fulfilled, (s, a: PayloadAction<Recipe | null>) => {
        s.selected = a.payload ?? null;
      })
      .addCase(saveRecipe.fulfilled, (s, a) => {
        // Optionally sync with items; simplest is to refetch list in UI
      })
      .addCase(removeRecipe.fulfilled, (s, a: PayloadAction<string>) => {
        s.items = s.items.filter((r) => r.id !== a.payload);
      });
  },
});

export const { clearSelected, setItems } = recipesSlice.actions;
export default recipesSlice.reducer;
