import React, { useState, useEffect, useRef, useMemo } from 'react';
import { readingTracker, Book, ReadingSession } from './ReadingTracker';

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
  const [mode, setMode] = useState<'start' | 'end'>('start');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [pagesRead, setPagesRead] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setStartTime(localNow);
  }, []);

  useEffect(() => {
    if (mode === 'end' && sessionId) {
      const now = new Date();
      const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setEndTime(localNow);
    }
  }, [mode, sessionId]);

  useEffect(() => {
    if (mode === 'end' && startTime) {
      const interval = setInterval(() => {
        const start = new Date(startTime).getTime();
        setElapsedTime(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [mode, startTime]);

  const handleStart = () => {
    const start = new Date(startTime).getTime();
    const sid = readingTracker.startReadingSession(book.id);
    setSessionId(sid);
    setMode('end');
  };

  const handleEnd = () => {
    if (!sessionId) return;
    const pages = parseInt(pagesRead);
    if (isNaN(pages) || pages <= 0) {
      alert('请输入有效的阅读页数');
      return;
    }
    readingTracker.endReadingSession(sessionId, pages);
    onComplete();
  };

  const handleManualSubmit = () => {
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
    readingTracker.addReadingSession(book.id, start, end, pages);
    onComplete();
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>记录阅读 - {book.title}</h3>
          <button style={modalStyles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={modalStyles.body}>
          <div style={modalStyles.modeToggle}>
            <button
              style={{
                ...modalStyles.modeBtn,
                ...(mode === 'start' ? modalStyles.modeBtnActive : {})
              }}
              onClick={() => {
                if (!sessionId) setMode('start');
              }}
              disabled={!!sessionId}
            >
              ⏱️ 即时记录
            </button>
            <button
              style={{
                ...modalStyles.modeBtn,
                ...(mode === 'manual' ? modalStyles.modeBtnActive : {})
              }}
              onClick={() => !sessionId && setMode('manual')}
              disabled={!!sessionId}
            >
              📝 手动填写
            </button>
          </div>

          {mode === 'start' && (
            <>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>开始时间</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={modalStyles.input}
                  disabled={!!sessionId}
                />
              </div>

              {!sessionId ? (
                <button style={modalStyles.primaryBtn} onClick={handleStart}>
                  🚀 开始阅读
                </button>
              ) : (
                <>
                  <div style={modalStyles.timerDisplay}>
                    <span style={modalStyles.timerLabel}>阅读中...</span>
                    <span style={modalStyles.timerValue}>{formatDuration(elapsedTime)}</span>
                  </div>

                  <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>结束时间</label>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      style={modalStyles.input}
                    />
                  </div>

                  <div style={modalStyles.formGroup}>
                    <label style={modalStyles.label}>本次阅读页数</label>
                    <input
                      type="number"
                      min="1"
                      value={pagesRead}
                      onChange={(e) => setPagesRead(e.target.value)}
                      style={modalStyles.input}
                      placeholder={`最大 ${book.totalPages - book.readPages} 页`}
                    />
                  </div>

                  <button style={modalStyles.primaryBtn} onClick={handleEnd}>
                    ✅ 完成阅读
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
                  style={modalStyles.input}
                />
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>结束时间</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={modalStyles.input}
                />
              </div>
              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>阅读页数</label>
                <input
                  type="number"
                  min="1"
                  value={pagesRead}
                  onChange={(e) => setPagesRead(e.target.value)}
                  style={modalStyles.input}
                  placeholder={`最大 ${book.totalPages - book.readPages} 页`}
                />
              </div>
              <button style={modalStyles.primaryBtn} onClick={handleManualSubmit}>
                💾 保存记录
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

  const handleSubmit = () => {
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
    readingTracker.addBook(title.trim(), author.trim(), pages, tags);
    onAdd();
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>添加新书</h3>
          <button style={modalStyles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={modalStyles.body}>
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>书名 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={modalStyles.input}
              placeholder="请输入书名"
            />
          </div>
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>作者 *</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              style={modalStyles.input}
              placeholder="请输入作者"
            />
          </div>
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>总页数 *</label>
            <input
              type="number"
              min="1"
              value={totalPages}
              onChange={(e) => setTotalPages(e.target.value)}
              style={modalStyles.input}
              placeholder="请输入总页数"
            />
          </div>
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>标签（逗号分隔）</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              style={modalStyles.input}
              placeholder="如：小说, 科幻, 经典"
            />
          </div>
          <button style={modalStyles.primaryBtn} onClick={handleSubmit}>
            ➕ 添加书籍
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
  const [hovered, setHovered] = useState(false);
  const progress = book.totalPages > 0 ? (book.readPages / book.totalPages) * 100 : 0;

  const statusConfig = {
    unread: { label: '未读', color: '#a0a0c0' },
    reading: { label: '进行中', color: '#e94560' },
    completed: { label: '已完成', color: '#2ecc71' },
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}小时${m > 0 ? ` ${Math.round(m)}分钟` : '';
    return `${Math.round(m)}分钟';
  };

  return (
    <div
      style={{
        ...bookCardStyles.card,
        ...(hovered ? bookCardStyles.cardHover : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={bookCardStyles.header}>
        <div style={bookCardStyles.titleRow}>
          <h3 style={bookCardStyles.title}>{book.title}</h3>
          <span style={{ ...bookCardStyles.statusBadge, backgroundColor: statusConfig[book.status].color + '20', color: statusConfig[book.status].color }}>
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
          style={{ ...bookCardStyles.readBtn,
            ...(book.status === 'completed' ? { opacity: 0.5, cursor: 'not-allowed' } : {}
          }}
          onClick={() => book.status !== 'completed' && onRead(book)}
          disabled={book.status === 'completed'}
        >
          📖 {book.status === 'reading' ? '继续阅读' : '开始阅读'}
        </button>
        <button
          style={bookCardStyles.deleteBtn}
          onClick={() => {
            if (confirm(`确定删除《${book.title}》吗？相关阅读记录也会被删除。')) {
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
  const listRef = useRef<HTMLDivElement>(null);

  const loadData = () => {
    const filtered = readingTracker.filterBooks(selectedTags, statusFilter);
    setBooks(filtered);
    setAllTags(readingTracker.getAllTags());
    setCurrentPage(1);
    setListKey(k => k + 1);
  };

  useEffect(() => {
    loadData();
  }, [refreshKey, selectedTags, statusFilter]);

  const filteredBooks = useMemo(() => {
    let result = books;
    if (statusFilter && statusFilter !== 'all') {
      result = result.filter(b => b.status === statusFilter);
    }
    if (selectedTags.length > 0) {
      result = result.filter(b => selectedTags.some(t => b.tags.includes(t)));
    }
    return result;
  }, [books, statusFilter, selectedTags]);

  const totalPages = Math.ceil(filteredBooks.length / PAGE_SIZE);
  const displayedBooks = filteredBooks.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const stats = useMemo(() => {
    const all = readingTracker.getBooks();
    return {
      total: all.length,
      unread: all.filter(b => b.status === 'unread').length,
      reading: all.filter(b => b.status === 'reading').length,
      completed: all.filter(b => b.status === 'completed').length,
    };
  }, [refreshKey, books.length]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>书籍管理</h1>
          <p style={styles.pageSubtitle}>共 {stats.total} 本书籍 · 进行中 {stats.reading} · 已完成 {stats.completed}</p>
        </div>
        <button style={styles.addBtn} onClick={() => setShowAddModal(true)}>
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
              style={{
                ...styles.filterChip,
                ...(statusFilter === opt.value ? styles.filterChipActive : {}),
              }}
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
                style={{
                  ...styles.filterChip,
                  ...(selectedTags.includes(tag) ? styles.filterChipActive : {}),
                }}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                style={styles.filterClearBtn}
                onClick={() => setSelectedTags([])}
              >
                清除
              </button>
            )}
          </div>
        )}
      </div>

      <div
        ref={listRef}
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
              onDelete={(id) => {
                readingTracker.deleteBook(id);
                loadData();
              }}
            />
          ))
        ) : (
          <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📚</div>
          <p style={styles.emptyText}>暂无书籍，点击右上角添加你的第一本书</p>
        </div>
        )}
      </div>

      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            style={styles.pageBtn}
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1)}
          >
            ← 上一页
          </button>
          <span style={styles.pageInfo}>
            第 {currentPage} / {totalPages} 页
          </span>
          <button
            style={styles.pageBtn}
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
  addBtn: {
    padding: '12px 24px',
    backgroundColor: '#e94560',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600,
    transition: 'all 0.15s ease',
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
  filterChip: {
    padding: '6px 14px',
    backgroundColor: 'transparent',
    border: '1px solid #2a2a4e',
    borderRadius: '20px',
    color: '#a0a0c0',
    fontSize: '13px',
    transition: 'all 0.15s ease',
  },
  filterChipActive: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
    color: '#ffffff',
  },
  filterClearBtn: {
    padding: '6px 14px',
    backgroundColor: 'transparent',
    border: '1px solid #4a4a6e',
    borderRadius: '20px',
    color: '#e0e0e0',
    fontSize: '13px',
    marginLeft: '8px',
    transition: 'all 0.15s ease',
  },
  booksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
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
  pageBtn: {
    padding: '10px 20px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a4e',
    borderRadius: '8px',
    color: '#e0e0e0',
    fontSize: '14px',
    transition: 'all 0.15s ease',
  },
  pageInfo: {
    color: '#a0a0c0',
    fontSize: '14px',
  },
};

const bookCardStyles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#1a1a2e',
    border: '1px solid #2a2a4e',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    transition: 'all 0.2s ease',
  },
  cardHover: {
    borderColor: '#4a4a6e',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
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
  readBtn: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#e94560',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.15s ease',
  },
  deleteBtn: {
    padding: '10px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #2a2a4e',
    borderRadius: '8px',
    color: '#a0a0c0',
    fontSize: '14px',
    transition: 'all 0.15s ease',
  },
};

const modalStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
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
  closeBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#a0a0c0',
    fontSize: '18px',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
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
  input: {
    padding: '10px 14px',
    backgroundColor: '#0f0f23',
    border: '1px solid #2a2a4e',
    borderRadius: '8px',
    color: '#e0e0e0',
    fontSize: '14px',
    outline: 'none',
  },
  primaryBtn: {
    padding: '12px 20px',
    backgroundColor: '#e94560',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600,
    transition: 'all 0.15s ease',
    marginTop: '8px',
  },
  modeToggle: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  modeBtn: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #2a2a4e',
    borderRadius: '8px',
    color: '#a0a0c0',
    fontSize: '13px',
    transition: 'all 0.15s ease',
  },
  modeBtnActive: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
    color: '#ffffff',
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
