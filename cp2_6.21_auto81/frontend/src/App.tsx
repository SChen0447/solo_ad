import React, { useEffect, useState } from 'react';
import { useBooks } from './BookContext';
import { Book } from './types';
import BookShelf from './components/BookShelf';
import BookDetail from './components/BookDetail';
import BlindBox from './components/BlindBox';

const App: React.FC = () => {
  const { fetchInitialBooks, loading } = useBooks();
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showBlindBox, setShowBlindBox] = useState(false);

  useEffect(() => {
    fetchInitialBooks();
  }, [fetchInitialBooks]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">📚 阅读进度追踪 · 书籍盲盒</h1>
        <button className="blind-box-btn" onClick={() => setShowBlindBox(true)}>
          🎁 开启盲盒
        </button>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>
          正在加载书架...
        </div>
      ) : (
        <BookShelf
          onBookClick={book => setSelectedBook(book)}
          onOpenBlindBox={() => setShowBlindBox(true)}
        />
      )}

      {selectedBook && (
        <BookDetail book={selectedBook} onClose={() => setSelectedBook(null)} />
      )}

      {showBlindBox && <BlindBox onClose={() => setShowBlindBox(false)} />}
    </div>
  );
};

export default App;
