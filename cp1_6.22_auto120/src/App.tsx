import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import BookShelf from './BookShelf';
import ChallengePanel from './ChallengePanel';
import StatsPage from './StatsPage';
import type { Book, BookList, ReadingChallenge } from './types';

const API = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export { API, fetchJSON };

const navItems = [
  { path: '/', label: '我的书架', icon: '📚' },
  { path: '/challenge', label: '阅读挑战', icon: '🎯' },
  { path: '/stats', label: '数据统计', icon: '📊' },
];

function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, [location.pathname]);

  return (
    <div className={`page-transition ${visible ? 'page-visible' : ''}`}>
      {children}
    </div>
  );
}

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [bookLists, setBookLists] = useState<BookList[]>([]);
  const [challenges, setChallenges] = useState<ReadingChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

  const loadBooks = useCallback(async () => {
    try {
      const data = await fetchJSON<Book[]>('/api/books');
      setBooks(data);
    } catch (e) {
      console.error('Failed to load books', e);
    }
  }, []);

  const loadBookLists = useCallback(async () => {
    try {
      const data = await fetchJSON<BookList[]>('/api/booklists');
      setBookLists(data);
    } catch (e) {
      console.error('Failed to load book lists', e);
    }
  }, []);

  const loadChallenges = useCallback(async () => {
    try {
      const data = await fetchJSON<ReadingChallenge[]>('/api/challenges');
      setChallenges(data);
    } catch (e) {
      console.error('Failed to load challenges', e);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadBooks(), loadBookLists(), loadChallenges()]).finally(() => setLoading(false));
  }, [loadBooks, loadBookLists, loadChallenges]);

  const addBook = useCallback(async (book: Omit<Book, 'id' | 'status' | 'bookLists' | 'addedAt'>) => {
    const newBook = await fetchJSON<Book>('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book),
    });
    setBooks((prev) => [...prev, newBook]);
    return newBook;
  }, []);

  const updateBook = useCallback(async (id: string, updates: Partial<Book>) => {
    const updated = await fetchJSON<Book>(`/api/books/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    setBooks((prev) => prev.map((b) => (b.id === id ? updated : b)));
    return updated;
  }, []);

  const deleteBook = useCallback(async (id: string) => {
    await fetch(`/api/books/${id}`, { method: 'DELETE' });
    setBooks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const addBookList = useCallback(async (name: string, coverUrl: string) => {
    const bl = await fetchJSON<BookList>('/api/booklists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, coverUrl }),
    });
    setBookLists((prev) => [...prev, bl]);
    return bl;
  }, []);

  const updateBookList = useCallback(async (id: string, updates: Partial<BookList>) => {
    const updated = await fetchJSON<BookList>(`/api/booklists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    setBookLists((prev) => prev.map((l) => (l.id === id ? updated : l)));
    return updated;
  }, []);

  const deleteBookList = useCallback(async (id: string) => {
    await fetch(`/api/booklists/${id}`, { method: 'DELETE' });
    setBookLists((prev) => prev.filter((l) => l.id !== id));
    setBooks((prev) => prev.map((b) => ({ ...b, bookLists: b.bookLists.filter((lid) => lid !== id) })));
  }, []);

  const reorderBookList = useCallback(async (id: string, bookIds: string[]) => {
    const updated = await fetchJSON<BookList>(`/api/booklists/${id}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookIds }),
    });
    setBookLists((prev) => prev.map((l) => (l.id === id ? updated : l)));
  }, []);

  const addChallenge = useCallback(async (challenge: Omit<ReadingChallenge, 'id'>) => {
    const c = await fetchJSON<ReadingChallenge>('/api/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(challenge),
    });
    setChallenges((prev) => [...prev, c]);
    return c;
  }, []);

  const updateChallenge = useCallback(async (id: string, updates: Partial<ReadingChallenge>) => {
    const updated = await fetchJSON<ReadingChallenge>(`/api/challenges/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    setChallenges((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const deleteChallenge = useCallback(async (id: string) => {
    await fetch(`/api/challenges/${id}`, { method: 'DELETE' });
    setChallenges((prev) => prev.filter((c) => c.id !== id));
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-layout">
        <button
          className="hamburger-btn"
          onClick={() => setNavOpen(!navOpen)}
          aria-label="Toggle navigation"
        >
          <span className={`hamburger-line ${navOpen ? 'open' : ''}`} />
          <span className={`hamburger-line ${navOpen ? 'open' : ''}`} />
          <span className={`hamburger-line ${navOpen ? 'open' : ''}`} />
        </button>

        <nav className={`sidebar ${navOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-header">
            <span className="sidebar-logo">📖</span>
            <h1 className="sidebar-title">藏书阁</h1>
          </div>
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
                  onClick={() => setNavOpen(false)}
                  end={item.path === '/'}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div
          className={`sidebar-overlay ${navOpen ? 'sidebar-overlay-visible' : ''}`}
          onClick={() => setNavOpen(false)}
        />

        <main className="main-content">
          <PageTransition>
            <Routes>
              <Route
                path="/"
                element={
                  <BookShelf
                    books={books}
                    bookLists={bookLists}
                    onAddBook={addBook}
                    onUpdateBook={updateBook}
                    onDeleteBook={deleteBook}
                    onAddBookList={addBookList}
                    onUpdateBookList={updateBookList}
                    onDeleteBookList={deleteBookList}
                    onReorderBookList={reorderBookList}
                  />
                }
              />
              <Route
                path="/challenge"
                element={
                  <ChallengePanel
                    challenges={challenges}
                    books={books}
                    onAddChallenge={addChallenge}
                    onUpdateChallenge={updateChallenge}
                    onDeleteChallenge={deleteChallenge}
                    onRefreshBooks={loadBooks}
                  />
                }
              />
              <Route path="/stats" element={<StatsPage />} />
            </Routes>
          </PageTransition>
        </main>
      </div>
    </BrowserRouter>
  );
}
