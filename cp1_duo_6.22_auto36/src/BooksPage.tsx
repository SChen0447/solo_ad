import React, { useState, useEffect, useMemo } from 'react';
import api, { Book } from './api';

interface BooksPageProps {
  refreshKey: number;
}

interface ReadingModalProps {
  book: Book;
  onClose: () => void;
  onComplete: () => void;
}

const PAGE_SIZE = 20;

const ReadingModal: React.FC<ReadingModalProps> = ({ book, onClose, onComplete }) => {
  const [mode, setMode] = useState<'start' | 'end' | 'manual'>('start');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [pagesRead, setPagesRead] = useState('');
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setStartTime(localNow);
  }, []);

  useEffect(() => {
    if (mode === 'end' && sessionStart) {
      const now = new Date();
      const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setEndTime(localNow);
    }
  }, [mode, sessionStart]);

  useEffect(() => {
    if (mode === 'end' && sessionStart) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - sessionStart) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [mode, sessionStart]);

  const handleStart = () => {
    const start = new Date(startTime).getTime();
    setSessionStart(start);
    setMode('end');
  };

  const handleEnd = async () => {
    if (!sessionStart) return;
    const pages = parseInt(pagesRead);
    if (isNaN(pages) || pages <= 0) {
      alert('请输入有效的阅读页数');
      return;
    }
    setSubmitting(true);
    try {
      const end = Date.now();
      await api.addReadingSession({
        bookId: book.id,
        startTime: sessionStart,
        endTime: end,
        pagesRead: pages,
      });
      onComplete();
    } catch (err) {
      alert('保存失败：' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!startTime || !endTime) {
      alert('请填写起止时间');
      return;
    }
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    if (end <= start) {
      alert('结束时间必须晚于开始时间');
      return;
    }
    const pages = parseInt(pagesRead);
    if (isNaN(pages) || pages <= 0) {
      alert('请输入有效的阅读页数');
      return;
    }
    setSubmitting(true);
    try {
      await api.addReadingSession({
        bookId: book.id,
        startTime: start,
        endTime: end,
        pagesRead: pages,
      });
      onComplete();
    } catch (err) {
      alert('保存失败：' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>记录阅读 - {book.title}</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div style={modalStyles.body}>
          <div style={modalStyles.modeToggle}>
            <button
              className={`mode-btn ${mode !== 'manual' ? 'mode-btn-active' : ''}`}
              onClick={() => {
                if (!sessionStart) setMode('start');
              }}
              disabled={!!sessionStart || submitting}
            >
              ⏱️ 即时记录
            </button>
            <button
              className={`mode-btn ${mode === 'manual' ? 'mode-btn-active' : ''}`}
              onClick={() => !sessionStart && !submitting && setMode('manual')}
              disabled={!!sessionStart || submitting}
            >
              📝 手动填写
            </button>
          </div>

          {mode !== 'manual' && (
            <>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>开始时间</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="modal-input"
                  disabled={!!sessionStart || submitting}
                />
              </div>

              {!sessionStart ? (
                <button className="primary-btn" onClick={handleStart} disabled={submitting}>
                  🚀 开始阅读
                </button>
              ) : (
                <>
                  <div style={modalStyles.timerDisplay}>
                    <span style={modalStyles.timerLabel}>阅读中...</span>
                    <span style={modalStyles.timerValue}>{formatDuration(elapsedTime)}</span>
                  </div>

                  <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>本次阅读页数</label>
                    <input
                      type="number"
                      min="1"
                      value={pagesRead}
                      onChange={(e) => setPagesRead(e.target.value)}
                      className="modal-input"
                      placeholder={`最大 ${book.totalPages - book.readPages} 页`}
                      disabled={submitting}
                    />
                  </div>

                  <button className="primary-btn" onClick={handleEnd} disabled={submitting}>
                    {submitting ? '保存中...' : '✅ 完成阅读'}
                  </button>
                </>
              )}
            </>
          )}

          {mode === 'manual' && (
            <>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>开始时间</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="modal-input"
                  disabled={submitting}
                />
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>结束时间</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="modal-input"
                  disabled={submitting}
                />
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>阅读页数</label>
                <input
                  type="number"
                  min="1"
                  value={pagesRead}
                  onChange={(e) => setPagesRead(e.target.value)}
                  className="modal-input"
                  placeholder={`最大 ${book.totalPages - book.readPages} 页`}
                  disabled={submitting}
                />
              </div>
              <button className="primary-btn" onClick={handleManualSubmit} disabled={submitting}>
                {submitting ? '保存中...' : '💾 保存记录'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const AddBookModal: React.FC<{
  onClose: () => void;
  onAdd: () => void;
}> = ({ onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('请输入书名');
      return;
    }
    if (!author.trim()) {
      alert('请输入作者');
      return;
    }
    const pages = parseInt(totalPages);
    if (isNaN(pages) || pages <= 0) {
      alert('请输入有效的总页数');
      return;
    }
    const tags = tagsInput.split(/[,，]/).map(t => t.trim()).filter(t => t);
    setSubmitting(true);
    try {
      await api.addBook({
        title: title.trim(),
        author: author.trim(),
        totalPages: pages,
        tags,
      });
      onAdd();
    } catch (err) {
      alert('添加失败：' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>添加新书</h3>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div style={modalStyles.body}>
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>书名 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="modal-input"
              placeholder="请输入书名"
              disabled={submitting}
            />
          </div>
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>作者 *</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="modal-input"
              placeholder="请输入作者"
              disabled={submitting}
            />
          </div>
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>总页数 *</label>
            <input
              type="number"
              min="1"
              value={totalPages}
              onChange={(e) => setTotalPages(e.target.value)}
              className="modal-input"
              placeholder="请输入总页数"
              disabled={submitting}
            />
          </div>
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>标签（逗号分隔）</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="modal-input"
              placeholder="如：小说, 科幻, 经典"
              disabled={submitting}
            />
          </div>
          <button className="primary-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '添加中...' : '➕ 添加书籍'}
          </button>
        </div>
      </div>
    </div>
  );
};

const BookCard: React.FC<{
  book: Book;
  onRead: (book: Book) => void;
  onDelete: (id: string) => void;
}> = ({ book, onRead, onDelete }) => {
  const progress = book.totalPages > 0 ? (book.readPages / book.totalPages) * 100 : 0;

  const statusConfig = {
    unread: { label: '未读', color: '#a0a0c0' },
    reading: { label: '进行中', color: '#e94560' },
    completed: { label: '已完成', color: '#2ecc71' },
  } as const;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}小时${m > 0 ? ` ${Math.round(m)}分钟` : ''}`;
    return `${Math.round(m)}分钟`;
  };

  return (
    <div className="book-card">
      <div style={bookCardStyles.header}>
        <div style={bookCardStyles.titleRow}>
          <h3 style={bookCardStyles.title}>{book.title}</h3>
          <span style={{
            ...bookCardStyles.statusBadge,
            backgroundColor: statusConfig[book.status].color + '20',
            color: statusConfig[book.status].color,
          }}>
            {statusConfig[book.status].label}
          </span>
        </div>
        <p style={bookCardStyles.author}>作者：{book.author}</p>
      </div>

      <div style={bookCardStyles.progressSection}>
        <div style={bookCardStyles.progressBarContainer}>
          <div
            style={{
              ...bookCardStyles.progressBar,
              width: `${progress}%`,
            }}
          />
        </div>
        <div style={bookCardStyles.progressText}>
          <span>{book.readPages} / {book.totalPages} 页</span>
          <span style={bookCardStyles.progressPercent}>{progress.toFixed(1)}%</span>
        </div>
      </div>

      <div style={bookCardStyles.infoRow}>
        <div style={bookCardStyles.infoItem}>
          <span>⏱️</span>
          <span>{formatTime(book.totalReadingTime)}</span>
        </div>
        <div style={bookCardStyles.infoItem}>
          <span>📖</span>
          <span>剩余 {book.totalPages - book.readPages} 页</span>
        </div>
      </div>

      {book.tags.length > 0 && (
        <div style={bookCardStyles.tagsRow}>
          {book.tags.map((tag, i) => (
            <span key={i} style={bookCardStyles.tag}>{tag}</span>
          ))}
        </div>
      )}

      <div style={bookCardStyles.actions}>
        <button
          className="read-btn"
          onClick={() => book.status !== 'completed' && onRead(book)}
          disabled={book.status === 'completed'}
        >
          📖 {book.status === 'reading' ? '继续阅读' : '开始阅读'}
        </button>
        <button
          className="delete-btn"
          onClick={() => {
            if (confirm(`确定删除《${book.title}》吗？相关阅读记录也会被删除。`)) {
              onDelete(book.id);
            }
          }}
        >
          🗑️ 删除
        </button>
      </div>
    </div>
  );
};

const BooksPage: React.FC<BooksPageProps> = ({ refreshKey }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [listKey, setListKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [filteredBooks, tags] = await Promise.all([
        api.getBooks(selectedTags, statusFilter),
        api.getAllTags(),
      ]);
      setBooks(filteredBooks);
      setAllTags(tags);
      setCurrentPage(1);
      setListKey(k => k + 1);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedTags, statusFilter]);

  const totalPages = Math.ceil(books.length / PAGE_SIZE);
  const displayedBooks = useMemo(() => {
    return books.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE
    );
  }, [books, currentPage]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const stats = useMemo(() => {
    return {
      total: books.length,
      unread: books.filter(b => b.status === 'unread').length,
      reading: books.filter(b => b.status === 'reading').length,
      completed: books.filter(b => b.status === 'completed').length,
    };
  }, [books]);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteBook(id);
      loadData();
    } catch (err) {
      alert('删除失败：' + (err as Error).message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>书籍管理</h1>
          <p style={styles.pageSubtitle}>共 {stats.total} 本书籍 · 进行中 {stats.reading} · 已完成 {stats.completed}</p>
        </div>
        <button className="add-btn" onClick={() => setShowAddModal(true)}>
          ➕ 添加新书
        </button>
      </div>

      <div style={styles.filtersSection}>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>状态：</span>
          {[
            { value: 'all', label: '全部' },
            { value: 'unread', label: '未读' },
            { value: 'reading', label: '进行中' },
            { value: 'completed', label: '已完成' },
          ].map(opt => (
            <button
              key={opt.value}
              className={`filter-chip ${statusFilter === opt.value ? 'filter-chip-active' : ''}`}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {allTags.length > 0 && (
          <div style={styles.filterGroup}>
            <span style={styles.filterLabel}>标签：</span>
            {allTags.map(tag => (
              <button
                key={tag}
                className={`filter-chip ${selectedTags.includes(tag) ? 'filter-chip-active' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                className="filter-clear-btn"
                onClick={() => setSelectedTags([])}
              >
                清除
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div style={styles.loadingState}>
          <div style={styles.loadingIcon}>⏳</div>
          <p style={styles.loadingText}>加载中...</p>
        </div>
      ) : (
        <div
          style={styles.booksGrid}
          key={listKey}
          className="fade-in"
        >
          {displayedBooks.length > 0 ? (
            displayedBooks.map(book => (
              <BookCard
                key={book.id}
                book={book}
                onRead={(b) => setReadingBook(b)}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📚</div>
              <p style={styles.emptyText}>暂无书籍，点击右上角添加你的第一本书</p>
            </div>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            className="page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            ← 上一页
          </button>
          <span style={styles.pageInfo}>
            第 {currentPage} / {totalPages} 页
          </span>
          <button
            className="page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          >
            下一页 →
          </button>
        </div>
      )}

      {showAddModal && (
        <AddBookModal
          onClose={() => setShowAddModal(false)}
          onAdd={() => {
            setShowAddModal(false);
            loadData();
          }}
        />
      )}

      {readingBook && (
        <ReadingModal
          book={readingBook}
          onClose={() => setReadingBook(null)}
          onComplete={() => {
            setReadingBook(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '28px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#e0e0e0',
    marginBottom: '6px',
  },
  pageSubtitle: {
    color: '#a0a0c0',
    fontSize: '14px',
  },
  filtersSection: {
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a4e',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  filterLabel: {
    color: '#a0a0c0',
    fontSize: '14px',
    marginRight: '4px',
    minWidth: '48px',
  },
  booksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  loadingState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '60px 20px',
  },
  loadingIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  loadingText: {
    color: '#a0a0c0',
    fontSize: '16px',
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyText: {
    color: '#a0a0c0',
    fontSize: '16px',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    padding: '20px 0',
  },
  pageInfo: {
    color: '#a0a0c0',
    fontSize: '14px',
  },
};

const bookCardStyles: Record<string, React.CSSProperties> = {
  header: {
    marginBottom: '4px',
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
    marginBottom: '6px',
  },
  title: {
    fontSize: '17px',
    fontWeight: 600,
    color: '#e0e0e0',
    lineHeight: 1.3,
  },
  statusBadge: {
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    flexShrink: 0,
  },
  author: {
    color: '#a0a0c0',
    fontSize: '13px',
  },
  progressSection: {
    marginTop: '4px',
  },
  progressBarContainer: {
    width: '100%',
    height: '6px',
    backgroundColor: '#2a2a4e',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#e94560',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  progressText: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '8px',
    fontSize: '12px',
    color: '#a0a0c0',
  },
  progressPercent: {
    color: '#e94560',
    fontWeight: 600,
  },
  infoRow: {
    display: 'flex',
    gap: '16px',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#a0a0c0',
    fontSize: '13px',
  },
  tagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  tag: {
    padding: '3px 10px',
    backgroundColor: 'rgba(233, 69, 96, 0.15)',
    color: '#e94560',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    gap: '10px',
    marginTop: '4px',
  },
};

const modalStyles: Record<string, React.CSSProperties> = {
  modal: {
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a4e',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '440px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #2a2a4e',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#e0e0e0',
  },
  body: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    color: '#a0a0c0',
    fontSize: '13px',
    fontWeight: 500,
  },
  modeToggle: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  timerDisplay: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#0f0f23',
    borderRadius: '8px',
    border: '1px solid #2a2a4e',
    marginBottom: '8px',
  },
  timerLabel: {
    display: 'block',
    color: '#a0a0c0',
    fontSize: '13px',
    marginBottom: '8px',
  },
  timerValue: {
    display: 'block',
    fontSize: '36px',
    fontWeight: 700,
    color: '#e94560',
    fontFamily: 'monospace',
  },
};

export default BooksPage;
