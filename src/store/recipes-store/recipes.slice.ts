import {
  createAsyncThunk,
  createEntityAdapter,
  createSlice,
  PayloadAction,
} from '@reduxjs/toolkit';

import { RecipeCard, RecipeEntity } from '@api/models/recipe.interface';
import {
  getRecipe,
  addRecipePair,
  listRecipeCardsByOwnerPaged,
  deleteRecipePair,
  saveSoloRating,
  toggleRecipeFavorite,
  listFavoriteRecipes,
} from '@api/services';
import { createAppAsyncThunk, CreateRecipeInput, RatingCategory, RootState } from '@api/types';
import { ListRecipeCardsOptions, ListRecipeCardsResult } from '@api/models';

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
  favorites: RecipeCard[];
  mine: PageMeta;
  currentRecipe: RecipeEntity | null;
};

const initialState: RecipesState = {
  cards: cardsAdapter.getInitialState(),
  mine: { loading: false, error: null, nextStartAfter: null, pageSize: 24 },
  favorites: [],
  currentRecipe: null,
};

export const fetchMyRecipeCardsPage = createAsyncThunk(
  'recipes/fetchMinePage',
  async ({ uid, pageSize }: { uid: string; pageSize?: number }, { getState }) => {
    const state = getState() as RootState;
    const { nextStartAfter } = state.recipes.mine;
    const size = pageSize ?? state.recipes.mine.pageSize;

    const payload: ListRecipeCardsOptions = {
      pageSize: size,
      startAfterCreatedAt: nextStartAfter,
    };
    const res = await listRecipeCardsByOwnerPaged(uid, payload);
    return res;
  },
);

export const fetchMyFavorites = createAppAsyncThunk<RecipeCard[], string>(
  'recipes/fetchMyFavs',
  async (id, { rejectWithValue }) => {
    try {
      const { items } = await listFavoriteRecipes(id);
      return items;
    } catch (error: any) {
      return rejectWithValue(error.message ?? 'Failed to fetch my favorite recipes');
    }
  },
);

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

export const toggleFavorite = createAppAsyncThunk<
  { id: string; fav: boolean },
  { recipeId: string; favorite: boolean }
>('recipes/toggleFavorite', async ({ recipeId, favorite }, { rejectWithValue }) => {
  try {
    const res = await toggleRecipeFavorite(recipeId, favorite);
    return res;
  } catch (error: any) {
    return rejectWithValue(error.message ?? 'Failed to toggle recipe favorite');
  }
});

export const createRecipe = createAppAsyncThunk<RecipeCard, CreateRecipeInput>(
  'recipes/create',
  async (data, { rejectWithValue }) => {
    try {
      const { card } = await addRecipePair(data);
      return card;
    } catch (error: any) {
      return rejectWithValue(error.message ?? 'Failed to create new recipe');
    }
  },
);

export const removeRecipe = createAppAsyncThunk<string, string>(
  'recipes/remove',
  async (id, { rejectWithValue }) => {
    try {
      await deleteRecipePair(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message ?? 'Failed to remove recipe');
    }
  },
);

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
      .addCase(
        fetchMyRecipeCardsPage.fulfilled,
        (state, action: PayloadAction<ListRecipeCardsResult>) => {
          cardsAdapter.upsertMany(state.cards, action.payload.items);
          state.mine.nextStartAfter = action.payload.nextStartAfterCreatedAt ?? null;
          state.mine.loading = false;
        },
      )
      .addCase(fetchMyRecipeCardsPage.rejected, (state, action) => {
        state.mine.loading = false;
        state.mine.error = action.error.message ?? 'Failed to load recipes';
      })

      .addCase(fetchMyFavorites.pending, (state) => {
        state.mine.loading = true;
        state.mine.error = null;
      })
      .addCase(fetchMyFavorites.fulfilled, (state, action) => {
        state.favorites = action.payload;
        state.mine.loading = false;
      })
      .addCase(fetchMyFavorites.rejected, (state, action) => {
        state.mine.loading = false;
        state.mine.error = action.error.message ?? 'Failed to fetch my favorites';
      })

      .addCase(createRecipe.pending, (state) => {
        state.mine.loading = true;
        state.mine.error = null;
      })
      .addCase(createRecipe.fulfilled, (state, action) => {
        // optimistic: insert the returned card (timestamps null until refetch)
        cardsAdapter.upsertOne(state.cards, action.payload);
        state.mine.loading = false;
      })
      .addCase(createRecipe.rejected, (state, action) => {
        state.mine.loading = false;
        state.mine.error = action.error.message ?? 'Failed to create new recipe';
      })

      .addCase(removeRecipe.pending, (state) => {
        state.mine.loading = true;
        state.mine.error = null;
      })
      .addCase(removeRecipe.fulfilled, (state, action) => {
        // optimistic: insert the returned card (timestamps null until refetch)
        cardsAdapter.removeOne(state.cards, action.payload);
        state.mine.loading = false;
      })
      .addCase(removeRecipe.rejected, (state, action) => {
        state.mine.loading = false;
        state.mine.error = action.error.message ?? 'Failed to delete recipe';
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
        state.mine.error = action.error.message ?? 'Failed to retrieve recipe details';
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
      })

      .addCase(toggleFavorite.pending, (state) => {
        // no loading toggle as it's not shown on fav toggle
        state.mine.error = null;
      })
      .addCase(toggleFavorite.fulfilled, (state, action) => {
        const { id, fav } = action.payload;
        const card = state.cards.entities[id];
        if (!card) return;

        card.isFavorite = fav;
        if (state.currentRecipe) state.currentRecipe.isFavorite = fav;

        if (fav) {
          state.favorites.push(card);
        } else {
          const favorite = state.favorites.find((favor) => favor.id === id);
          if (favorite) {
            state.favorites = state.favorites.filter((fav) => fav.id !== id);
          }
        }
      })
      .addCase(toggleFavorite.rejected, (state, action) => {
        state.mine.error = action.error.message ?? 'Failed to toggle favorite';
      });
  },
});

export const { resetMine } = recipesSlice.actions;
export default recipesSlice.reducer;
