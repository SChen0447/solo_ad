import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Book } from '../types';

interface BookCardProps {
  book: Book;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const navigate = useNavigate();

  const progressPercent = (book as any).chapterCount 
    ? Math.min(100, (book as any).chapterCount * 10)
    : 0;

  const handleClick = () => {
    navigate(`/books/${book.id}`);
  };

  return (
    <div
      onClick={handleClick}
      style={styles.card}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
      }}
    >
      <div style={styles.coverContainer}>
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            style={styles.coverImage}
          />
        ) : (
          <div style={styles.coverPlaceholder}>
            <span style={styles.coverText}>{book.title.charAt(0)}</span>
          </div>
        )}
      </div>
      
      <div style={styles.content}>
        <h3 style={styles.title}>{book.title}</h3>
        <p style={styles.author}>{book.author}</p>
        
        <div style={styles.progressContainer}>
          <div style={styles.progressBarBg}>
            <div
              style={{
                ...styles.progressBarFill,
                width: `${progressPercent}%`,
                background: `linear-gradient(90deg, #e0e0e0 0%, #4a90d9 ${Math.max(progressPercent, 10)}%)`
              }}
            />
          </div>
          <span style={styles.progressText}>{progressPercent}%</span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#faf6f0',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  coverContainer: {
    width: '100%',
    aspectRatio: '2/3',
    overflow: 'hidden',
    backgroundColor: '#e8e0d5'
  },
  coverImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '0'
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d4c7b8'
  },
  coverText: {
    fontSize: '48px',
    fontWeight: 700,
    color: '#8b7355'
  },
  content: {
    padding: '16px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    margin: '0 0 4px 0',
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical'
  },
  author: {
    fontSize: '14px',
    color: '#888',
    margin: '0 0 12px 0'
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: 'auto'
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    transition: 'width 0.3s ease',
    borderRadius: 3
  },
  progressText: {
    fontSize: '12px',
    color: '#666',
    minWidth: '36px',
    textAlign: 'right'
  }
};

export default BookCard;
