import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Book } from '../types';
import { getPlaceholderColor } from '../utils';

interface BookCardProps {
  book: Book;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const navigate = useNavigate();
  const progress = book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0;

  const placeholderColor = getPlaceholderColor(book.title);

  const coverStyle = book.coverUrl
    ? { backgroundImage: `url(${book.coverUrl})` }
    : { backgroundColor: placeholderColor };

  return (
    <div className="book-card" onClick={() => navigate(`/book/${book.id}`)}>
      <div className="book-cover" style={coverStyle}>
        {!book.coverUrl && (
          <div className="book-cover-placeholder">
            {book.title.charAt(0)}
          </div>
        )}
      </div>
      <div className="book-info">
        <div className="book-title">{book.title}</div>
        <div className="book-author">{book.author}</div>
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-text">{progress}%</span>
        </div>
      </div>
    </div>
  );
};

export default BookCard;
