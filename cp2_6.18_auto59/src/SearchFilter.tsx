import React, { useState } from 'react';
import { CATEGORIES, Category } from './types';
import './SearchFilter.css';

interface SearchFilterProps {
  category: string;
  keyword: string;
  onCategoryChange: (category: string) => void;
  onKeywordChange: (keyword: string) => void;
  onCreateCard: () => void;
}

const SearchFilter: React.FC<SearchFilterProps> = ({
  category,
  keyword,
  onCategoryChange,
  onKeywordChange,
  onCreateCard
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="search-filter">
      <div className="filter-header">
        <h2 className="filter-title">知识卡片</h2>
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      <div className={`filter-content ${menuOpen ? 'open' : ''}`}>
        <div className="search-box">
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="搜索标题或内容..."
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-section">
          <h3 className="filter-section-title">分类筛选</h3>
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

        <button className="create-btn" onClick={onCreateCard}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新建卡片
        </button>
      </div>
    </div>
  );
};

export default SearchFilter;
