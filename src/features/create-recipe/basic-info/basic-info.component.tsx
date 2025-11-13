import React from 'react';

import { CreateRecipeForm, StepThreeProps } from '../create-recipe.misc';
import { Input, Select, SelectOption, Textarea } from '@shared/ui';
import { CATEGORY_META } from '@api/misc';
import { TagChips } from '@components';

import './basic-info.styles.scss';

const BasicInfo: React.FC<StepThreeProps> = ({ formData, handleChange, setFormData }) => {
  const CATEGORY_OPTIONS: SelectOption[] = Object.entries(CATEGORY_META).map(([value, label]) => ({
    value: value,
    label: label.label,
  }));

  const DIFFICULTY_OPTIONS: SelectOption[] = [
    { value: 'easy', label: 'Easy' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ];

  const handleTagsChange = (tags: string[]) => {
    setFormData((prev: CreateRecipeForm) => ({ ...prev, tags }));
  };

  return (
    <div className="basic-info-container">
      <Input
        name="title"
        label="Title"
        value={formData.title}
        onChange={handleChange}
        placeholder="e.g. Garlic Naan"
      />
      <Select
        label="Category"
        name="category"
        onChange={handleChange}
        options={CATEGORY_OPTIONS}
        value={formData.category}
      />
      <Textarea
        label="Description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        placeholder="Short summary"
      />
      <div className="prep-row">
        <Input
          name="prepMinutes"
          type="number"
          label="Prep Time"
          value={formData.prepMinutes}
          onChange={handleChange}
          placeholder="35"
        />
        <Input
          name="cookMinutes"
          type="number"
          label="Cook Minutes"
          value={formData.cookMinutes}
          onChange={handleChange}
          placeholder="40"
        />
      </div>
      <Select
        label="Difficulty"
        name="difficulty"
        onChange={handleChange}
        options={DIFFICULTY_OPTIONS}
        value={formData.difficulty ?? ''}
      />

      <Input name="imgURL" label="Image URL" value={formData.imageURL} onChange={handleChange} />
      <span className="tags-label">Tags</span>
      <TagChips selected={formData.tags ?? []} onChange={handleTagsChange} />
    </div>
  );
};

export default BasicInfo;
