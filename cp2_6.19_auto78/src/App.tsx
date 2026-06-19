import { useState, useEffect, useCallback } from 'react';
import type { Book, Notification, PageType } from './types';
import BookList from './components/BookList';
import AddBookModal from './components/AddBookModal';
import BookDetailModal from './components/BookDetailModal';
import ReadingRecords from './components/ReadingRecords';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentReader, setCurrentReader] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [booksRes, categoriesRes, readerRes] = await Promise.all([
          fetch('/api/books'),
          fetch('/api/categories'),
          fetch('/api/reader'),
        ]);
        const booksData = await booksRes.json();
        const categoriesData = await categoriesRes.json();
        const readerData = await readerRes.json();
        setBooks(booksData);
        setCategories(categoriesData);
        setCurrentReader(readerData.name);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const addNotification = useCallback((title: string, message: string, type: Notification['type'] = 'info') => {
    const id = Date.now().toString();
    setNotifications((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  const handleBookAdded = useCallback((newBook: Book) => {
    setBooks((prev) => [newBook, ...prev]);
    addNotification('图书上架成功', `《${newBook.title}》已成功上架`, 'success');
  }, [addNotification]);

  const handleBookUpdated = useCallback((updatedBook: Book) => {
    setBooks((prev) => prev.map((b) => (b.id === updatedBook.id ? updatedBook : b)));
    if (selectedBook?.id === updatedBook.id) {
      setSelectedBook(updatedBook);
    }
  }, [selectedBook]);

  const fetchBooks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter);
      const res = await fetch(`/api/books?${params.toString()}`);
      const data = await res.json();
      setBooks(data);
    } catch (error) {
      console.error('Failed to fetch books:', error);
    }
  }, [searchQuery, categoryFilter]);

  const handleBorrow = useCallback(async (bookId: string) => {
    try {
      const res = await fetch(`/api/books/${bookId}/borrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readerName: currentReader }),
      });
      if (res.ok) {
        const data = await res.json();
        handleBookUpdated(data.book);
        addNotification('借阅成功', `您已成功借阅《${data.book.title}》`, 'success');
      } else {
        const error = await res.json();
        addNotification('借阅失败', error.error || '借阅失败，请重试', 'warning');
      }
    } catch {
      addNotification('借阅失败', '网络错误，请稍后重试', 'warning');
    }
  }, [currentReader, handleBookUpdated, addNotification]);

  const handleReturn = useCallback(async (bookId: string) => {
    try {
      const res = await fetch(`/api/books/${bookId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        handleBookUpdated(data.book);
        addNotification('归还成功', '图书已成功归还', 'success');
        if (data.nextBorrower && data.nextBorrower === currentReader) {
          setTimeout(() => {
            addNotification(
              '预约通知',
              `《${data.book.title}》已归还，您作为第一位预约者可以借阅了！`,
              'info'
            );
          }, 500);
        }
      } else {
        const error = await res.json();
        addNotification('归还失败', error.error || '归还失败，请重试', 'warning');
      }
    } catch {
      addNotification('归还失败', '网络错误，请稍后重试', 'warning');
    }
  }, [handleBookUpdated, addNotification, currentReader]);

  const handleReserve = useCallback(async (bookId: string) => {
    try {
      const res = await fetch(`/api/books/${bookId}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readerName: currentReader }),
      });
      if (res.ok) {
        const data = await res.json();
        handleBookUpdated(data.book);
        addNotification('预约成功', `您已成功预约，当前排在第 ${data.position} 位`, 'success');
      } else {
        const error = await res.json();
        addNotification('预约失败', error.error || '预约失败，请重试', 'warning');
      }
    } catch {
      addNotification('预约失败', '网络错误，请稍后重试', 'warning');
    }
  }, [currentReader, handleBookUpdated, addNotification]);

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="navbar-brand-icon">📚</span>
          <span>图书共享借阅系统</span>
        </div>
        <ul className="navbar-nav">
          <li
            className={`nav-item ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentPage('home')}
          >
            图书大厅
          </li>
          <li
            className={`nav-item ${currentPage === 'records' ? 'active' : ''}`}
            onClick={() => setCurrentPage('records')}
          >
            我的阅读
          </li>
        </ul>
        <div className="nav-actions">
          {currentPage === 'home' && (
            <button className="btn btn-accent" onClick={() => setShowAddModal(true)}>
              + 上架图书
            </button>
          )}
          <span className="reader-info">👤 {currentReader}</span>
        </div>
      </nav>

      <div className="main-content">
        <div className="container">
          {isLoading ? (
            <div className="empty-state">
              <div className="empty-state-icon">📖</div>
              <div className="empty-state-text">加载中...</div>
            </div>
          ) : currentPage === 'home' ? (
            <BookList
              books={books}
              searchQuery={searchQuery}
              categoryFilter={categoryFilter}
              categories={categories}
              onSearchChange={setSearchQuery}
              onCategoryChange={setCategoryFilter}
              onBookClick={setSelectedBook}
              onRefresh={fetchBooks}
            />
          ) : (
            <ReadingRecords readerName={currentReader} />
          )}
        </div>
      </div>

      {showAddModal && (
        <AddBookModal
          onClose={() => setShowAddModal(false)}
          onAdded={handleBookAdded}
          categories={categories}
        />
      )}

      {selectedBook && (
        <BookDetailModal
          book={selectedBook}
          currentReader={currentReader}
          onClose={() => setSelectedBook(null)}
          onBorrow={handleBorrow}
          onReturn={handleReturn}
          onReserve={handleReserve}
        />
      )}

      {notifications.map((notification) => (
        <div key={notification.id} className="notification">
          <div className="notification-title">{notification.title}</div>
          <div className="notification-message">{notification.message}</div>
        </div>
      ))}
    </div>
  );
}

export default App;
