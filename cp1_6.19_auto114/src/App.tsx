import React, { useState, useEffect, useCallback, useMemo } from 'react';
import BookList from './components/BookList';
import BookDetail from './components/BookDetail';
import StatsPanel from './components/StatsPanel';
import AddBookModal from './components/AddBookModal';
import BottomNav from './components/BottomNav';
import type { Book, Note, BookGenre, BookStatus, ViewType } from './types';
import {
  loadAllBooks,
  loadAllNotes,
  saveBook,
  updateBook,
  deleteBook,
  getNotesByBookId,
  saveNote,
  updateNote,
  deleteNote,
} from './dataManager';

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('shelf');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<BookGenre | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<BookStatus | 'all'>('all');
  const [statsGenreFilter, setStatsGenreFilter] = useState<BookGenre | null>(null);

  useEffect(() => {
    const start = performance.now();
    const loadedBooks = loadAllBooks();
    const loadedNotes = loadAllNotes();
    setBooks(loadedBooks);
    setNotes(loadedNotes);
    const elapsed = performance.now() - start;
    console.log(`数据加载耗时: ${elapsed.toFixed(1)}ms`);
  }, []);

  const refreshBooks = useCallback(() => {
    setBooks(loadAllBooks());
  }, []);

  const refreshNotes = useCallback(() => {
    setNotes(loadAllNotes());
  }, []);

  const currentBook = useMemo(
    () => (selectedBookId ? books.find((b) => b.id === selectedBookId) || null : null),
    [books, selectedBookId],
  );

  const currentBookNotes = useMemo(
    () => (selectedBookId ? getNotesByBookId(selectedBookId) : []),
    [selectedBookId, notes],
  );

  const handleBookClick = (bookId: string) => {
    setSelectedBookId(bookId);
    setCurrentView('detail');
  };

  const handleBackToShelf = () => {
    setSelectedBookId(null);
    setCurrentView('shelf');
  };

  const handleAddBook = (data: Parameters<typeof saveBook>[0]) => {
    saveBook(data);
    refreshBooks();
    setShowAddModal(false);
  };

  const handleDeleteBook = (bookId: string) => {
    deleteBook(bookId);
    refreshBooks();
    refreshNotes();
    if (selectedBookId === bookId) {
      handleBackToShelf();
    }
  };

  const handleUpdateProgress = (bookId: string, newPage: number) => {
    updateBook(bookId, { currentPage: newPage });
    refreshBooks();
  };

  const handleSaveNote = (
    bookId: string,
    data: {
      id?: string;
      title: string;
      content: string;
      pageNumber: number;
      isQuote: boolean;
    },
  ) => {
    if (data.id) {
      updateNote(data.id, {
        title: data.title,
        content: data.content,
        pageNumber: data.pageNumber,
        isQuote: data.isQuote,
      });
    } else {
      saveNote({
        bookId,
        title: data.title,
        content: data.content,
        pageNumber: data.pageNumber,
        isQuote: data.isQuote,
      });
    }
    refreshNotes();
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNote(noteId);
    refreshNotes();
  };

  const handleStatsGenreFilter = (genre: BookGenre) => {
    setStatsGenreFilter(genre);
    setSelectedGenre(genre);
    setCurrentView('shelf');
  };

  const handleNavChange = (view: ViewType) => {
    setCurrentView(view);
    if (view !== 'detail') {
      setSelectedBookId(null);
    }
  };

  return (
    <div className="app-root">
      <header className="app-header desktop-only">
        <div className="header-content">
          <div
            className="logo-area"
            onClick={() => {
              setCurrentView('shelf');
              setSelectedBookId(null);
              setStatsGenreFilter(null);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span className="logo-text">书架笔记</span>
          </div>
          <nav className="header-nav">
            <button
              className={`nav-link ${currentView === 'shelf' ? 'active' : ''}`}
              onClick={() => setCurrentView('shelf')}
            >
              书架
            </button>
            <button
              className={`nav-link ${currentView === 'stats' ? 'active' : ''}`}
              onClick={() => setCurrentView('stats')}
            >
              统计
            </button>
          </nav>
        </div>
      </header>

      <main className={`app-main ${currentView !== 'shelf' ? 'mobile-pb-extra' : ''}`}>
        {currentView === 'shelf' && (
          <BookList
            books={books}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedGenre={selectedGenre}
            onGenreChange={(g) => {
              setSelectedGenre(g);
              setStatsGenreFilter(null);
            }}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            onBookClick={handleBookClick}
            onDeleteBook={handleDeleteBook}
            onAddBook={() => setShowAddModal(true)}
            filterGenreFromStats={statsGenreFilter}
          />
        )}

        {currentView === 'detail' && currentBook && (
          <BookDetail
            book={currentBook}
            notes={currentBookNotes}
            onBack={handleBackToShelf}
            onUpdateProgress={(p) => handleUpdateProgress(currentBook.id, p)}
            onSaveNote={(d) => handleSaveNote(currentBook.id, d)}
            onDeleteNote={handleDeleteNote}
          />
        )}

        {currentView === 'stats' && (
          <StatsPanel
            books={books}
            notes={notes}
            onGenreFilter={handleStatsGenreFilter}
          />
        )}
      </main>

      <BottomNav currentView={currentView} onChange={handleNavChange} />

      {showAddModal && (
        <AddBookModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddBook}
        />
      )}
    </div>
  );
};

export default App;
