import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowUpDown } from 'lucide-react';
import { useBookStore } from '@/stores/bookStore';
import { useDebounce } from '@/hooks/useDebounce';
import { getStockStatusText } from '@/utils/dateUtils';
import type { SortOption } from '@/types';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'price-asc', label: '价格从低到高' },
  { value: 'price-desc', label: '价格从高到低' },
  { value: 'year-asc', label: '出版年份从早到晚' },
  { value: 'year-desc', label: '出版年份从晚到早' },
];

export default function Library() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 200);
  const { setSearchQuery, setSortOption, getFilteredBooks, sortOption } = useBookStore();

  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  const filteredBooks = useMemo(() => getFilteredBooks(), [getFilteredBooks]);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value as SortOption);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4 container-transition">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">图书列表</h1>
          <p className="text-gray-600">浏览我们精选的50本图书，在线预约，到店自提</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜索书名或作者..."
                value={searchInput}
                onChange={handleSearchChange}
                className="input-field pl-12"
              />
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="text-gray-400 w-5 h-5" />
              <select
                value={sortOption}
                onChange={handleSortChange}
                className="input-field w-full md:w-48 cursor-pointer"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {debouncedSearch && (
            <p className="mt-3 text-sm text-gray-500">
              搜索 "{debouncedSearch}"，找到 {filteredBooks.length} 本相关图书
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <Link
              key={book.id}
              to={`/book/${book.id}`}
              className="card p-5 block no-underline text-inherit"
            >
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="book-cover"
                    loading="lazy"
                  />
                  <span
                    className={`stock-tag absolute -top-2 -right-2 ${book.status}`}
                  >
                    {getStockStatusText(book.status)}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 text-center mb-1 line-clamp-2 min-h-[3.5rem]">
                  {book.title}
                </h3>
                <p className="text-gray-500 text-sm mb-2">{book.author}</p>
                <p className="text-xl font-bold text-primary">¥{book.price.toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {book.publisher} · {book.publishYear}年
                </p>
              </div>
            </Link>
          ))}
        </div>

        {filteredBooks.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-gray-500 text-lg">没有找到相关图书</p>
            <p className="text-gray-400 mt-2">请尝试其他搜索关键词</p>
          </div>
        )}
      </div>
    </div>
  );
}
