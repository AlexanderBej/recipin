import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { Input } from '@shared/ui';
import { FavoriteCard, RecipeCard, TagSheet } from '@components';
import {
  fetchMyRecipeCardsPage,
  selectAllRecipes,
  selectRecipesFavorites,
  selectRecipesLastFilters,
} from '@store/recipes-store';
import { AppDispatch } from '@api/types';
import { selectAuthUserId } from '@store/auth-store';

import './library.styles.scss';

const Library: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const uid = useSelector(selectAuthUserId);
  const recipes = useSelector(selectAllRecipes);
  const favorites = useSelector(selectRecipesFavorites);
  const lastFilters = useSelector(selectRecipesLastFilters);

  const [search, setSearch] = useState<string>(lastFilters?.searchTerm ?? '');
  const [selectedTag, setSelectedTag] = useState<string>(lastFilters?.tag ?? '');

  const lastSearchRef = useRef<string>('');
  const lastTagsKeyRef = useRef<string>('');

  useEffect(() => {
    if (!uid) return;

    // If nothing actually changed compared to last time, do nothing
    if (search === lastSearchRef.current && selectedTag === lastTagsKeyRef.current) {
      return;
    }

    lastSearchRef.current = search;
    lastTagsKeyRef.current = selectedTag;

    const handler = setTimeout(() => {
      dispatch(
        fetchMyRecipeCardsPage({
          uid,
          reset: true, // new search / filter -> reset pagination
          filters: {
            tag: selectedTag,
            searchTerm: search || undefined,
            // category: ?? if later
          },
        }),
      );
    }, 300); // 300ms debounce

    return () => clearTimeout(handler);
  }, [uid, search, selectedTag, dispatch]);

  console.log('recipes', recipes);

  return (
    <div className="library-contaier">
      <Input
        className="search-input"
        placeholder="Search by name or ingredient"
        name="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        prefix="search"
      />

      <div className="tags-container">
        <TagSheet
          selected={[selectedTag]}
          onChange={(tags) => {
            console.log('tags', tags);

            setSelectedTag(tags[1]);
          }}
        />
      </div>

      <div className="favorites-list">
        <h3 className="libary-heading">Favorites</h3>
        <div className="recipes-list">
          {favorites.map((favRec) => (
            <FavoriteCard key={favRec.id} recipe={favRec} />
          ))}
        </div>
      </div>

      <div className="all-recipes-list">
        <h3 className="libary-heading">All recipes</h3>
        <div className="recipes-list">
          {recipes && recipes.length > 0 ? (
            recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)
          ) : (
            <p>No recipes found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Library;
