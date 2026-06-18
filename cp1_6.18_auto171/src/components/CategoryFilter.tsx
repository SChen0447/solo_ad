import React from 'react';
import { useDataStore, categoryLabels } from '../dataStore';
import type { Category } from '../types';

const CategoryFilter: React.FC = function CategoryFilter() {
  const currentCategory = useDataStore((state) => state.category);
  const setCategory = useDataStore((state) => state.setCategory);

  const categories: Category[] = ['all', 'tech', 'art', 'life', 'business'];

  return (
    <div className="category-filter">
      {categories.map((cat) => (
        <button
          key={cat}
          className={`filter-button ${currentCategory === cat ? 'active' : ''}`}
          onClick={() => setCategory(cat)}
        >
          {categoryLabels[cat]}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
