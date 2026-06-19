import { useState, useMemo } from 'react';
import type { Book } from '../types';

interface BookListProps {
  books: Book[];
  categories: string[];
  searchTerm: string;
  selectedCategory: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onAddBook: () => void;
  onBorrow: (bookId: string) => Promise<void>;
  onReturn: (bookId: string) => Promise<void>;
  onReserve: (bookId: string) => Promise<void>;
  newBookIds: Set<string>;
  gridTransitionKey: number;
}

const OVERDUE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function isOverdue(book: Book): boolean {
  if (!book.borrowedAt || book.status !== 'borrowed') return false;
  return Date.now() - book.borrowedAt > OVERDUE_DAYS * DAY_MS;
}

function formatDate(ts?: number): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDaysBorrowed(book: Book): number {
  if (!book.borrowedAt) return 0;
  return Math.floor((Date.now() - book.borrowedAt) / DAY_MS);
}

export default function BookList(props: BookListProps) {
  const {
    books,
    categories,
    searchTerm,
    selectedCategory,
    onSearchChange,
    onCategoryChange,
    onAddBook,
    onBorrow,
    onReturn,
    onReserve,
    newBookIds,
    gridTransitionKey,
  } = props;

  const [detailBook, setDetailBook] = useState<Book | null>(null);
  const [confirmType, setConfirmType] = useState<'borrow' | 'return' | null>(null);
  const [confirmBook, setConfirmBook] = useState<Book | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [bellKey, setBellKey] = useState(0);

  useMemo(() => {
    const interval = setInterval(() => {
      setBellKey((k) => k + 1);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const overdueIds = useMemo(() => {
    const s = new Set<string>();
    books.forEach((b) => {
      if (isOverdue(b)) s.add(b.id);
    });
    return s;
  }, [books]);

  const openDetail = (book: Book) => {
    setDetailBook(book);
  };

  const requestBorrow = (book: Book, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmBook(book);
    setConfirmType('borrow');
  };

  const requestReturn = (book: Book, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmBook(book);
    setConfirmType('return');
  };

  const handleReserve = async (book: Book, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingId(book.id);
    try {
      await onReserve(book.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : '预约失败');
    } finally {
      setLoadingId(null);
    }
  };

  const executeConfirm = async () => {
    if (!confirmBook || !confirmType) return;
    setLoadingId(confirmBook.id);
    try {
      if (confirmType === 'borrow') {
        await onBorrow(confirmBook.id);
      } else {
        await onReturn(confirmBook.id);
      }
      setConfirmType(null);
      setConfirmBook(null);
      if (detailBook && detailBook.id === confirmBook.id) {
        setDetailBook(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoadingId(null);
    }
  };

  const cancelConfirm = () => {
    setConfirmType(null);
    setConfirmBook(null);
  };

  const renderBookCard = (book: Book) => {
    const isNew = newBookIds.has(book.id);
    const isOverdueBook = overdueIds.has(book.id);
    const inQueue = book.queue.includes('reader_001');

    return (
      <div
        key={book.id}
        className={`book-card ${isNew ? 'animate-in' : ''}`}
        onClick={() => openDetail(book)}
      >
        <div className="book-cover-wrapper">
          {isOverdueBook && (
            <span key={bellKey + book.id} className="book-overdue-bell" title="借阅超期，请尽快归还">
              🔔
            </span>
          )}
          {book.status === 'available' ? (
            <span className="status-badge available">可借阅</span>
          ) : (
            <span
              className="status-badge borrowed"
              onClick={(e) => {
                if (book.borrowedBy === 'reader_001') {
                  requestReturn(book, e);
                }
              }}
            >
              {book.borrowedBy === 'reader_001' ? '点击归还' : '已借出'}
            </span>
          )}
          {book.queue.length > 0 && (
            <span className="queue-badge">排队 {book.queue.length}</span>
          )}
          <img
            className="book-cover"
            src={book.coverUrl}
            alt={book.title}
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://picsum.photos/seed/default' + book.id + '/200/280';
            }}
          />
        </div>

        <div className="book-info">
          <div className="book-title" title={book.title}>{book.title}</div>
          <div className="book-author">{book.author}</div>
          <span className="book-category">{book.category}</span>
        </div>

        <div className="book-actions">
          {book.status === 'available' ? (
            <button
              className="btn btn-primary"
              onClick={(e) => requestBorrow(book, e)}
              disabled={loadingId === book.id}
            >
              📖 借阅
            </button>
          ) : (
            <button
              className="btn btn-accent"
              onClick={(e) => handleReserve(book, e)}
              disabled={loadingId === book.id || inQueue || book.borrowedBy === 'reader_001'}
            >
              {inQueue ? '已预约' : book.borrowedBy === 'reader_001' ? '阅读中' : '🔔 预约'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">图书借阅大厅</h1>
        <button className="btn btn-primary" onClick={onAddBook}>
          ➕ 上架新书
        </button>
      </div>

      <div className="search-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="搜索书名或作者..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <select
          className="category-select"
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === '全部' ? '全部分类' : c}
            </option>
          ))}
        </select>
      </div>

      {books.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-text">没有找到匹配的图书，换个关键词试试吧</div>
        </div>
      ) : (
        <div key={gridTransitionKey} className="book-grid fade-transition">
          {books.map(renderBookCard)}
        </div>
      )}

      {detailBook && (
        <div className="modal-overlay" onClick={() => setDetailBook(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">图书详情</div>
              <button className="modal-close" onClick={() => setDetailBook(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="book-detail">
                <div className="book-detail-cover">
                  <img src={detailBook.coverUrl} alt={detailBook.title} />
                </div>
                <div className="book-detail-info">
                  <div className="book-detail-title">{detailBook.title}</div>
                  <div className="book-detail-row">
                    <strong>作者：</strong>{detailBook.author}
                  </div>
                  <div className="book-detail-row">
                    <strong>ISBN：</strong>{detailBook.isbn}
                  </div>
                  <div className="book-detail-row">
                    <strong>分类：</strong>{detailBook.category}
                  </div>
                  <div
                    className={`book-detail-status ${detailBook.status}`}
                  >
                    {detailBook.status === 'available'
                      ? '✓ 当前可借阅'
                      : isOverdue(detailBook)
                        ? `⚠ 已借出 ${getDaysBorrowed(detailBook)} 天（超期）`
                        : `已借出 ${getDaysBorrowed(detailBook)} 天`}
                  </div>
                  {detailBook.status === 'borrowed' && (
                    <div className="book-detail-row">
                      <strong>借出时间：</strong>{formatDate(detailBook.borrowedAt)}
                    </div>
                  )}
                  {detailBook.queue.length > 0 && (
                    <div className="book-detail-row">
                      <strong>预约人数：</strong>{detailBook.queue.length} 人
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {detailBook.status === 'available' ? (
                <button
                  className="btn btn-primary"
                  onClick={() => requestBorrow(detailBook)}
                  disabled={loadingId === detailBook.id}
                >
                  📖 立即借阅
                </button>
              ) : detailBook.borrowedBy === 'reader_001' ? (
                <button
                  className="btn btn-primary"
                  onClick={() => requestReturn(detailBook)}
                  disabled={loadingId === detailBook.id}
                >
                  📤 归还图书
                </button>
              ) : (
                <button
                  className="btn btn-accent"
                  onClick={(e) => handleReserve(detailBook, e as React.MouseEvent)}
                  disabled={
                    loadingId === detailBook.id ||
                    detailBook.queue.includes('reader_001')
                  }
                >
                  {detailBook.queue.includes('reader_001') ? '已预约' : '🔔 预约此书'}
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => setDetailBook(null)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmBook && confirmType && (
        <div className="modal-overlay" onClick={cancelConfirm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {confirmType === 'borrow' ? '确认借阅' : '确认归还'}
              </div>
              <button className="modal-close" onClick={cancelConfirm}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="confirm-message">
                您确定要{confirmType === 'borrow' ? '借阅' : '归还'}
                <span className="confirm-highlight">《{confirmBook.title}》</span>
                {confirmType === 'borrow' ? ' 吗？\n借阅期限为14天，请按时归还。' : ' 吗？'}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={cancelConfirm}>
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={executeConfirm}
                disabled={loadingId === confirmBook.id}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
