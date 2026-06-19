import { useState, useEffect, useRef } from 'react';
import type { Book } from '../types';

interface BookListProps {
  books: Book[];
  searchQuery: string;
  categoryFilter: string;
  categories: string[];
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onBookClick: (book: Book) => void;
  onRefresh: () => void;
}

function BookList({
  books,
  searchQuery,
  categoryFilter,
  categories,
  onSearchChange,
  onCategoryChange,
  onBookClick,
}: BookListProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [fadeKey, setFadeKey] = useState(0);
  const debounceTimer = useRef<number | null>(null);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = window.setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [localSearch, onSearchChange]);

  useEffect(() => {
    setFadeKey((prev) => prev + 1);
  }, [categoryFilter, searchQuery]);

  const isOverdue = (borrowDate?: string): boolean => {
    if (!borrowDate) return false;
    const borrowTime = new Date(borrowDate).getTime();
    const now = Date.now();
    const daysPassed = (now - borrowTime) / (1000 * 60 * 60 * 24);
    return daysPassed > 14;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">图书大厅</h1>
        <p className="page-subtitle">探索馆藏图书，开启您的阅读之旅</p>
      </div>

      <div className="search-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="搜索书名或作者..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>
        <select
          className="category-select"
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="all">全部分类</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {books.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-text">暂无符合条件的图书</div>
        </div>
      ) : (
        <div className="book-grid" key={fadeKey}>
          {books.map((book, index) => (
            <div
              key={book.id}
              className="book-card fade-enter"
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => onBookClick(book)}
            >
              <div className="book-cover-wrapper">
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="book-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://picsum.photos/seed/placeholder/200/280';
                  }}
                />
                {book.status === 'borrowed' && isOverdue(book.borrowDate) && (
                  <span className="overdue-bell" title="已逾期，请尽快归还">
                    🔔
                  </span>
                )}
                <span
                  className={`book-status-badge status-${book.status}`}
                >
                  {book.status === 'available' ? '可借' : '已借出'}
                </span>
              </div>
              <div className="book-info">
                <div className="book-title" title={book.title}>
                  {book.title}
                </div>
                <div className="book-author">{book.author}</div>
                <span className="book-category">{book.category}</span>
                {book.reserveQueue.length > 0 && (
                  <div className="reserve-count">
                    {book.reserveQueue.length} 人预约中
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BookList;
