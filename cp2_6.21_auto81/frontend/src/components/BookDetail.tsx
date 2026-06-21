import React, { useState, useEffect } from 'react';
import { Book } from '../types';
import { useBooks } from '../BookContext';
import ProgressRing from './ProgressRing';

interface BookDetailProps {
  book: Book;
  onClose: () => void;
}

const PencilIcon: React.FC<{ className?: string; onClick?: () => void }> = ({ className, onClick }) => (
  <svg
    className={className}
    onClick={onClick}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className,
  style
}) => (
  <svg
    className={className}
    style={style}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={18}
    height={18}
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const BookDetail: React.FC<BookDetailProps> = ({ book, onClose }) => {
  const { updateProgress, updateBookInfo } = useBooks();
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState(false);
  const [titleValue, setTitleValue] = useState(book.title);
  const [authorValue, setAuthorValue] = useState(book.author);
  const [showTitleCheck, setShowTitleCheck] = useState(false);
  const [showAuthorCheck, setShowAuthorCheck] = useState(false);
  const [pagesRead, setPagesRead] = useState(book.pagesRead);

  const percent = book.totalPages > 0 ? (pagesRead / book.totalPages) * 100 : 0;

  useEffect(() => {
    setPagesRead(book.pagesRead);
  }, [book.pagesRead]);

  const handleTitleBlur = () => {
    if (titleValue.trim() && titleValue !== book.title) {
      updateBookInfo(book.id, titleValue.trim(), book.author);
      setShowTitleCheck(true);
      setTimeout(() => setShowTitleCheck(false), 300);
    } else {
      setTitleValue(book.title);
    }
    setEditingTitle(false);
  };

  const handleAuthorBlur = () => {
    if (authorValue.trim() && authorValue !== book.author) {
      updateBookInfo(book.id, book.title, authorValue.trim());
      setShowAuthorCheck(true);
      setTimeout(() => setShowAuthorCheck(false), 300);
    } else {
      setAuthorValue(book.author);
    }
    setEditingAuthor(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, type: 'title' | 'author') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'title') handleTitleBlur();
      else handleAuthorBlur();
    }
    if (e.key === 'Escape') {
      if (type === 'title') {
        setTitleValue(book.title);
        setEditingTitle(false);
      } else {
        setAuthorValue(book.author);
        setEditingAuthor(false);
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="book-detail-modal" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} aria-label="关闭">
          <CloseIcon />
        </button>

        <div className="detail-top">
          <div className="detail-cover">
            <img src={book.coverUrl} alt={book.title} />
            <ProgressRing percent={percent} />
          </div>

          <div className="detail-info">
            <div className="detail-title-row">
              {editingTitle ? (
                <input
                  className="detail-title-input"
                  value={titleValue}
                  onChange={e => setTitleValue(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={e => handleKeyDown(e, 'title')}
                  autoFocus
                />
              ) : (
                <h1 className="detail-title">{book.title}</h1>
              )}
              <PencilIcon
                className="edit-pencil"
                onClick={() => {
                  setTitleValue(book.title);
                  setEditingTitle(true);
                }}
              />
              {showTitleCheck && <CheckIcon className="check-mark" />}
            </div>

            <div className="detail-author-row">
              {editingAuthor ? (
                <input
                  className="detail-author-input"
                  value={authorValue}
                  onChange={e => setAuthorValue(e.target.value)}
                  onBlur={handleAuthorBlur}
                  onKeyDown={e => handleKeyDown(e, 'author')}
                  autoFocus
                />
              ) : (
                <p className="detail-author">{book.author}</p>
              )}
              <PencilIcon
                className="edit-pencil"
                onClick={() => {
                  setAuthorValue(book.author);
                  setEditingAuthor(true);
                }}
              />
              {showAuthorCheck && <CheckIcon className="check-mark" />}
            </div>

            <div className="detail-tags">
              {book.tags.map(tag => (
                <span key={tag} className="tag-chip">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="detail-meta">
              <div>ISBN: {book.isbn}</div>
              <div>总页数: {book.totalPages} 页</div>
            </div>
          </div>
        </div>

        <div className="detail-progress-section">
          <div className="progress-label">
            阅读进度 · {Math.round(percent)}%
          </div>
          <input
            type="range"
            className="progress-slider"
            min={0}
            max={book.totalPages}
            value={pagesRead}
            onChange={e => {
              const val = parseInt(e.target.value, 10);
              setPagesRead(val);
            }}
            onMouseUp={() => updateProgress(book.id, pagesRead)}
            onTouchEnd={() => updateProgress(book.id, pagesRead)}
          />
          <div className="progress-pages">
            已读 {pagesRead} / {book.totalPages} 页
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
