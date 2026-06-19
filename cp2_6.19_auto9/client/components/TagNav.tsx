import React from 'react';
import { Tag } from '../types';

type SortMode = 'latest' | 'hot';

interface TagNavProps {
  tags: Tag[];
  selectedTag: string | null;
  onSelectTag: (tagId: string | null) => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
}

const TagNav: React.FC<TagNavProps> = ({ tags, selectedTag, onSelectTag, sortMode, onSortChange }) => {
  return (
    <nav className="tag-nav">
      <div className="tag-nav__inner">
        <div className="tag-nav__tags">
          <button
            className={`tag-nav__item ${!selectedTag ? 'tag-nav__item--active' : ''}`}
            onClick={() => onSelectTag(null)}
          >
            全部
            <span className="tag-nav__underline"></span>
          </button>
          {tags.map(tag => (
            <button
              key={tag.id}
              className={`tag-nav__item ${selectedTag === tag.id ? 'tag-nav__item--active' : ''}`}
              onClick={() => onSelectTag(tag.id)}
              style={{ '--tag-color': tag.color } as React.CSSProperties}
            >
              {tag.name}
              <span className="tag-nav__underline"></span>
            </button>
          ))}
        </div>

        <div className="tag-nav__sort">
          <button
            className={`sort-btn ${sortMode === 'latest' ? 'sort-btn--active' : ''}`}
            onClick={() => onSortChange('latest')}
          >
            <span className="sort-btn__icon">🕐</span>
            最新
          </button>
          <button
            className={`sort-btn ${sortMode === 'hot' ? 'sort-btn--active' : ''}`}
            onClick={() => onSortChange('hot')}
          >
            <span className="sort-btn__icon">🔥</span>
            热门
          </button>
        </div>
      </div>
    </nav>
  );
};

export default TagNav;
