import React, { useState } from 'react';
import { IoChevronDown } from 'react-icons/io5';
import { FaCheck } from 'react-icons/fa';

import { Dropdown, RecIcon } from '@shared/ui';
import { useClipboard } from '@shared/hooks';
import { GroceryItem } from '@api/models';
import { buildIngredientText, getCssVar } from '@shared/utils';

import './copy-dropdown.styles.scss';

interface CopyDropdownProps {
  small?: boolean;
  ingredients: GroceryItem[];
}

const CopyDropdown: React.FC<CopyDropdownProps> = ({ small = false, ingredients }) => {
  const { copy, copied } = useClipboard();
  const [copiedRef, setCopiedRef] = useState<Record<string, boolean>>({
    all: false,
    remaining: false,
  });

  const handleCopyAll = () => {
    copy(buildIngredientText(ingredients, { onlyUnchecked: false }));
    setCopiedRef({ all: true, remaining: false });
  };

  const handleCopyRemaining = () => {
    copy(buildIngredientText(ingredients, { onlyUnchecked: true }));
    setCopiedRef({ all: false, remaining: true });
  };

  return (
    <Dropdown
      customClassName="copy-dropdown"
      trigger={({ toggle }) => (
        <button onClick={toggle} className={`copy-button${small ? ' copy-button__small' : ''}`}>
          <span>Copy</span>
          <RecIcon icon={IoChevronDown} size={18} className="copy-chevron" />
        </button>
      )}
      menu={() => (
        <>
          <button className="menu-copy-btn" type="button" onClick={handleCopyAll}>
            <div className="copy-succes">
              {copied && copiedRef.all && (
                <RecIcon icon={FaCheck} size={18} color={getCssVar('--color-success')} />
              )}
            </div>
            Copy all
          </button>
          <button className="menu-copy-btn" type="button" onClick={handleCopyRemaining}>
            <div className="copy-succes">
              {copied && copiedRef.remaining && (
                <RecIcon icon={FaCheck} size={18} color={getCssVar('--color-success')} />
              )}
            </div>
            Copy remaining
          </button>
        </>
      )}
    />
  );
};

export default CopyDropdown;
