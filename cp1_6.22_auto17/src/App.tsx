import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, useParams, Link } from 'react-router-dom';
import { Book, Mood, AppContextType, ChapterWithMood, BookWithChapters, EmotionDataPoint } from './types';
import BookCard from './components/BookCard';
import ChapterList from './components/ChapterList';
import MoodChart from './components/MoodChart';

const AppContext = createContext<AppContextType | null>(null);

const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMoodId, setFilterMoodId] = useState<string | null>(null);

  const currentUser = { id: 'user_demo_001', name: '读者' };

  const fetchBooks = useCallback(async () => {
    try {
      const res = await fetch('/api/books');
      const data = await res.json();
      setBooks(data);
    } catch (error) {
      console.error('Failed to fetch books:', error);
    }
  }, []);

  const fetchMoods = useCallback(async () => {
    try {
      const res = await fetch('/api/moods');
      const data = await res.json();
      setMoods(data);
    } catch (error) {
      console.error('Failed to fetch moods:', error);
    }
  }, []);

  const addBook = useCallback(async (bookData: Omit<Book, 'id' | 'userId' | 'createdAt'>) => {
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookData)
    });
    const newBook = await res.json();
    setBooks(prev => [newBook, ...prev]);
    return newBook;
  }, []);

  const deleteBook = useCallback(async (bookId: string) => {
    await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
    setBooks(prev => prev.filter(b => b.id !== bookId));
  }, []);

  useEffect(() => {
    fetchBooks();
    fetchMoods();
  }, [fetchBooks, fetchMoods]);

  const value: AppContextType = {
    books,
    moods,
    currentUser,
    searchQuery,
    filterMoodId,
    setSearchQuery,
    setFilterMoodId,
    addBook,
    deleteBook,
    fetchBooks,
    fetchMoods
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

const BookshelfPage: React.FC = () => {
  const { books, moods, searchQuery, filterMoodId, setSearchQuery, setFilterMoodId, addBook } = useAppContext();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', author: '', coverUrl: '', totalPages: '' });
  const [animateEmpty, setAnimateEmpty] = useState(false);

  const filteredBooks = useMemo(() => {
    let result = books;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b => 
        b.title.toLowerCase().includes(query) || 
        b.author.toLowerCase().includes(query)
      );
    }
    
    if (filterMoodId) {
      result = result.filter(async (b) => {
        try {
          const res = await fetch(`/api/books/${b.id}`);
          const bookData: BookWithChapters = await res.json();
          return bookData.chapters.some(ch => ch.moodId === filterMoodId);
        } catch {
          return false;
        }
      });
    }
    
    return result;
  }, [books, searchQuery, filterMoodId]);

  const [resolvedBooks, setResolvedBooks] = useState<Book[]>(filteredBooks);
  const [isFiltering, setIsFiltering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsFiltering(true);

    const resolveFilter = async () => {
      if (!filterMoodId) {
        setResolvedBooks(filteredBooks);
        setIsFiltering(false);
        return;
      }

      const results: Book[] = [];
      for (const book of filteredBooks) {
        try {
          const res = await fetch(`/api/books/${book.id}`);
          const bookData: BookWithChapters = await res.json();
          if (bookData.chapters.some(ch => ch.moodId === filterMoodId)) {
            results.push(book);
          }
        } catch {
          // skip
        }
      }
      if (!cancelled) {
        setResolvedBooks(results);
        setIsFiltering(false);
        if (results.length === 0) {
          setAnimateEmpty(true);
          setTimeout(() => setAnimateEmpty(false), 500);
        }
      }
    };

    const start = performance.now();
    resolveFilter();
    const elapsed = performance.now() - start;
    if (elapsed > 100) {
      console.warn(`Filtering took ${elapsed}ms, exceeds 100ms target`);
    }
  }, [filteredBooks, filterMoodId]);

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title || !newBook.author) return;
    
    await addBook({
      title: newBook.title,
      author: newBook.author,
      coverUrl: newBook.coverUrl,
      totalPages: newBook.totalPages ? parseInt(newBook.totalPages) : undefined
    });
    
    setNewBook({ title: '', author: '', coverUrl: '', totalPages: '' });
    setShowAddForm(false);
  };

  const displayBooks = filterMoodId ? resolvedBooks : filteredBooks;

  return (
    <div style={styles.pageContainer}>
      <header style={styles.header}>
        <h1 style={styles.pageTitle}>我的书架</h1>
        <div style={styles.searchFilterContainer}>
          <input
            type="text"
            placeholder="搜索书名或作者..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          <div style={styles.moodFilterContainer}>
            <span style={styles.filterLabel}>心情筛选:</span>
            <div style={styles.moodBadges}>
              <button
                onClick={() => setFilterMoodId(null)}
                style={{
                  ...styles.moodBadge,
                  backgroundColor: filterMoodId === null ? '#666' : '#e0e0e0',
                  color: filterMoodId === null ? '#fff' : '#666'
                }}
              >
                全部
              </button>
              {moods.map(mood => (
                <button
                  key={mood.id}
                  onClick={() => setFilterMoodId(mood.id === filterMoodId ? null : mood.id)}
                  title={mood.name}
                  style={{
                    ...styles.moodBadge,
                    backgroundColor: mood.id === filterMoodId ? mood.color : '#e0e0e0',
                    width: 28,
                    height: 28,
                    padding: 0,
                    borderRadius: '50%',
                    color: mood.id === filterMoodId ? '#fff' : '#666',
                    fontSize: 11
                  }}
                >
                  {mood.id === filterMoodId ? mood.name.charAt(0) : mood.name.charAt(0)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <button onClick={() => setShowAddForm(true)} style={styles.addBookBtn}>
        + 添加新书
      </button>

      {showAddForm && (
        <div style={styles.modalOverlay} onClick={() => setShowAddForm(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>添加新书</h2>
            <form onSubmit={handleAddBook} style={styles.form}>
              <input
                type="text"
                placeholder="书名 *"
                value={newBook.title}
                onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                style={styles.formInput}
                required
              />
              <input
                type="text"
                placeholder="作者 *"
                value={newBook.author}
                onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                style={styles.formInput}
                required
              />
              <input
                type="text"
                placeholder="封面图片链接"
                value={newBook.coverUrl}
                onChange={(e) => setNewBook({ ...newBook, coverUrl: e.target.value })}
                style={styles.formInput}
              />
              <input
                type="number"
                placeholder="总页数"
                value={newBook.totalPages}
                onChange={(e) => setNewBook({ ...newBook, totalPages: e.target.value })}
                style={styles.formInput}
              />
              <div style={styles.formActions}>
                <button type="button" onClick={() => setShowAddForm(false)} style={styles.cancelBtn}>
                  取消
                </button>
                <button type="submit" style={styles.submitBtn}>
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isFiltering ? (
        <div style={styles.loading}>加载中...</div>
      ) : displayBooks.length === 0 ? (
        <div style={{ ...styles.emptyState, animation: animateEmpty ? 'bounce 0.5s ease-in-out' : 'none' }}>
          <div style={styles.emptyIcon}>📚</div>
          <p style={styles.emptyText}>还没有书籍，点击上方按钮添加第一本吧！</p>
        </div>
      ) : (
        <div style={styles.booksGrid} className="fade-in">
          {displayBooks.map((book, index) => (
            <div key={book.id} style={{ animationDelay: `${index * 0.05}s` }} className="fade-in-up">
              <BookCard book={book} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const BookDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { moods, fetchBooks } = useAppContext();
  const [book, setBook] = useState<BookWithChapters | null>(null);
  const [emotionData, setEmotionData] = useState<EmotionDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartKey, setChartKey] = useState(0);

  const fetchBookData = useCallback(async () => {
    if (!id) return;
    
    try {
      const startTime = performance.now();
      const [bookRes, emotionRes] = await Promise.all([
        fetch(`/api/books/${id}`),
        fetch(`/api/books/${id}/emotion-curve`)
      ]);
      
      const bookData: BookWithChapters = await bookRes.json();
      const emotionData: EmotionDataPoint[] = await emotionRes.json();
      
      setBook(bookData);
      setEmotionData(emotionData);
      
      const elapsed = performance.now() - startTime;
      if (elapsed > 200) {
        console.warn(`Chart generation took ${elapsed}ms, exceeds 200ms target`);
      } else {
        console.log(`Chart generated in ${elapsed.toFixed(2)}ms`);
      }
    } catch (error) {
      console.error('Failed to fetch book:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBookData();
  }, [fetchBookData]);

  const handleAddChapter = async (chapterData: { title: string; pageCount: number; moodId: string }) => {
    if (!id) return;
    
    const startTime = performance.now();
    const res = await fetch(`/api/books/${id}/chapters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chapterData)
    });
    
    const newChapter: ChapterWithMood = await res.json();
    
    if (book) {
      const updatedChapters = [...book.chapters, newChapter];
      const totalReadPages = updatedChapters.reduce((sum, ch) => sum + ch.pageCount, 0);
      setBook({ ...book, chapters: updatedChapters, readPages: totalReadPages });
      
      const newEmotionPoint: EmotionDataPoint = {
        chapterOrder: updatedChapters.length,
        chapterTitle: newChapter.title,
        moodName: newChapter.mood.name,
        happinessScore: newChapter.mood.happinessScore,
        color: newChapter.mood.color
      };
      
      setEmotionData(prev => [...prev, newEmotionPoint]);
      setChartKey(prev => prev + 1);
      
      const elapsed = performance.now() - startTime;
      console.log(`Chapter added and chart redrawn in ${elapsed.toFixed(2)}ms`);
    }
    
    fetchBooks();
  };

  if (loading) {
    return <div style={styles.loading}>加载中...</div>;
  }

  if (!book) {
    return <div style={styles.loading}>未找到这本书</div>;
  }

  const progressPercent = book.totalPages && book.totalPages > 0 
    ? Math.min(100, Math.round((book.readPages || 0) / book.totalPages * 100))
    : book.chapters.length > 0 ? Math.min(100, book.chapters.length * 10) : 0;

  return (
    <div style={styles.pageContainer}>
      <div style={styles.backLink}>
        <Link to="/books" style={styles.backBtn}>← 返回书架</Link>
      </div>

      <div style={styles.bookHeader}>
        {book.coverUrl && (
          <img src={book.coverUrl} alt={book.title} style={styles.bookCoverLarge} />
        )}
        <div style={styles.bookInfo}>
          <h1 style={styles.bookTitle}>{book.title}</h1>
          <p style={styles.bookAuthor}>作者：{book.author}</p>
          <div style={styles.progressContainer}>
            <span style={styles.progressLabel}>阅读进度: {progressPercent}%</span>
            <div style={styles.progressBarBg}>
              <div 
                style={{
                  ...styles.progressBarFill,
                  width: `${progressPercent}%`,
                  background: `linear-gradient(90deg, #e0e0e0 0%, #4a90d9 ${progressPercent}%)`
                }}
              />
            </div>
          </div>
          <p style={styles.chapterCount}>
            已记录 {book.chapters.length} 个章节
            {book.totalPages ? ` · 已读 ${book.readPages || 0}/${book.totalPages} 页` : ''}
          </p>
        </div>
      </div>

      {emotionData.length >= 3 && (
        <div style={styles.chartCard}>
          <h2 style={styles.chartTitle}>情感波动曲线</h2>
          <MoodChart key={chartKey} data={emotionData} />
        </div>
      )}

      <ChapterList 
        chapters={book.chapters} 
        moods={moods}
        onAddChapter={handleAddChapter}
        bookId={id!}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '24px',
    minHeight: '100vh'
  },
  header: {
    marginBottom: '24px'
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#333',
    margin: '0 0 16px 0'
  },
  searchFilterContainer: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  searchInput: {
    flex: 1,
    minWidth: 200,
    padding: '10px 16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#fff',
    outline: 'none'
  },
  moodFilterContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  filterLabel: {
    fontSize: '14px',
    color: '#666'
  },
  moodBadges: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  },
  moodBadge: {
    border: 'none',
    borderRadius: '14px',
    padding: '4px 12px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s ease',
    minWidth: 28
  },
  addBookBtn: {
    backgroundColor: '#4a90d9',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    marginBottom: '24px',
    transition: 'background-color 0.2s ease'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '32px',
    width: '100%',
    maxWidth: 400
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#333',
    margin: '0 0 20px 0'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  formInput: {
    padding: '10px 14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none'
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px'
  },
  cancelBtn: {
    padding: '10px 20px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px'
  },
  submitBtn: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#4a90d9',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px'
  },
  booksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '20px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#999'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  emptyText: {
    fontSize: '16px',
    margin: 0
  },
  loading: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666',
    fontSize: '16px'
  },
  backLink: {
    marginBottom: '20px'
  },
  backBtn: {
    color: '#4a90d9',
    textDecoration: 'none',
    fontSize: '14px'
  },
  bookHeader: {
    display: 'flex',
    gap: '24px',
    marginBottom: '32px',
    padding: '24px',
    backgroundColor: '#faf6f0',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
  },
  bookCoverLarge: {
    width: 120,
    height: 180,
    objectFit: 'cover',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
  },
  bookInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  bookTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#333',
    margin: '0 0 8px 0'
  },
  bookAuthor: {
    fontSize: '16px',
    color: '#666',
    margin: '0 0 16px 0'
  },
  progressContainer: {
    marginBottom: '8px'
  },
  progressLabel: {
    fontSize: '14px',
    color: '#666',
    display: 'block',
    marginBottom: '6px'
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    transition: 'width 0.3s ease',
    borderRadius: 4
  },
  chapterCount: {
    fontSize: '14px',
    color: '#888',
    margin: '8px 0 0 0'
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
  },
  chartTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#333',
    margin: '0 0 16px 0'
  }
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<BookshelfPage />} />
        <Route path="/books" element={<BookshelfPage />} />
        <Route path="/books/:id" element={<BookDetailPage />} />
      </Routes>
    </AppProvider>
  );
};

export default App;
