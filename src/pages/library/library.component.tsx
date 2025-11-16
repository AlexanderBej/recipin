import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import { Input } from '@shared/ui';
import { FavoriteCard, RecipeCard, TagSheet } from '@components';
import { selectAllRecipes } from '@store/recipes-store';
import { selectAuthUserId } from '@store/auth-store';

import './library.styles.scss';

const Library: React.FC = () => {
  const recipes = useSelector(selectAllRecipes);
  const uid = useSelector(selectAuthUserId);

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
        <h3>Favorites</h3>
        <div className="recipes-list">
          {recipes.map((recipe) => (
            <FavoriteCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      </div>

      <div className="all-recipes-list">
        <h3>All recipes</h3>
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
