import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import { Input } from '@shared/ui';
import { FavoriteCard, RecipeCard, TagSheet } from '@components';
import { selectAllRecipes, selectRecipesFavorites } from '@store/recipes-store';

import './library.styles.scss';

const Library: React.FC = () => {
  const recipes = useSelector(selectAllRecipes);
  const favorites = useSelector(selectRecipesFavorites);

  const [search, setSearch] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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
        <TagSheet selected={selectedTags} onChange={(tags) => setSelectedTags(tags)} />
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
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Library;
