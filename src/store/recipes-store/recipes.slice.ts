import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import { RecipeCard, RecipeEntity } from '@api/models/recipe.interface';
import {
  getRecipe,
  addRecipePair,
  listRecipeCardsByOwnerPaged,
  deleteRecipePair,
  saveSoloRating,
  toggleRecipeFavorite,
  listFavoriteRecipes,
  listDiscoveryRecipeCards,
  updateRecipePair,
  UpdateRecipeInput,
} from '@api/services';
import { createAppAsyncThunk, CreateRecipeInput, RatingCategory, RootState } from '@api/types';
import { ListRecipeCardsOptions, ListRecipeCardsResult, RecipeCardFilters } from '@api/models';

export const cardsAdapter = createEntityAdapter<RecipeCard, string>({
  selectId: (r) => r.id,
  sortComparer: (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0),
});

type FetchMyRecipeCardsPageArgs = {
  uid: string;
  pageSize?: number;
  reset?: boolean;
  filters?: RecipeCardFilters;
};

type PageMeta = {
  requestId?: string;
  loading: boolean;
  error?: string | null;
  pageSize: number;
  nextStartAfterCreatedAt: number | null;
  nextStartAfterTitle: string | null;
  lastFilters?: RecipeCardFilters | null;
};

type RecipesState = {
  detail: {
    id: string | null;
    status: 'idle' | 'loading' | 'ready' | 'not-found' | 'error';
    requestId?: string;
    error?: string;
  };
  discovery: {
    items: RecipeCard[];
    ownerId: string | null;
    status: 'idle' | 'loading' | 'ready' | 'error';
    requestId?: string;
    error?: string;
  };
  bootLoading: boolean;
  cards: ReturnType<typeof cardsAdapter.getInitialState>;
  favorites: RecipeCard[];
  mine: PageMeta;
  currentRecipe: RecipeEntity | null;
};

const initialState: RecipesState = {
  detail: { id: null, status: 'idle' },
  discovery: { items: [], ownerId: null, status: 'idle' },
  bootLoading: false,
  cards: cardsAdapter.getInitialState(),
  mine: {
    loading: false,
    error: null,
    nextStartAfterCreatedAt: null,
    nextStartAfterTitle: null,
    lastFilters: null,
    pageSize: 24,
  },
  favorites: [],
  currentRecipe: null,
};

export const fetchDiscoveryRecipes = createAppAsyncThunk<RecipeCard[], string>(
  'recipes/discovery',
  async (uid) => listDiscoveryRecipeCards(uid),
  {
    condition: (uid, { getState }) => {
      const { discovery } = getState().recipes;
      return (
        !!uid && (discovery.ownerId !== uid || !['loading', 'ready'].includes(discovery.status))
      );
    },
  },
);

export const fetchMyRecipeCardsPage = createAppAsyncThunk<
  ListRecipeCardsResult,
  FetchMyRecipeCardsPageArgs
