import React, { useCallback, useEffect, useState } from 'react';
import BookCard from './components/BookCard';
import BookDetail from './components/BookDetail';
import NoteCard from './components/NoteCard';
import ProfilePage from './components/ProfilePage';
import SearchBar from './components/SearchBar';

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

interface UserMap {
  [key: string]: { name: string; avatar: string };
}

type Page = 'home' | 'profile';

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [userMap, setUserMap] = useState<UserMap>({});
  const currentUserId = 'u1';

  useEffect(() => {
    fetch('/api/books')
      .then((r) => r.json())
      .then(setBooks)
      .catch(console.error);

    fetch('/api/notes')
      .then((r) => r.json())
      .then(setNotes)
      .catch(console.error);

    fetch(`/api/recommendations/${currentUserId}`)
      .then((r) => r.json())
      .then(setRecommendations)
      .catch(console.error);

    fetch('/api/users/u1')
      .then((r) => r.json())
      .then(() => {
        const users = ['u1', 'u2', 'u3', 'u4', 'u5'];
        Promise.all(
          users.map((id) =>
            fetch(`/api/users/${id}`)
              .then((r) => r.json())
              .then((u) => ({ id, name: u.name, avatar: u.avatar }))
          )
        ).then((list) => {
          const map: UserMap = {};
          list.forEach((u) => {
            map[u.id] = { name: u.name, avatar: u.avatar };
          });
          setUserMap(map);
        });
      })
      .catch(console.error);
  }, []);

  const handleBorrow = useCallback((bookId: string) => {
    fetch('/api/books')
      .then((r) => r.json())
      .then(setBooks);
    fetch(`/api/recommendations/${currentUserId}`)
      .then((r) => r.json())
      .then(setRecommendations);
  }, []);

  const handleComment = useCallback((noteId: string, content: string) => {
    fetch(`/api/notes/${noteId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId, content }),
    }).then(() => {
      fetch('/api/notes')
        .then((r) => r.json())
        .then(setNotes);
    });
  }, []);

  const getUserAvatar = useCallback(
    (userId: string) => userMap[userId]?.avatar || '',
    [userMap]
  );

  const getUserName = useCallback(
    (userId: string) => userMap[userId]?.name || '未知用户',
    [userMap]
  );

  const waterfallColumns: Note[][] = [[], [], []];
  const columnHeights = [0, 0, 0];
  notes.forEach((note) => {
    const minCol = columnHeights.indexOf(Math.min(...columnHeights));
    waterfallColumns[minCol].push(note);
    columnHeights[minCol] += note.content.length > 80 ? 220 : 180;
  });

  if (currentPage === 'profile') {
    return (
      <div style={{ minHeight: '100vh', background: '#fff' }}>
        <ProfilePage userId={currentUserId} onBack={() => setCurrentPage('home')} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #F3F4F6',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            flexShrink: 0,
          }}
          onClick={() => setCurrentPage('home')}
        >
          <span style={{ fontSize: 24 }}>📖</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#8B5CF6' }}>图书漂流</span>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <SearchBar onBookClick={setSelectedBookId} />
        </div>
        <div
          onClick={() => setCurrentPage('profile')}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 20,
            background: '#F3E8FF',
            transition: 'background 0.2s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = '#E9D5FF';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.background = '#F3E8FF';
          }}
        >
          <span style={{ fontSize: 18 }}>👤</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#8B5CF6' }}>我的</span>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        {recommendations.length > 0 && (
          <section style={{ marginBottom: 36 }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#374151',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ color: '#8B5CF6' }}>✨</span> 为你推荐
            </h2>
            <div
              style={{
                display: 'flex',
                gap: 16,
                overflowX: 'auto',
                paddingBottom: 8,
                scrollBehavior: 'smooth',
              }}
            >
              {recommendations.map((book) => (
                <div
                  key={book.id}
                  onClick={() => setSelectedBookId(book.id)}
                  style={{
                    minWidth: 200,
                    borderRadius: 12,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: `linear-gradient(135deg, ${book.colors?.[0] || '#8B5CF6'}, ${book.colors?.[1] || '#6366F1'})`,
                    transition: 'transform 0.2s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.03)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
                  }}
                >
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    loading="lazy"
                    style={{ width: '100%', height: 140, objectFit: 'cover' }}
                  />
                  <div style={{ padding: '8px 12px', color: '#fff' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {book.title}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{book.author}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={{ marginBottom: 36 }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#374151',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: '#8B5CF6' }}>📚</span> 图书漂流站
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 20,
            }}
          >
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onClick={setSelectedBookId}
              />
            ))}
          </div>
        </section>

        <section>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#374151',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: '#8B5CF6' }}>📝</span> 阅读打卡
          </h2>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {waterfallColumns.map((col, colIdx) => (
              <div key={colIdx} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
                {col.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onComment={handleComment}
                    getUserAvatar={getUserAvatar}
                    getUserName={getUserName}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>
      </main>

      <BookDetail
        bookId={selectedBookId}
        onClose={() => setSelectedBookId(null)}
        onBorrow={handleBorrow}
        currentUserId={currentUserId}
      />

      <style>{`
        @media (max-width: 768px) {
          main > section:nth-child(3) > div {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          main > section:last-child > div {
            flex-direction: column !important;
          }
        }
        ::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        ::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </div>
  );
};

export default App;
