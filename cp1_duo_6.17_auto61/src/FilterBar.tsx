import { CategoryType } from './componentData';

interface FilterBarProps {
  selectedCategory: CategoryType;
  onCategoryChange: (category: CategoryType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  primaryColor: string;
}

const categories: { value: CategoryType; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'button', label: '按钮' },
  { value: 'card', label: '卡片' },
  { value: 'input', label: '输入框' },
  { value: 'modal', label: '模态框' }
];

function FilterBar({
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  primaryColor
}: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <select
        value={selectedCategory}
        onChange={(e) => onCategoryChange(e.target.value as CategoryType)}
        className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none"
        style={{
          transition: 'all 0.2s ease'
        }}
      >
        {categories.map((cat) => (
          <option key={cat.value} value={cat.value}>
            {cat.label}
          </option>
        ))}
      </select>
      <div className="relative flex-1 w-full sm:max-w-md">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜索组件名称或标签..."
          className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none"
          style={{
            transition: 'all 0.2s ease'
          }}
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          fill="none"
          stroke={primaryColor}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </div>
  );
}

export default FilterBar;