>(
  'recipes/fetchMinePage',
  async ({ uid, pageSize, reset = false, filters }, { getState, dispatch, rejectWithValue }) => {
    try {
      dispatch(startOptimisticLoading());
      const state = getState() as RootState;
      const mine = state.recipes.mine; // adjust path if different

      const size = pageSize ?? mine.pageSize;

      const hasSearch = !!filters?.searchTerm?.trim();

      const payload: ListRecipeCardsOptions = {
        pageSize: size,
        filters,
        // when reset, always start fresh
        startAfterCreatedAt: reset || hasSearch ? null : mine.nextStartAfterCreatedAt,
        startAfterTitle: reset || !hasSearch ? null : mine.nextStartAfterTitle,
      };
      console.log('call API');

      const res = await listRecipeCardsByOwnerPaged(uid, payload);

      // include filters in the payload so reducer can remember them if it wants
      return { ...res, filters };
    } catch (error: any) {
      return rejectWithValue(error.message ?? 'Failed to fetch my recipe cards page');
    }
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

export const fetchRecipeById = createAppAsyncThunk<RecipeEntity | null, string>(
  'recipes/fetchRecipeById',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await getRecipe(id);
      return res;
    } catch {
      return rejectWithValue('Could not load this recipe. Please try again.');
    }
  },
  {
    condition: (id, { getState }) => {
      const { detail, currentRecipe } = getState().recipes;
      return !!id && !(detail.id === id && detail.status === 'loading') && currentRecipe?.id !== id;
    },
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
  async (data, { rejectWithValue, getState }) => {
    try {
      const { card } = await addRecipePair(data);
      if (getState().auth.user?.uid !== data.authorId)
        return rejectWithValue('Your session changed.');
      return card;
    } catch (error: any) {
      return rejectWithValue(error.message ?? 'Failed to create new recipe');
    }
  },
);

export const updateRecipe = createAppAsyncThunk<
  Awaited<ReturnType<typeof updateRecipePair>>,
  UpdateRecipeInput
>('recipes/update', async (input, { rejectWithValue, getState }) => {
  try {
    const result = await updateRecipePair(input);
    if (getState().auth.user?.uid !== input.uid) return rejectWithValue('Your session changed.');
    return result;
  } catch (error) {
    return rejectWithValue({
      conflict: error instanceof Error && error.name === 'RecipeEditConflict',
      message: error instanceof Error ? error.message : 'Could not save this recipe.',
    });
  }
});

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
    invalidateDiscovery(state) {
      state.discovery = { items: [], ownerId: null, status: 'idle' };
    },
    startBootLoading(state) {
      state.bootLoading = true;
    },
    startOptimisticLoading(state) {
      state.mine.loading = true;
    },
    resetMine(state) {
      state.currentRecipe = null;
      state.detail = { id: null, status: 'idle' };
      state.discovery = { items: [], ownerId: null, status: 'idle' };
      state.mine = {
        loading: false,
        error: null,
        nextStartAfterCreatedAt: null,
        nextStartAfterTitle: null,
        lastFilters: null,
        pageSize: state.mine.pageSize,
      };
      cardsAdapter.removeAll(state.cards);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDiscoveryRecipes.pending, (state, action) => {
        state.discovery = {
          items: [],
          ownerId: action.meta.arg,
          status: 'loading',
          requestId: action.meta.requestId,
        };
      })
      .addCase(fetchDiscoveryRecipes.fulfilled, (state, action) => {
        if (state.discovery.requestId !== action.meta.requestId) return;
        state.discovery.items = action.payload;
        state.discovery.status = 'ready';
        state.discovery.requestId = undefined;
      })
      .addCase(fetchDiscoveryRecipes.rejected, (state, action) => {
        if (state.discovery.requestId !== action.meta.requestId) return;
        state.discovery.status = 'error';
        state.discovery.error = action.error.message ?? 'Could not load your collection';
        state.discovery.requestId = undefined;
      })
      .addCase(fetchMyRecipeCardsPage.pending, (state, action) => {
        state.mine.requestId = action.meta.requestId;
        state.mine.loading = true;
        state.mine.error = null;
      })
      .addCase(fetchMyRecipeCardsPage.fulfilled, (state, action) => {
        if (state.mine.requestId !== action.meta.requestId) return;
        state.mine.requestId = undefined;
        // Now you can use meta safely:
        const { reset, filters } = action.meta.arg as FetchMyRecipeCardsPageArgs;

        if (reset) {
          // new search / filters -> replace all
          cardsAdapter.setAll(state.cards, action.payload.items);
        } else {
          // pagination -> append/merge
          cardsAdapter.upsertMany(state.cards, action.payload.items);
        }

        state.mine.nextStartAfterCreatedAt = action.payload.nextStartAfterCreatedAt ?? null;
        state.mine.nextStartAfterTitle = action.payload.nextStartAfterTitle ?? null;
        state.mine.lastFilters = {
          searchTerm: filters?.searchTerm,
          tag: filters?.tag,
          category: filters?.category,
          difficulty: filters?.difficulty,
        };
        state.mine.loading = false;
        state.bootLoading = false;
      })
      .addCase(fetchMyRecipeCardsPage.rejected, (state, action) => {
        if (state.mine.requestId !== action.meta.requestId) return;
        state.mine.requestId = undefined;
        state.mine.loading = false;
        state.bootLoading = false;
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
        state.discovery = { items: [], ownerId: null, status: 'idle' };
        // optimistic: insert the returned card (timestamps null until refetch)
        cardsAdapter.upsertOne(state.cards, action.payload);
        state.mine.loading = false;
      })
      .addCase(createRecipe.rejected, (state, action) => {
        state.mine.loading = false;
        state.mine.error = action.error.message ?? 'Failed to create new recipe';
      })
      .addCase(updateRecipe.fulfilled, (state, action) => {
        const { recipe, card } = action.payload;
        state.currentRecipe = recipe;
        state.detail = { id: recipe.id, status: 'ready' };
        cardsAdapter.upsertOne(state.cards, card);
        const index = state.favorites.findIndex((item) => item.id === card.id);
        if (index >= 0) state.favorites[index] = card;
        state.discovery = { items: [], ownerId: null, status: 'idle' };
      })

      .addCase(removeRecipe.pending, (state) => {
        state.mine.loading = true;
        state.mine.error = null;
      })
      .addCase(removeRecipe.fulfilled, (state, action) => {
        if (state.currentRecipe?.id === action.payload) {
          state.currentRecipe = null;
          state.detail = { id: action.payload, status: 'not-found' };
        }
        state.discovery.items = state.discovery.items.filter(
          (recipe) => recipe.id !== action.payload,
        );
        state.favorites = state.favorites.filter((recipe) => recipe.id !== action.payload);
        // optimistic: insert the returned card (timestamps null until refetch)
        cardsAdapter.removeOne(state.cards, action.payload);
        state.mine.loading = false;
      })
      .addCase(removeRecipe.rejected, (state, action) => {
        state.mine.loading = false;
        state.mine.error = action.error.message ?? 'Failed to delete recipe';
      })

      .addCase(fetchRecipeById.pending, (state, action) => {
        state.detail = { id: action.meta.arg, status: 'loading', requestId: action.meta.requestId };
      })
      .addCase(fetchRecipeById.fulfilled, (state, action) => {
        if (state.detail.requestId !== action.meta.requestId) return;
        state.currentRecipe = action.payload;
        state.detail = { id: action.meta.arg, status: action.payload ? 'ready' : 'not-found' };
      })
      .addCase(fetchRecipeById.rejected, (state, action) => {
        if (state.detail.requestId !== action.meta.requestId) return;
        state.detail = {
          id: action.meta.arg,
          status: 'error',
          error: String(action.payload ?? 'Could not load this recipe. Please try again.'),
        };
      })

      .addCase(saveSoloRatingThunk.pending, (state) => {
        // state.mine.loading = true;
        state.mine.error = null;
      })
      .addCase(saveSoloRatingThunk.fulfilled, (state, action) => {
        const { id, cat, value } = action.payload;
        const discoveryCard = state.discovery.items.find((recipe) => recipe.id === id);
        if (discoveryCard)
          discoveryCard.ratingCategories = { ...discoveryCard.ratingCategories, [cat]: value };
        const card = state.cards.entities[id];
        if (card) card.ratingCategories = { ...card.ratingCategories, [cat]: value };
        if (state.currentRecipe?.id === id)
          state.currentRecipe.ratingCategories = {
            ...state.currentRecipe.ratingCategories,
            [cat]: value,
          };
        const favorite = state.favorites.find((recipe) => recipe.id === id);
        if (favorite) favorite.ratingCategories = { ...favorite.ratingCategories, [cat]: value };
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
        const discoveryCard = state.discovery.items.find((recipe) => recipe.id === id);
        if (card) card.isFavorite = fav;
        if (discoveryCard) discoveryCard.isFavorite = fav;
        if (state.currentRecipe?.id === id) state.currentRecipe.isFavorite = fav;
        const favorite = state.favorites.find((recipe) => recipe.id === id);
        if (favorite) favorite.isFavorite = fav;
        const updated =
          discoveryCard ??
          card ??
          (state.currentRecipe?.id === id ? state.currentRecipe : undefined);
        if (fav && updated && !favorite) {
          state.favorites.push(updated);
        } else if (!fav) {
          state.favorites = state.favorites.filter((recipe) => recipe.id !== id);
        }
      })
      .addCase(toggleFavorite.rejected, (state, action) => {
        state.mine.error = action.error.message ?? 'Failed to toggle favorite';
      });
  },
});

export const { startBootLoading, startOptimisticLoading, resetMine, invalidateDiscovery } =
  recipesSlice.actions;
export default recipesSlice.reducer;
