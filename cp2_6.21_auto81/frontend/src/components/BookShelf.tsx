import React, { useState, useMemo } from 'react';
import { useBooks } from '../BookContext';
import { Book } from '../types';
import ProgressRing from './ProgressRing';

interface BookShelfProps {
  onBookClick: (book: Book) => void;
  onOpenBlindBox: () => void;
}

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const BookShelf: React.FC<BookShelfProps> = ({ onBookClick, onOpenBlindBox }) => {
  const { books, addBook } = useBooks();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredBooks = useMemo(() => {
    const t0 = performance.now();
    const term = searchTerm.trim().toLowerCase();
    let result = books;
    if (term.length > 0) {
      result = books.filter(
        b => b.title.toLowerCase().includes(term) || b.author.toLowerCase().includes(term)
      );
    }
    const elapsed = performance.now() - t0;
    if (elapsed > 150) {
      console.warn(`Search filtering took ${elapsed.toFixed(0)}ms (exceeds 150ms target)`);
    }
    return result;
  }, [books, searchTerm]);

  const handleAddRandomBook = () => {
    const otherBooks = [
      {
        id: `manual_${Date.now()}`,
        title: '追风筝的人',
        author: '卡勒德·胡赛尼',
        coverUrl: 'https://picsum.photos/seed/zhuifengzheng/400/580',
        totalPages: 362,
        pagesRead: 0,
        tags: ['文学', '治愈'],
        isbn: '9787208061644'
      }
    ];
    const newBook = otherBooks[0];
    addBook(newBook);
    setShowAddModal(false);
  };

  return (
    <div>
      <div className="search-container">
        <div className="search-box">
          <SearchIcon className="search-icon" />
          <input
            type="text"
            placeholder="搜索书名或作者..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredBooks.length === 0 ? (
        <div className="no-result">没找到哦</div>
      ) : (
        <div className="books-grid">
          {filteredBooks.map((book, index) => {
            const percent = book.totalPages > 0 ? (book.pagesRead / book.totalPages) * 100 : 0;
            return (
              <div
                key={book.id}
                className="book-card"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => onBookClick(book)}
              >
                <div className="book-cover">
                  <img src={book.coverUrl} alt={book.title} loading="lazy" />
                  <ProgressRing percent={percent} />
                </div>
                <div className="book-title">{book.title}</div>
                <div className="book-author">{book.author}</div>
              </div>
            );
          })}
          <div
            className="book-card"
            style={{ animationDelay: `${filteredBooks.length * 0.1}s` }}
          >
            <button className="add-book-btn" onClick={() => setShowAddModal(true)}>
              <PlusIcon className="add-icon" />
              <span className="add-book-text">添加书籍</span>
            </button>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="book-detail-modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: 24, fontSize: 20 }}>添加书籍</h2>
            <p style={{ marginBottom: 24, color: '#9CA3AF' }}>
              点击下方按钮从预设书库中添加一本示例书籍（实际项目中可扩展为完整的添加表单）。
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                className="btn"
                style={{ background: '#374151' }}
                onClick={() => setShowAddModal(false)}
              >
                取消
              </button>
              <button
                className="btn btn-like"
                style={{ width: 140 }}
                onClick={handleAddRandomBook}
              >
                添加示例书籍
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookShelf;
