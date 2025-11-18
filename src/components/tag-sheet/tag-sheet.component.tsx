import React, { useCallback, useState } from 'react';
import clsx from 'clsx';
import { IoChevronDown } from 'react-icons/io5';

import { TAGS } from '@api/misc';
import { TagCategory } from '@api/types';
import { BottomSheet, Chip, RecIcon } from '@shared/ui';
import { TagDef } from '@api/models';
import { displayTag } from '@shared/utils';

import './tag-sheet.styles.scss';

interface TagSheetProps {
  selected: string[]; // current selected tags
  onChange: (next: string[]) => void; // notify parent
  categories?: TagCategory[]; // optional subset to show
  closeOnOne?: boolean;
}

const TagSheet: React.FC<TagSheetProps> = ({
  selected,
  onChange,
  categories,
  closeOnOne = false,
}) => {
  const [open, setOpen] = useState(false);
  const cats: TagCategory[] = categories ?? (Object.keys(TAGS) as TagCategory[]);

  const isSelected = useCallback((tag: string) => selected.includes(tag), [selected]);

  const toggle = useCallback(
    (tag: string) => {
      const next = selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag];
      onChange(next);

      if (closeOnOne) setOpen(false);
    },
    [selected, onChange, closeOnOne],
  );

  const labelToCamelCase = (word: string) => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  };

  return (
    <div className="tag-chips" role="group" aria-label="Recipe tags">
      <div className="tags-header">
        <span>Tags</span>
        <button type="button" onClick={() => setOpen(true)} aria-label="Expand to show all tags">
          <RecIcon icon={IoChevronDown} size={12} className="expand" />
        </button>
        <BottomSheet open={open} onOpenChange={setOpen} title="All tags" size="tall" showHandle>
          {cats.map((category) => {
            // Filter out any tag that already appears in MAIN_TAGS to avoid duplicates
            const tags = TAGS[category] as readonly TagDef[];
            // const tags = list.filter((t: string) => !mainSet.has(t));

            if (tags.length === 0) return null;
            return (
              <div className="chips-container" key={category}>
                <span className="chip-type-label">{labelToCamelCase(category)}</span>
                <div className="chip-list">
                  {tags.map((tag, index) => {
                    const active = isSelected(tag.id);
                    return <Chip tag={tag.id} onToggle={toggle} active={active} key={index} />;
                  })}
                </div>
              </div>
            );
          })}
        </BottomSheet>
      </div>
      {selected && selected.length > 0 && selected[0] && (
        <div className="chips-row">
          <div className="selected-chips-list chip-list" aria-label="Selected tags">
            {selected.map((tag, index) => {
              const active = isSelected(tag);
              return (
                <button
                  key={index}
                  type="button"
                  className={clsx('chip', { chip__active: active })}
                  aria-pressed={active}
                  onClick={() => toggle(tag)}
                >
                  {displayTag(tag)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagSheet;
