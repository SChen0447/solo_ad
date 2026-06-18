import React from 'react';
import { CATEGORIES, Category } from './types';

interface SearchFilterProps {
  category: string;
  keyword: string;
  onCategoryChange: (category: string) => void;
  onKeywordChange: (keyword: string) => void;
}

const SearchFilter: React.FC<SearchFilterProps> = ({
  category,
  keyword,
  onCategoryChange,
  onKeywordChange
}) => {
  return (
    <div className="search-filter">
      <h2 className="sidebar-title">知识卡片</h2>

      <div className="search-box">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="搜索卡片..."
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="filter-section">
        <h3 className="filter-title">分类筛选</h3>
        <div className="category-buttons">
          <button
            className={`category-btn ${category === 'all' ? 'active' : ''}`}
            onClick={() => onCategoryChange('all')}
          >
            全部
          </button>
          {CATEGORIES.map((cat: Category) => (
            <button
              key={cat}
              className={`category-btn ${category === cat ? 'active' : ''}`}
              onClick={() => onCategoryChange(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchFilter;
