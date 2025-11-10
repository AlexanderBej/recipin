import React, { useState } from 'react';

import './library.styles.scss';
import { Input } from '@shared/ui';

const Library: React.FC = () => {
  const [search, setSearch] = useState<string>('');

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
    </div>
  );
};

export default Library;
