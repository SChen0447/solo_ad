import React from 'react';

interface TagBadgeProps {
  tag: string;
  isActive: boolean;
  onClick: (tag: string) => void;
}

const TagBadge: React.FC<TagBadgeProps> = ({ tag, isActive, onClick }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(tag);
  };

  return (
    <span
      className={`tag-badge ${isActive ? 'active' : ''}`}
      onClick={handleClick}
    >
      #{tag}
    </span>
  );
};

export default TagBadge;
