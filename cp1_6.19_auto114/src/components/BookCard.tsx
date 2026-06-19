import React, { memo } from 'react';
import ProgressBar from './ProgressBar';
import type { Book } from '@/types';
import { calculateReadingProgress } from '@/utils/statsCalculator';

interface BookCardProps {
  book: Book;
  onClick: () => void;
  onDelete: () => void;
  index: number;
}

const statusLabels: Record<string, string> = {
  reading: '在读',
  completed: '已完成',
  not_started: '未开始',
};

const BookCard: React.FC<BookCardProps> = memo(({ book, onClick, onDelete, index }) => {
  const progress = calculateReadingProgress(book);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`确定要删除《${book.title}》吗？相关笔记也将一并删除。`)) {
      onDelete();
    }
  };

  return (
    <div
      className="book-card"
      onClick={onClick}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="book-spine-line" />
      <div className="book-cover-wrapper">
        <img
          src={book.coverImage}
          alt={book.title}
          className="book-cover-img"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/default/300/400';
          }}
        />
        <span className={`status-tag status-${book.status}`}>
          {statusLabels[book.status]}
        </span>
        <button
          className="delete-btn"
          onClick={handleDelete}
          aria-label="删除书本"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>

      <div className="book-info">
        <h3 className="book-title" title={book.title}>{book.title}</h3>
        <p className="book-author">{book.author}</p>
        <div className="book-meta">
          <span className="genre-tag">{book.genre}</span>
          <span className="page-count">
            {book.currentPage}/{book.totalPages} 页
          </span>
        </div>
        <ProgressBar book={book} showLabel={true} />
      </div>
    </div>
  );
});

BookCard.displayName = 'BookCard';

export default BookCard;
