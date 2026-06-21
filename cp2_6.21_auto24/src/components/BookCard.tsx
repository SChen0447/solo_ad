import React, { useState } from 'react';

interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  coverUrl: string;
  category: string;
  status: 'available' | 'borrowed' | 'returning';
  lastBorrowed: string;
  colors: string[];
}

interface BookCardProps {
  book: Book;
  onClick: (id: string) => void;
}

const statusConfig: Record<string, { label: string; bg: string; icon: string }> = {
  available: { label: '可借', bg: '#10B981', icon: '✓' },
  borrowed: { label: '已借出', bg: '#F59E0B', icon: '🔒' },
  returning: { label: '待归还', bg: '#3B82F6', icon: '⏰' },
};

function getLastBorrowedColor(lastBorrowed: string): string {
  const now = new Date();
  const last = new Date(lastBorrowed);
  const days = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  const t = Math.min(days / 30, 1);
  const r1 = 253, g1 = 224, b1 = 71;
  const r2 = 99, g2 = 102, b2 = 241;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

const BookCard: React.FC<BookCardProps> = ({ book, onClick }) => {
  const gradient = book.colors
    ? `linear-gradient(135deg, ${book.colors[0]}, ${book.colors[1]})`
    : 'linear-gradient(135deg, #8B5CF6, #6366F1)';

  const statusInfo = statusConfig[book.status] || statusConfig.available;
  const dotColor = getLastBorrowedColor(book.lastBorrowed);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onClick(book.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 240,
        borderRadius: 12,
        overflow: 'hidden',
        background: gradient,
        cursor: 'pointer',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        position: 'relative',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.15)' : 'none',
      }}
    >
      <div
        style={{
          height: 180,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.1)',
        }}
      >
        <img
          src={book.coverUrl}
          alt={book.title}
          loading="lazy"
          className="book-cover-fade"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.3s ease, filter 0.3s ease',
            transform: hovered ? 'scale(1.08)' : 'scale(1)',
            filter: hovered ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))' : 'none',
          }}
        />
      </div>
      <div style={{ padding: '12px', transition: 'color 0.3s ease', color: hovered ? '#8B5CF6' : '#fff' }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textShadow: hovered ? 'none' : '0 1px 2px rgba(0,0,0,0.3)',
            transition: 'text-shadow 0.3s ease',
          }}
        >
          {book.title}
        </div>
        <div
          style={{
            fontSize: 12,
            opacity: hovered ? 0.95 : 0.85,
            marginTop: 4,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            transition: 'opacity 0.3s ease',
          }}
        >
          {book.author}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 10,
              background: statusInfo.bg,
              color: '#fff',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 12, display: 'inline-block', lineHeight: 1 }}>{statusInfo.icon}</span>
            {statusInfo.label}
          </span>
          <span
            className="pulse-dot"
            title="距上次借阅天数"
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: dotColor,
              display: 'inline-block',
              boxShadow: '0 0 4px rgba(0,0,0,0.2)',
            }}
          />
        </div>
      </div>
      <style>{`
        @keyframes pulseDot {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes fadeInCover {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .pulse-dot {
          animation: pulseDot 2s ease-in-out infinite;
        }
        .book-cover-fade {
          animation: fadeInCover 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default BookCard;
