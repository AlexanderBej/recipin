import React, { useCallback, useEffect } from 'react';
import clsx from 'clsx';

import { TAGS } from '@api/misc';
import { TagCategory } from '@api/types';

import './tag-chips.styles.scss';

interface TagChipsProps {
  selected: string[]; // current selected tags
  onChange: (next: string[]) => void; // notify parent
  categories?: TagCategory[]; // optional subset to show
}

const TagChips: React.FC<TagChipsProps> = ({ selected, onChange, categories }) => {
  const cats: TagCategory[] = categories ?? (Object.keys(TAGS) as TagCategory[]);

  const isSelected = useCallback((tag: string) => selected.includes(tag), [selected]);

  const toggle = useCallback(
    (tag: string) => {
      const set = new Set(selected);
      if (set.has(tag)) set.delete(tag);
      else set.add(tag);
      onChange([...set]);
    },
    [selected, onChange],
  );

  useEffect(() => {
    console.log('selected', selected);
  }, [selected]);

  const labelForCategory = (category: TagCategory): string => {
    switch (category) {
      case 'cuisine':
        return 'Cuisine';
      case 'dietary':
        return 'Dietary';
      case 'method':
        return 'Method';
      case 'occasion':
        return 'Occasion';
      case 'time':
        return 'Time';
      default:
        return category;
    }
  };

  return (
    <div className="tag-chips" role="group" aria-label="Recipe tags">
      {cats.map((category) => (
        <div className="chips-container" key={category}>
          <span className="chip-type-label">{labelForCategory(category)}</span>
          <div className="chip-list">
            {TAGS[category].map((tag) => {
              const active = isSelected(tag);
              <div className="chip">{tag}</div>;
              return (
                <button
                  key={`${category}:${tag}`}
                  type="button"
                  className={clsx('chip', { chip__active: active })}
                  aria-pressed={active}
                  onClick={() => toggle(tag)}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TagChips;
