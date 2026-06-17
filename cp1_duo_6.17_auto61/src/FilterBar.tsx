import { CategoryType } from './componentData';

interface FilterBarProps {
  selectedCategory: CategoryType;
  onCategoryChange: (category: CategoryType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  primaryColor: string;
  showFavoritesOnly: boolean;
  onShowFavoritesChange: (show: boolean) => void;
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
  primaryColor,
  showFavoritesOnly,
  onShowFavoritesChange
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
      <label
        className="flex items-center gap-2 cursor-pointer select-none"
        style={{ transition: 'all 0.2s ease' }}
      >
        <button
          role="switch"
          aria-checked={showFavoritesOnly}
          onClick={() => onShowFavoritesChange(!showFavoritesOnly)}
          className="relative inline-flex h-6 w-11 items-center rounded-full"
          style={{
            backgroundColor: showFavoritesOnly ? primaryColor : '#d1d5db',
            transition: 'background-color 0.2s ease'
          }}
        >
          <span
            className="inline-block h-4 w-4 transform rounded-full bg-white"
            style={{
              transform: showFavoritesOnly ? 'translateX(24px)' : 'translateX(4px)',
              transition: 'transform 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }}
          />
        </button>
        <span className="text-sm text-gray-700 whitespace-nowrap">
          <svg
            className="inline w-4 h-4 mr-0.5 -mt-0.5"
            viewBox="0 0 24 24"
            fill={showFavoritesOnly ? primaryColor : 'none'}
            stroke={showFavoritesOnly ? primaryColor : '#6b7280'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          只看收藏
        </span>
      </label>
    </div>
  );
}

export default FilterBar;
