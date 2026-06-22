import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import BookCard from './components/BookCard';
import ExcerptCard from './components/ExcerptCard';
import {
  searchBooks,
  getBook,
  updateProgress,
  getExcerpts,
  createExcerpt,
  toggleLike,
  addComment,
} from './api';
import type { Book, Excerpt } from './api';

const NAV_ITEMS = [
  { path: '/', label: '📚 图书列表' },
  { path: '/excerpts', label: '📝 书摘广场' },
];

function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-logo" onClick={() => navigate('/')}>
          <span className="header-logo-icon">📖</span>
          <span>BookTrack</span>
        </div>
        <nav className="header-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              className={location.pathname === item.path ? 'active' : ''}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

function BookListPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const fetchBooks = useCallback(async (query: string = '') => {
    setLoading(true);
    try {
      const data = await searchBooks(query);
      setBooks(data);
    } catch (err) {
      console.error('Failed to fetch books:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleSearch = () => {
    fetchBooks(searchQuery);
  };

  const handleProgressUpdate = async (bookId: string, currentPage: number) => {
    try {
      const updated = await updateProgress(bookId, currentPage);
      setBooks((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b))
      );
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div>
      <h1 className="page-title">我的书架</h1>
      <p className="page-subtitle">追踪阅读进度，记录每一段旅程</p>

      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="搜索书名或作者..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="search-btn" onClick={handleSearch}>
          搜索
        </button>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : books.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <div className="empty-state-text">没有找到相关图书</div>
        </div>
      ) : (
        <div className="books-grid">
          {books.map((book, i) => (
            <BookCard
              key={book.id}
              book={book}
              onProgressUpdate={handleProgressUpdate}
              onClick={(id) => navigate(`/book/${id}`)}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BookDetailPage() {
  const { id } = useBookIdParam();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputPage, setInputPage] = useState('0');
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await getBook(id);
        setBook(data);
        setInputPage(String(data.currentPage));
      } catch (err) {
        console.error('Failed to fetch book:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleUpdateProgress = async () => {
    if (!book) return;
    const page = parseInt(inputPage, 10);
    if (isNaN(page) || page < 0 || page > book.totalPages) return;
    try {
      const updated = await updateProgress(book.id, page);
      setBook(updated);
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  if (loading) return <div className="loading">加载中...</div>;
  if (!book) return <div className="empty-state"><div className="empty-state-text">图书未找到</div></div>;

  const percentage = Math.round((book.currentPage / book.totalPages) * 100);
  const remainingPages = book.totalPages - book.currentPage;
  const remainingMinutes = remainingPages / 1.2;
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = Math.round(remainingMinutes % 60);

  return (
    <div className="book-detail">
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← 返回
      </button>
      <div className="book-detail-header">
        <div className="book-detail-cover">
          <img src={book.cover} alt={book.title} />
        </div>
        <div className="book-detail-info">
          <h1 className="book-detail-title">{book.title}</h1>
          <div className="book-detail-author">{book.author}</div>
          <div className="book-detail-meta">
            <div className="meta-item">
              <span className="meta-label">总页数</span>
              <span className="meta-value">{book.totalPages}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">已读页数</span>
              <span className="meta-value">{book.currentPage}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">完成度</span>
              <span className="meta-value">{percentage}%</span>
            </div>
          </div>
          <div className="book-detail-progress">
            <div className="detail-progress-bar">
              <div
                className="detail-progress-fill"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="detail-progress-text">
              <span>
                {book.currentPage === 0
                  ? '尚未开始阅读'
                  : book.currentPage >= book.totalPages
                  ? '🎉 已读完！'
                  : `已读 ${book.currentPage} / ${book.totalPages} 页`}
              </span>
              {book.currentPage > 0 && book.currentPage < book.totalPages && (
                <span>
                  预计剩余 {remainingHours > 0 ? `${remainingHours}小时` : ''}
                  {remainingMins}分钟
                </span>
              )}
            </div>
          </div>
          <div className="detail-progress-update">
            <input
              type="number"
              className="detail-progress-input"
              min={0}
              max={book.totalPages}
              value={inputPage}
              onChange={(e) => setInputPage(e.target.value)}
            />
            <span className="detail-progress-label">/ {book.totalPages} 页</span>
            <button className="detail-update-btn" onClick={handleUpdateProgress}>
              更新进度
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function useBookIdParam(): { id: string } {
  const location = useLocation();
  const parts = location.pathname.split('/');
  const id = parts[parts.length - 1] || '';
  return { id };
}

function ExcerptsPage() {
  const [excerpts, setExcerpts] = useState<Excerpt[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [excerptPage, setExcerptPage] = useState('');
  const [excerptText, setExcerptText] = useState('');
  const [excerptNote, setExcerptNote] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [excerptsData, booksData] = await Promise.all([
        getExcerpts(),
        searchBooks(),
      ]);
      setExcerpts(excerptsData);
      setBooks(booksData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateExcerpt = async () => {
    if (!selectedBookId || !excerptText.trim()) return;
    if (excerptText.length > 300) return;
    const book = books.find((b) => b.id === selectedBookId);
    if (!book) return;
    try {
      const newExcerpt = await createExcerpt({
        bookId: selectedBookId,
        bookTitle: book.title,
        page: parseInt(excerptPage, 10) || 0,
        text: excerptText.trim(),
        note: excerptNote.trim(),
      });
      setExcerpts((prev) => [newExcerpt, ...prev]);
      setExcerptText('');
      setExcerptNote('');
      setExcerptPage('');
    } catch (err) {
      console.error('Failed to create excerpt:', err);
    }
  };

  const handleLike = async (excerptId: string) => {
    try {
      const updated = await toggleLike(excerptId);
      setExcerpts((prev) =>
        prev.map((e) => (e.id === updated.id ? updated : e))
      );
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleComment = async (excerptId: string, user: string, content: string) => {
    try {
      const newComment = await addComment(excerptId, user, content);
      setExcerpts((prev) =>
        prev.map((e) => {
          if (e.id === excerptId) {
            return { ...e, comments: [...e.comments, newComment] };
          }
          return e;
        })
      );
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  if (loading) return <div className="loading">加载中...</div>;

  return (
    <div>
      <h1 className="page-title">书摘广场</h1>
      <p className="page-subtitle">分享书中的精华，与读者共鸣</p>

      <div className="excerpt-form">
        <div className="excerpt-form-title">✍️ 发布新书摘</div>
        <div className="excerpt-form-row">
          <select
            className="excerpt-form-select"
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
          >
            <option value="">选择来源图书</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                《{b.title}》
              </option>
            ))}
          </select>
          <input
            type="number"
            className="excerpt-form-input"
            placeholder="页码"
            value={excerptPage}
            onChange={(e) => setExcerptPage(e.target.value)}
          />
        </div>
        <textarea
          className="excerpt-form-textarea"
          placeholder="复制书中的精彩段落（最多300字）..."
          value={excerptText}
          onChange={(e) => setExcerptText(e.target.value)}
          maxLength={300}
        />
        <textarea
          className="excerpt-form-note"
          placeholder="写下你的感悟..."
          value={excerptNote}
          onChange={(e) => setExcerptNote(e.target.value)}
        />
        <div className="excerpt-form-footer">
          <span className={`char-count ${excerptText.length > 300 ? 'over' : ''}`}>
            {excerptText.length} / 300
          </span>
          <button
            className="excerpt-submit-btn"
            onClick={handleCreateExcerpt}
            disabled={!selectedBookId || !excerptText.trim() || excerptText.length > 300}
          >
            发布书摘
          </button>
        </div>
      </div>

      {excerpts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-text">还没有书摘，来分享第一条吧！</div>
        </div>
      ) : (
        <div className="excerpts-waterfall">
          {excerpts.map((excerpt, i) => (
            <ExcerptCard
              key={excerpt.id}
              excerpt={excerpt}
              onLike={handleLike}
              onComment={handleComment}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<BookListPage />} />
          <Route path="/book/:id" element={<BookDetailPage />} />
          <Route path="/excerpts" element={<ExcerptsPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
