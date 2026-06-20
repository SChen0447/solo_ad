import React from 'react';
import { CATEGORY_CONFIG, CategoryKey } from '@/types';

interface CategoryBadgeProps {
  category: CategoryKey;
}

const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  const config = CATEGORY_CONFIG[category];

  return (
    <span
      className="inline-flex items-center justify-center px-2 py-1 text-white text-[12px] font-medium"
      style={{
        backgroundColor: config.color,
        borderRadius: '8px',
      }}
    >
      {config.label}
    </span>
  );
};

export default CategoryBadge;
