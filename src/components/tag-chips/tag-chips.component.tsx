import React, { useCallback } from 'react';
import clsx from 'clsx';
import { IoChevronDown } from 'react-icons/io5';

import { TAGS } from '@api/misc';
import { TagCategory } from '@api/types';
import { BottomSheet, Chip, RecIcon } from '@shared/ui';

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
      const next = selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag];

      onChange(next);
    },
    [selected, onChange],
  );

  const labelToCamelCase = (word: string) => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  };

  return (
    <div className="tag-chips" role="group" aria-label="Recipe tags">
      <div className="tags-header">
        <span>Tags</span>
        <BottomSheet
          trigger={
            <button type="button" aria-label="Expand to show all tags">
              <RecIcon icon={IoChevronDown} size={12} className="expand" />
            </button>
          }
          title="All tags"
          size="tall"
          showHandle
        >
          {cats.map((category) => {
            // Filter out any tag that already appears in MAIN_TAGS to avoid duplicates
            const tags = TAGS[category] as readonly string[];
            // const tags = list.filter((t: string) => !mainSet.has(t));

            if (tags.length === 0) return null;
            return (
              <div className="chips-container" key={category}>
                <span className="chip-type-label">{labelToCamelCase(category)}</span>
                <div className="chip-list">
                  {tags.map((tag) => {
                    const active = isSelected(tag);
                    return (
                      <Chip
                        tag={tag}
                        onToggle={toggle}
                        active={active}
                        key={`${category}:${tag}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </BottomSheet>
      </div>
      {selected && selected.length > 0 && (
        <div className="chips-row">
          <div className="selected-chips-list chip-list" aria-label="Selected tags">
            {selected.map((tag) => {
              const active = isSelected(tag);
              return (
                <button
                  key={tag}
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
      )}
    </div>
  );
};

export default TagChips;
