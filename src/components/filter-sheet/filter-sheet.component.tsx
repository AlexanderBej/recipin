import React, { useEffect, useState } from 'react';
import { CiFilter } from 'react-icons/ci';

import { TAGS } from '@api/misc';
import { RECIPE_CATEGORIES, TagCategory } from '@api/types';
import { BottomSheet, Button, Chip, RecIcon } from '@shared/ui';
import { RecipeCardFilters, TagDef } from '@api/models';

import './filter-sheet.styles.scss';
import { getCssVar } from '@shared/utils';

interface TagSheetProps {
  selected: Omit<RecipeCardFilters, 'searchTerm'>; // current selected filters
  onChange: (next: Omit<RecipeCardFilters, 'searchTerm'>) => void; // notify parent
}

const FilterSheet: React.FC<TagSheetProps> = ({ selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const cats: TagCategory[] = Object.keys(TAGS) as TagCategory[];

  const [filters, setFilters] = useState<Omit<RecipeCardFilters, 'searchTerm'>>(selected);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    tag: false,
    category: false,
  });

  useEffect(() => {
    if (open) {
      setFilters(selected);
    }
  }, [open, selected]);

  const DIFFICULTIES = ['easy', 'intermediate', 'advanced'];

  const loadMoreButton = (name: string): React.ReactNode => {
    return (
      <div className="load-more-btn-wrapper">
        <Button
          variant="neutral"
          onClick={() =>
            setExpanded((prev) => {
              return { ...prev, [name]: true };
            })
          }
          className="load-more-btn"
        >
          Load More
        </Button>
      </div>
    );
  };

  const toggleFilter = (key: 'category' | 'difficulty' | 'tag', val: string) => {
    setFilters((prev) => {
      const current = prev[key];

      // if already selected, unselect it
      if (current === val) {
        return { ...prev, [key]: undefined };
      }

      // otherwise select it
      return { ...prev, [key]: val as any };
    });
  };

  const handleClearFilters = () => {
    const empty: Omit<RecipeCardFilters, 'searchTerm'> = {
      category: undefined,
      difficulty: undefined,
      tag: undefined,
    };

    setFilters(empty); // local
  };

  const handleApplyFilters = () => {
    onChange(filters);
    setOpen(false);
  };

  const hasChanges =
    filters.category !== selected.category ||
    filters.difficulty !== selected.difficulty ||
    filters.tag !== selected.tag;

  return (
    <div role="group" aria-label="Recipe tags">
      {/* <div className="tags-header"> */}
      <button type="button" onClick={() => setOpen(true)} aria-label="Expand to filter">
        <RecIcon
          icon={CiFilter}
          size={24}
          className="expand"
          color={getCssVar(
            selected.category || selected.difficulty || selected.tag
              ? '--color-primary'
              : '--color-text-primary',
          )}
        />
      </button>
      {/* </div> */}

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={
          filters.category || filters.difficulty || filters.tag ? (
            <button className="clear-all-btn" type="button" onClick={handleClearFilters}>
              Clear filters
            </button>
          ) : (
            'Filters'
          )
        }
        size="tall"
        showHandle
      >
        <div className="filter-sheet">
          <div className="filter-options">
            <h4>Category</h4>
            <div className="chip-list">
              {RECIPE_CATEGORIES.map((category, index) => {
                const active = filters.category === category;
                if (index > 6 && !expanded.category) return null;
                return (
                  <Chip
                    tag={category}
                    onToggle={(val) => toggleFilter('category', val)}
                    active={active}
                    key={index}
                  />
                );
              })}
            </div>
            {!expanded.category && loadMoreButton('category')}

            <h4>Difficulty</h4>
            <div className="chip-list">
              {DIFFICULTIES.map((diff, index) => {
                const active = filters.difficulty === diff;
                return (
                  <Chip
                    tag={diff}
                    onToggle={(val) => toggleFilter('difficulty', val)}
                    active={active}
                    key={index}
                  />
                );
              })}
            </div>

            <h4>Tag</h4>
            {cats.map((category) => {
              const tags = TAGS[category] as readonly TagDef[];
              if (tags.length === 0) return null;

              const visibleTags = expanded.tag ? tags : tags.slice(0, 4);
              return (
                <div className="chips-container" key={category}>
                  <div className="chip-list">
                    {visibleTags.map((tag, index) => {
                      const active = filters.tag === tag.id;
                      return (
                        <Chip
                          tag={tag.id}
                          onToggle={(val) => toggleFilter('tag', val)}
                          active={active}
                          key={index}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {!expanded.tag && loadMoreButton('tag')}
          </div>
          <div className="filter-btn-wrapper">
            <Button
              variant="primary"
              className="apply-filter-btn"
              onClick={handleApplyFilters}
              disabled={!hasChanges}
            >
              Apply filters
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};

export default FilterSheet;
