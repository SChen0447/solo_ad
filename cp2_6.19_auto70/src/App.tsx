import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Book, AddBookData, PageType } from './types';
import BookList from './components/BookList';
import AddBookModal from './components/AddBookModal';
import ReadingRecords from './components/ReadingRecords';

const API_BASE = '/api';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('books');
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>(['全部']);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBookIds, setNewBookIds] = useState<Set<string>>(new Set());
  const [gridTransitionKey, setGridTransitionKey] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);
  const [readerName, setReaderName] = useState('');

  const fetchBooks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (selectedCategory) params.set('category', selectedCategory);
      const res = await fetch(`${API_BASE}/books?${params.toString()}`);
      const data: Book[] = await res.json();
      setBooks(data);
      setGridTransitionKey((k) => k + 1);
    } catch (err) {
      console.error('获取图书列表失败:', err);
    }
  }, [searchTerm, selectedCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      const data: string[] = await res.json();
      setCategories(data);
    } catch (err) {
      console.error('获取分类失败:', err);
    }
  }, []);

  const fetchReader = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/reader`);
      const data = await res.json();
      setReaderName(data.name);
    } catch (err) {
      console.error('获取读者信息失败:', err);
    }
  }, []);

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchReader();
  }, [fetchCategories, fetchReader]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory, fetchBooks]);

  useEffect(() => {
    let active = true;
    const checkNotifications = async () => {
      try {
        const res = await fetch(`${API_BASE}/notifications`);
        const data = await res.json();
        if (active && data.length > 0) {
          const latest = data[0];
          showNotification(latest.message);
        }
      } catch (err) {
        console.error('获取通知失败:', err);
      }
    };
    const interval = setInterval(checkNotifications, 5000);
    checkNotifications();
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [showNotification]);

  const handleAddBook = useCallback(
    async (data: AddBookData) => {
      try {
        const res = await fetch(`${API_BASE}/books`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '添加失败');
        }
        const newBook: Book = await res.json();
        setBooks((prev) => [newBook, ...prev]);
        setNewBookIds((prev) => {
          const next = new Set(prev);
          next.add(newBook.id);
          setTimeout(() => {
            setNewBookIds((s) => {
              const r = new Set(s);
              r.delete(newBook.id);
              return r;
            });
          }, 1000);
          return next;
        });
        setShowAddModal(false);
        showNotification('📚 图书上架成功！');
      } catch (err) {
        console.error('添加图书失败:', err);
        throw err;
      }
    },
    [showNotification]
  );

  const handleBorrowBook = useCallback(
    async (bookId: string) => {
      try {
        const res = await fetch(`${API_BASE}/books/${bookId}/borrow`, {
          method: 'POST',
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '借阅失败');
        }
        const { book } = await res.json();
        setBooks((prev) => prev.map((b) => (b.id === book.id ? book : b)));
        showNotification('✅ 借阅成功，享受阅读吧！');
      } catch (err) {
        console.error('借阅失败:', err);
        throw err;
      }
    },
    [showNotification]
  );

  const handleReturnBook = useCallback(
    async (bookId: string) => {
      try {
        const res = await fetch(`${API_BASE}/books/${bookId}/return`, {
          method: 'POST',
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '归还失败');
        }
        const { book, notifiedReaders } = await res.json();
        setBooks((prev) => prev.map((b) => (b.id === book.id ? book : b)));
        showNotification('📖 归还成功，感谢您的配合！');
        if (notifiedReaders && notifiedReaders.length > 0) {
          setTimeout(() => {
            fetchBooks();
          }, 1000);
        }
      } catch (err) {
        console.error('归还失败:', err);
        throw err;
      }
    },
    [showNotification, fetchBooks]
  );

  const handleReserveBook = useCallback(
    async (bookId: string) => {
      try {
        const res = await fetch(`${API_BASE}/books/${bookId}/reserve`, {
          method: 'POST',
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '预约失败');
        }
        const { book, position } = await res.json();
        setBooks((prev) => prev.map((b) => (b.id === book.id ? book : b)));
        showNotification(`🔔 预约成功！您排在第 ${position} 位`);
      } catch (err) {
        console.error('预约失败:', err);
        throw err;
      }
    },
    [showNotification]
  );

  const handleUpdateProgress = useCallback(
    async (recordId: string, progress: number) => {
      try {
        await fetch(`${API_BASE}/records/${recordId}/progress`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ progress }),
        });
      } catch (err) {
        console.error('更新进度失败:', err);
        throw err;
      }
    },
    []
  );

  const pageContent = useMemo(() => {
    if (currentPage === 'books') {
      return (
        <BookList
          books={books}
          categories={categories}
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          onSearchChange={setSearchTerm}
          onCategoryChange={setSelectedCategory}
          onAddBook={() => setShowAddModal(true)}
          onBorrow={handleBorrowBook}
          onReturn={handleReturnBook}
          onReserve={handleReserveBook}
          newBookIds={newBookIds}
          gridTransitionKey={gridTransitionKey}
        />
      );
    }
    return (
      <ReadingRecords
        apiBase={API_BASE}
        onUpdateProgress={handleUpdateProgress}
      />
    );
  }, [
    currentPage,
    books,
    categories,
    searchTerm,
    selectedCategory,
    setSearchTerm,
    setSelectedCategory,
    handleBorrowBook,
    handleReturnBook,
    handleReserveBook,
    newBookIds,
    gridTransitionKey,
    handleUpdateProgress,
  ]);

  return (
    <>
      {notification && (
        <div className="notification-toast">{notification}</div>
      )}

      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-logo">
            <span className="navbar-logo-icon">📚</span>
            <span>社区图书馆</span>
          </div>

          <div className="navbar-nav">
            <button
              className={`nav-btn ${currentPage === 'books' ? 'active' : ''}`}
              onClick={() => setCurrentPage('books')}
            >
              📖 图书借阅
            </button>
            <button
              className={`nav-btn ${currentPage === 'records' ? 'active' : ''}`}
              onClick={() => setCurrentPage('records')}
            >
              📝 阅读记录
            </button>
          </div>

          <div className="navbar-right">
            <span className="reader-name">👤 {readerName}</span>
          </div>
        </div>
      </nav>

      <main className="main-container">{pageContent}</main>

      {showAddModal && (
        <AddBookModal
          categories={categories.filter((c) => c !== '全部')}
          onSubmit={handleAddBook}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </>
  );
}

export default App;
