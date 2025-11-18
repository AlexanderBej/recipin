import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CiCircleRemove } from 'react-icons/ci';

import { Button, Chip, Input, RecIcon } from '@shared/ui';
import {
  fetchMyRecipeCardsPage,
  selectAllRecipes,
  selectMyCardsHasMore,
  selectRecipesFavorites,
  selectRecipesLastFilters,
  selectRecipesLoading,
  startOptimisticLoading,
} from '@store/recipes-store';
import { AppDispatch } from '@api/types';
import { selectAuthUserId } from '@store/auth-store';
import { RecipeCard } from '@features/recipe-card';
import { CardLoading } from '@features/loading';
import { FilterSheet } from '@components';
import { RecipeCardFilters } from '@api/models';

import './library.styles.scss';

const Library: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const uid = useSelector(selectAuthUserId);
  const recipes = useSelector(selectAllRecipes);
  const recipesLoading = useSelector(selectRecipesLoading);
  const favorites = useSelector(selectRecipesFavorites);
  const lastFilters = useSelector(selectRecipesLastFilters);
  const hasMore = useSelector(selectMyCardsHasMore);

  const [recFilters, setRecFilters] = useState<RecipeCardFilters>({
    searchTerm: lastFilters?.searchTerm ?? '',
    tag: lastFilters?.tag ?? '',
    category: lastFilters?.category,
    difficulty: lastFilters?.difficulty,
  });

  const lastSearchRef = useRef<string | undefined>('');
  const lastTagsKeyRef = useRef<string | undefined>('');
  const lastCategoryKeyRef = useRef<string | undefined>('');
  const lastDifficultyKeyRef = useRef<string | undefined>('');

  useEffect(() => {
    if (!uid) return;

    const { searchTerm, tag, category, difficulty } = recFilters;

    // If nothing actually changed compared to last time, do nothing
    if (
      searchTerm === lastSearchRef.current &&
      tag === lastTagsKeyRef.current &&
      category === lastCategoryKeyRef.current &&
      difficulty === lastDifficultyKeyRef.current
    ) {
      return;
    }

    console.log('filters', recFilters);

    dispatch(startOptimisticLoading());
    lastSearchRef.current = searchTerm;
    lastTagsKeyRef.current = tag;
    lastCategoryKeyRef.current = category;
    lastDifficultyKeyRef.current = difficulty;

    const handler = setTimeout(() => {
      dispatch(
        fetchMyRecipeCardsPage({
          uid,
          reset: true, // new search / filter -> reset pagination
          filters: {
            tag,
            searchTerm,
            category,
            difficulty,
          },
        }),
      );
    }, 300); // 300ms debounce

    return () => clearTimeout(handler);
  }, [uid, recFilters, dispatch]);

  const handleLoadMore = () => {
    if (!uid || !hasMore || recipesLoading) return;

    dispatch(
      fetchMyRecipeCardsPage({
        uid,
        reset: false, // ✅ pagination, no reset
        filters: {
          tag: recFilters.tag || undefined,
          searchTerm: recFilters.searchTerm || undefined,
          category: recFilters.category || undefined,
          difficulty: recFilters.difficulty || undefined,
        },
      }),
    );
  };

  const getSelectedChip = (key: 'category' | 'difficulty' | 'tag', chip: string) => {
    return (
      <div className="selected-filter">
        <div className="filter-remove">
          <RecIcon icon={CiCircleRemove} size={18} className="filter-remove-icon" />
        </div>
        <Chip
          tag={chip}
          onToggle={() =>
            setRecFilters((prev) => {
              return { ...prev, [key]: undefined };
            })
          }
          active
        />
      </div>
    );
  };

  console.log('recipes', recipes);

  return (
    <div className="library-contaier">
      <div className="library-filters">
        <div className="search-row">
          <Input
            className="search-input"
            placeholder="Search by name or ingredient"
            name="searchTerm"
            value={recFilters.searchTerm}
            prefix="search"
            onChange={(e) =>
              setRecFilters((prev) => {
                return { ...prev, searchTerm: e.target.value };
              })
            }
            handleReset={() =>
              setRecFilters((prev) => {
                return { ...prev, searchTerm: '' };
              })
            }
          />

          <FilterSheet
            selected={{ tag: recFilters.tag, category: recFilters.category }}
            onChange={(filt) =>
              setRecFilters((prev) => {
                return {
                  ...prev,
                  tag: filt.tag,
                  category: filt.category,
                  difficulty: filt.difficulty,
                };
              })
            }
          />
        </div>
        <div className="selected-filters-container">
          {recFilters.tag && getSelectedChip('tag', recFilters.tag)}
          {recFilters.category && getSelectedChip('category', recFilters.category)}
          {recFilters.difficulty && getSelectedChip('difficulty', recFilters.difficulty)}
        </div>
      </div>

      <div className="favorites-list">
        <h3 className="libary-heading">Favorites</h3>
        <div className="recipes-list">
          {favorites.map((favRec) => (
            <RecipeCard key={favRec.id} recipe={favRec} type="favorite" />
          ))}
        </div>
      </div>

      <div className="all-recipes-list">
        <h3 className="libary-heading">All recipes</h3>
        <div className="recipes-list">
          {!recipesLoading && recipes && recipes.length > 0 ? (
            recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} type="detailed" />)
          ) : recipesLoading ? (
            <CardLoading />
          ) : (
            <p>No recipes found</p>
          )}
        </div>

        {hasMore && (
          <div className="has-more-btn-wrapper">
            <Button variant="neutral" onClick={handleLoadMore} className="has-more-btn">
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
