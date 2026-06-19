import React, { useState } from 'react';
import { Tag } from '../types';

interface TagNavProps {
  tags: Tag[];
  selectedTag: string | null;
  onSelectTag: (tagId: string | null) => void;
}

const TagNav: React.FC<TagNavProps> = ({ tags, selectedTag, onSelectTag }) => {
  return (
    <nav className="tag-nav">
      <div className="tag-nav__inner">
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
    </nav>
  );
};

export default TagNav;
