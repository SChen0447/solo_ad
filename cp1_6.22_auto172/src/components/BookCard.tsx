import React, { useState, useEffect, useRef } from 'react';
import type { Book } from '../api';

interface BookCardProps {
  book: Book;
  onProgressUpdate: (bookId: string, currentPage: number) => void;
  onClick: (bookId: string) => void;
  index: number;
}

const BookCard: React.FC<BookCardProps> = ({ book, onProgressUpdate, onClick, index }) => {
  const [currentPage, setCurrentPage] = useState(book.currentPage);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [editing, setEditing] = useState(false);
  const [inputPage, setInputPage] = useState(String(book.currentPage));
  const [visible, setVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const prevProgressRef = useRef(0);

  useEffect(() => {
    setCurrentPage(book.currentPage);
  }, [book.currentPage]);

  useEffect(() => {
    const targetProgress = book.totalPages > 0 ? (currentPage / book.totalPages) * 100 : 0;
    const timer = setTimeout(() => {
      setAnimatedProgress(targetProgress);
    }, 100);
    return () => clearTimeout(timer);
  }, [currentPage, book.totalPages]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), index * 100);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    return () => observer.disconnect();
  }, [index]);

  const percentage = book.totalPages > 0 ? Math.round((currentPage / book.totalPages) * 100) : 0;
  const remainingPages = book.totalPages - currentPage;
  const remainingMinutes = remainingPages / 1.2;
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = Math.round(remainingMinutes % 60);

  const handleProgressSubmit = () => {
    const page = parseInt(inputPage, 10);
    if (!isNaN(page) && page >= 0 && page <= book.totalPages) {
      setCurrentPage(page);
      onProgressUpdate(book.id, page);
      setEditing(false);
      prevProgressRef.current = currentPage;
    }
  };

  const statusText = currentPage === 0
    ? '未开始'
    : currentPage >= book.totalPages
    ? '已读完'
    : `阅读中 ${percentage}%`;

  const statusColor = currentPage === 0
    ? '#94a3b8'
    : currentPage >= book.totalPages
    ? '#22c55e'
    : '#3b82f6';

  return (
    <div
      ref={cardRef}
      className="book-card"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
      onClick={() => onClick(book.id)}
    >
      <div className="book-card-cover">
        <img src={book.cover} alt={book.title} loading="lazy" />
      </div>
      <div className="book-card-info">
        <div className="book-card-title">{book.title}</div>
        <div className="book-card-author">{book.author}</div>
      </div>
      <div className="book-card-progress-section" onClick={(e) => e.stopPropagation()}>
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${animatedProgress}%` }}
          />
        </div>
        <div className="progress-info">
          <span className="progress-status" style={{ color: statusColor }}>
            {statusText}
          </span>
          {currentPage > 0 && currentPage < book.totalPages && (
            <span className="progress-time">
              剩余约{remainingHours > 0 ? `${remainingHours}小时` : ''}{remainingMins}分钟
            </span>
          )}
        </div>
        {!editing ? (
          <button
            className="progress-update-btn"
            onClick={(e) => {
              e.stopPropagation();
              setInputPage(String(currentPage));
              setEditing(true);
            }}
          >
            更新进度
          </button>
        ) : (
          <div className="progress-edit" onClick={(e) => e.stopPropagation()}>
            <input
              type="number"
              min={0}
              max={book.totalPages}
              value={inputPage}
              onChange={(e) => setInputPage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleProgressSubmit()}
              className="progress-input"
              autoFocus
            />
            <span className="progress-total">/ {book.totalPages}页</span>
            <button className="progress-confirm-btn" onClick={handleProgressSubmit}>
              ✓
            </button>
            <button
              className="progress-cancel-btn"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(false);
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookCard;
