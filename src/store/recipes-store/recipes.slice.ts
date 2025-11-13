import {
  createAsyncThunk,
  createEntityAdapter,
  createSlice,
  PayloadAction,
} from '@reduxjs/toolkit';

import { RecipeCard } from '@api/models/recipes';
import {
  getRecipe,
  addRecipePair,
  listRecipeCardsByOwnerPaged,
  deleteRecipePair,
} from '@api/services';
import { CreateRecipeInput, RootState } from '@api/types';

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
};

const initialState: RecipesState = {
  cards: cardsAdapter.getInitialState(),
  mine: { loading: false, error: null, nextStartAfter: null, pageSize: 24 },
};

export const fetchMyRecipeCardsPage = createAsyncThunk(
  'recipes/fetchMinePage',
  async ({ uid, pageSize }: { uid: string; pageSize?: number }, { getState }) => {
    const state = getState() as RootState;
    console.log('here');

    const { nextStartAfter } = state.recipes.mine;
    const size = pageSize ?? state.recipes.mine.pageSize;
    const res = await listRecipeCardsByOwnerPaged(uid, size, nextStartAfter ?? undefined);
    console.log('here res', res);

    return { ...res };
  },
);

export const fetchRecipeDetails = createAsyncThunk('recipes/fetchDetails', async (id: string) => {
  const doc = await getRecipe(id);
  return doc; // full Recipe or null
});

export const fetchRecipeById = createAsyncThunk('recipes/fetchOne', async (id: string) => {
  return await getRecipe(id);
});

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
      });

    // .addCase(fetchRecipeDetails.fulfilled, (state, action) => {
    //   const recipe = action.payload as RecipeEntity | null;
    //   if (!recipe?.id) return;

    //   // merge heavy fields into the existing entity
    //   recipesAdapter.upsertOne(state.entities, {
    //     ...recipe,
    //     createdAt: typeof recipe.createdAt === 'number' ? recipe.createdAt : null,
    //     updatedAt: typeof recipe.updatedAt === 'number' ? recipe.updatedAt : null,
    //   });
    // });

    // .addCase(createRecipe.pending, (s) => {
    //   s.loading = true;
    //   s.error = null;
    // })
    // .addCase(createRecipe.fulfilled, (s) => {
    //   s.loading = false;
    // })
    // .addCase(createRecipe.rejected, (s, a) => {
    //   s.loading = false;
    //   s.error = a.error.message ?? 'Error creating recipe';
    // })

    // .addCase(fetchRecipeById.fulfilled, (s, a: PayloadAction<Recipe | null>) => {
    //   s.selected = a.payload ?? null;
    // })
    // .addCase(saveRecipe.fulfilled, (s, a) => {
    //   // Optionally sync with items; simplest is to refetch list in UI
    // })
    // .addCase(removeRecipe.fulfilled, (s, a: PayloadAction<string>) => {
    //   s.items = s.items.filter((r) => r.id !== a.payload);
    // });
  },
});

export const { resetMine } = recipesSlice.actions;
export default recipesSlice.reducer;
