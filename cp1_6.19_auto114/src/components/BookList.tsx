import React, { useMemo } from 'react';
import BookCard from './BookCard';
import SearchBar from './SearchBar';
import type { Book, BookGenre, BookStatus } from '@/types';

interface BookListProps {
  books: Book[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedGenre: BookGenre | 'all';
  onGenreChange: (g: BookGenre | 'all') => void;
  selectedStatus: BookStatus | 'all';
  onStatusChange: (s: BookStatus | 'all') => void;
  onBookClick: (bookId: string) => void;
  onDeleteBook: (bookId: string) => void;
  onAddBook: () => void;
  filterGenreFromStats?: BookGenre | null;
}

const BookList: React.FC<BookListProps> = ({
  books,
  searchQuery,
  onSearchChange,
  selectedGenre,
  onGenreChange,
  selectedStatus,
  onStatusChange,
  onBookClick,
  onDeleteBook,
  onAddBook,
  filterGenreFromStats,
}) => {
  const filteredBooks = useMemo(() => {
    const start = performance.now();
    const q = searchQuery.trim().toLowerCase();
    const genreFilter = filterGenreFromStats || selectedGenre;

    let result = books.filter((book) => {
      const matchesSearch =
        q === '' ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q);
      const matchesGenre = genreFilter === 'all' || book.genre === genreFilter;
      const matchesStatus = selectedStatus === 'all' || book.status === selectedStatus;
      return matchesSearch && matchesGenre && matchesStatus;
    });

    result = result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const elapsed = performance.now() - start;
    if (elapsed > 50) {
      console.warn(`搜索过滤耗时: ${elapsed.toFixed(1)}ms`);
    }
    return result;
  }, [books, searchQuery, selectedGenre, selectedStatus, filterGenreFromStats]);

  return (
    <div className="book-list-page page-fade-in">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">
            <svg className="title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            我的书架
          </h1>
          <p className="page-subtitle">共 {books.length} 本书 · {filteredBooks.length} 本匹配</p>
        </div>
        {filterGenreFromStats && (
          <div className="genre-filter-badge" onClick={() => onGenreChange('all')}>
            筛选：{filterGenreFromStats}
            <span className="remove-filter">✕</span>
          </div>
        )}
      </div>

      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        selectedGenre={filterGenreFromStats || selectedGenre}
        onGenreChange={onGenreChange}
        selectedStatus={selectedStatus}
        onStatusChange={onStatusChange}
        onAddBook={onAddBook}
      />

      {filteredBooks.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <h3>暂无匹配的书籍</h3>
          <p>试试调整搜索条件，或添加一本新书吧</p>
        </div>
      ) : (
        <div className="book-grid">
          {filteredBooks.map((book, idx) => (
            <BookCard
              key={book.id}
              book={book}
              index={idx}
              onClick={() => onBookClick(book.id)}
              onDelete={() => onDeleteBook(book.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BookList;
