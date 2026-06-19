import React, { useState, useEffect, useRef } from 'react';
import type { BookGenre, BookStatus } from '@/types';
import { BOOK_GENRES } from '@/types';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedGenre: BookGenre | 'all';
  onGenreChange: (g: BookGenre | 'all') => void;
  selectedStatus: BookStatus | 'all';
  onStatusChange: (s: BookStatus | 'all') => void;
  onAddBook: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedGenre,
  onGenreChange,
  selectedStatus,
  onStatusChange,
  onAddBook,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`search-bar ${isFocused ? 'focused' : ''}`}>
      <div className="search-input-wrapper">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="搜索书名或作者..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {searchQuery && (
          <button
            className="clear-btn"
            onClick={() => onSearchChange('')}
            aria-label="清除搜索"
          >
            ✕
          </button>
        )}
      </div>

      <div className="filter-group">
        <select
          value={selectedGenre}
          onChange={(e) => onGenreChange(e.target.value as BookGenre | 'all')}
          className="filter-select"
        >
          <option value="all">全部类型</option>
          {BOOK_GENRES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value as BookStatus | 'all')}
          className="filter-select"
        >
          <option value="all">全部状态</option>
          <option value="reading">在读</option>
          <option value="completed">已完成</option>
          <option value="not_started">未开始</option>
        </select>

        <button className="add-book-btn" onClick={onAddBook}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>添加书本</span>
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
