import React, { useEffect, useState } from 'react';

interface Note {
  id: string;
  bookId: string;
  rating: number;
  content: string;
  date: string;
  comments: { userId: string; content: string; date: string }[];
  userName: string;
  userId: string;
  userAvatar: string;
  bookTitle: string;
  bookCover: string;
}

interface BookDetailProps {
  bookId: string | null;
  onClose: () => void;
  onBorrow: (bookId: string) => void;
  currentUserId: string;
}

interface BookDetail {
  id: string;
  isbn: string;
  title: string;
  author: string;
  coverUrl: string;
  category: string;
  status: string;
  lastBorrowed: string;
  colors: string[];
  notes: Note[];
}

const BookDetail: React.FC<BookDetailProps> = ({ bookId, onClose, onBorrow, currentUserId }) => {
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bookId) return;
    setLoading(true);
    fetch(`/api/books/${bookId}`)
      .then((r) => r.json())
      .then((data) => {
        setBook(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [bookId]);

  useEffect(() => {
    if (bookId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [bookId]);

  if (!bookId) return null;

  const handleBorrow = () => {
    if (!book) return;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    fetch(`/api/books/${book.id}/borrow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId, dueDate: dueDate.toISOString().slice(0, 10) }),
    })
      .then((r) => r.json())
      .then(() => {
        onBorrow(book.id);
        onClose();
      });
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: bookId ? 0 : -420,
          width: Math.min(420, window.innerWidth),
          height: '100%',
          background: '#fff',
          zIndex: 1001,
          overflowY: 'auto',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
          animation: 'slideInRight 0.3s ease forwards',
        }}
      >
        {loading && (
          <div style={{ padding: 40, textAlign: 'center', color: '#8B5CF6' }}>加载中...</div>
        )}
        {!loading && book && (
          <>
            <div style={{ position: 'relative', overflow: 'hidden' }}>
              <img
                src={book.coverUrl}
                alt={book.title}
                className="detail-cover-fade"
                style={{ width: '100%', height: 260, objectFit: 'cover' }}
              />
              <button
                onClick={onClose}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.7)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.5)';
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                {book.title}
              </h2>
              <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 4 }}>
                作者：{book.author}
              </p>
              <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 4 }}>
                ISBN：{book.isbn}
              </p>
              <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 4 }}>
                分类：{book.category}
              </p>
              <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
                状态：
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 10,
                    color: '#fff',
                    background:
                      book.status === 'available'
                        ? '#10B981'
                        : book.status === 'borrowed'
                        ? '#F59E0B'
                        : '#3B82F6',
                    fontSize: 12,
                  }}
                >
                  {book.status === 'available' ? '可借' : book.status === 'borrowed' ? '已借出' : '待归还'}
                </span>
              </p>
              {book.status === 'available' && (
                <button
                  onClick={handleBorrow}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    border: 'none',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'transform 0.2s, filter 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
                    (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(0.9)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                    (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)';
                  }}
                >
                  预约借阅
                </button>
              )}
              {book.notes && book.notes.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
                    读后感
                  </h3>
                  {book.notes.map((note) => (
                    <div
                      key={note.id}
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        background: '#F9FAFB',
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <img
                          src={note.userAvatar}
                          alt={note.userName}
                          style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #8B5CF6' }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
                          {note.userName}
                        </span>
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>{'★'.repeat(note.rating)}{'☆'.repeat(5 - note.rating)}</span>
                      </div>
                      <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.5 }}>{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes coverSlideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .detail-cover-fade {
            opacity: 0;
            animation: coverSlideUp 0.3s ease-out 0.1s forwards;
          }
        `}</style>
      </div>
    </>
  );
};

export default BookDetail;
