import {
  createAsyncThunk,
  createEntityAdapter,
  createSlice,
  PayloadAction,
} from '@reduxjs/toolkit';

import { RecipeCard, RecipeEntity } from '@api/models/recipes';
import {
  getRecipe,
  addRecipePair,
  listRecipeCardsByOwnerPaged,
  deleteRecipePair,
  saveSoloRating,
} from '@api/services';
import { CreateRecipeInput, RatingCategory, RootState } from '@api/types';

export const cardsAdapter = createEntityAdapter<RecipeCard, string>({
  selectId: (r) => r.id,
  sortComparer: (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
});

type PageMeta = {
  loading: boolean;
  error?: string | null;
  nextStartAfter?: number | null;
  pageSize: number;
};

type RecipesState = {
  cards: ReturnType<typeof cardsAdapter.getInitialState>;
  mine: PageMeta;
  currentRecipe: RecipeEntity | null;
};

const initialState: RecipesState = {
  cards: cardsAdapter.getInitialState(),
  mine: { loading: false, error: null, nextStartAfter: null, pageSize: 24 },
  currentRecipe: null,
};

export const fetchMyRecipeCardsPage = createAsyncThunk(
  'recipes/fetchMinePage',
  async ({ uid, pageSize }: { uid: string; pageSize?: number }, { getState }) => {
    const state = getState() as RootState;
    const { nextStartAfter } = state.recipes.mine;
    const size = pageSize ?? state.recipes.mine.pageSize;
    const res = await listRecipeCardsByOwnerPaged(uid, size, nextStartAfter ?? undefined);
    return { ...res };
  },
);

// export const fetchRecipeById = createAsyncThunk('recipes/fetchOne', async (id: string) => {
//   return await getRecipe(id);
// });

export const fetchRecipeById = createAsyncThunk(
  'recipes/fetchRecipeById',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await getRecipe(id);
      return res;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const saveSoloRatingThunk = createAsyncThunk(
  'recipes/saveSoloRating',
  async (
    { recipeId, cat, value }: { recipeId: string; cat: RatingCategory; value: number },
    { rejectWithValue },
  ) => {
    try {
      const res = await saveSoloRating(recipeId, cat, value);
      return res;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

// export const createRecipe = createAppAsyncThunk<
//   string,
//   { data: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'> }
// >('recipes/create', async ({ data }, { rejectWithValue }) => {
//   try {
//     const id = await addRecipePair(data);
//     return id;
//   } catch (error: any) {
//     return rejectWithValue(error.message ?? 'Failed to create new recipes');
//   }
// });

export const createRecipe = createAsyncThunk('recipes/create', async (data: CreateRecipeInput) =>
  addRecipePair(data),
);

// export const saveRecipe = createAsyncThunk(
//   'recipes/save',
//   async ({ id, data }: { id: string; data: Partial<Recipe> }) => {
//     await updateRecipe(id, data);
//     return { id, data };
//   },
// );

export const removeRecipe = createAsyncThunk('recipes/remove', async (id: string) => {
  await deleteRecipePair(id);
  return id;
});

// export const removeRecipe = createAsyncThunk('recipes/remove', async (id: string) => {
//   await deleteRecipe(id);
//   return id;
// });

const recipesSlice = createSlice({
  name: 'recipes',
  initialState,
  reducers: {
    resetMine(state) {
      state.mine = {
        loading: false,
        error: null,
        nextStartAfter: null,
        pageSize: state.mine.pageSize,
      };
      cardsAdapter.removeAll(state.cards);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyRecipeCardsPage.pending, (state) => {
        state.mine.loading = true;
        state.mine.error = null;
      })
      .addCase(fetchMyRecipeCardsPage.fulfilled, (state, action) => {
        cardsAdapter.upsertMany(state.cards, action.payload.items);
        state.mine.nextStartAfter = action.payload.nextStartAfter ?? null;
        state.mine.loading = false;
      })
      .addCase(fetchMyRecipeCardsPage.rejected, (state, action) => {
        state.mine.loading = false;
        state.mine.error = action.error.message ?? 'Failed to load recipes';
      })

      .addCase(createRecipe.fulfilled, (state, action) => {
        // optimistic: insert the returned card (timestamps null until refetch)
        cardsAdapter.upsertOne(state.cards, action.payload.card);
      })

      .addCase(removeRecipe.fulfilled, (state, action: PayloadAction<string>) => {
        cardsAdapter.removeOne(state.cards, action.payload);
      })

      .addCase(fetchRecipeById.pending, (state) => {
        state.mine.loading = true;
        state.mine.error = null;
      })
      .addCase(fetchRecipeById.fulfilled, (state, action) => {
        state.currentRecipe = action.payload;
        state.mine.loading = false;
      })
      .addCase(fetchRecipeById.rejected, (state, action) => {
        state.mine.loading = false;
        state.mine.error = action.error.message ?? 'Failed to save solo rating';
      })

      .addCase(saveSoloRatingThunk.pending, (state) => {
        // state.mine.loading = true;
        state.mine.error = null;
      })
      .addCase(saveSoloRatingThunk.fulfilled, (state, action) => {
        const { id, cat, value } = action.payload;
        const card = state.cards.entities[id];
        if (!card) return;

        const prev = card.ratingCategories ?? {};
        card.ratingCategories = { ...prev, [cat]: value };
        if (state.currentRecipe) state.currentRecipe.ratingCategories = { ...prev, [cat]: value };
        state.mine.loading = false;
      })
      .addCase(saveSoloRatingThunk.rejected, (state, action) => {
        state.mine.loading = false;
        state.mine.error = action.error.message ?? 'Failed to save solo rating';
      });
  },
});

export const { resetMine } = recipesSlice.actions;
export default recipesSlice.reducer;
