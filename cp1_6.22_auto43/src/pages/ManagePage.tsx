import { useState, useEffect, useCallback, useRef } from 'react';
import BookList from '../components/BookList';
import Pagination from '../components/Pagination';
import BorrowDialog from '../components/BorrowDialog';
import BookFormDialog from '../components/BookFormDialog';
import { bookApi, loanApi } from '../api';
import type { Book, FilterCategory, Category } from '../types';

interface Props {
  onDataChange: () => void;
  refreshTrigger: number;
}

const CATEGORIES: FilterCategory[] = ['全部', '文学', '科技', '生活', '童书'];

const categoryBtnColors: Record<FilterCategory, string> = {
  全部: '#2b6cb0',
  文学: '#92400e',
  科技: '#1e40af',
  生活: '#166534',
  童书: '#9d174d',
};

function ManagePage({ onDataChange, refreshTrigger }: Props) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<FilterCategory>('全部');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageAnim, setPageAnim] = useState<'left' | 'right' | null>(null);

  const [borrowBook, setBorrowBook] = useState<Book | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [formBook, setFormBook] = useState<Book | null>(null);

  const searchTimer = useRef<number | null>(null);
  const prevPage = useRef(1);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookApi.getBooks(debouncedSearch, category, page, 12);
      setBooks(res.books);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('获取图书列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, page]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks, refreshTrigger]);

  useEffect(() => {
    if (searchTimer.current) {
      window.clearTimeout(searchTimer.current);
    }
    searchTimer.current = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimer.current) {
        window.clearTimeout(searchTimer.current);
      }
    };
  }, [search]);

  const handlePageChange = (newPage: number) => {
    setPageAnim(newPage > prevPage.current ? 'left' : 'right');
    prevPage.current = newPage;
    setPage(newPage);
    window.setTimeout(() => setPageAnim(null), 300);
  };

  const handleCategoryChange = (cat: FilterCategory) => {
    setCategory(cat);
    setPage(1);
  };

  const handleBorrow = (book: Book) => {
    setBorrowBook(book);
  };

  const handleBorrowSubmit = async (data: {
    borrower_name: string;
    expected_return_date: string;
  }) => {
    if (!borrowBook) return;
    await loanApi.createLoan({
      book_id: borrowBook.id,
      borrower_name: data.borrower_name,
      expected_return_date: data.expected_return_date,
    });
    setBorrowBook(null);
    onDataChange();
  };

  const handleOpenAddForm = () => {
    setFormMode('add');
    setFormBook(null);
  };

  const handleEdit = (book: Book) => {
    setFormMode('edit');
    setFormBook(book);
  };

  const handleFormSubmit = async (data: {
    title: string;
    author: string;
    isbn: string;
    category: Category;
    total_stock: number;
  }) => {
    if (formMode === 'add') {
      await bookApi.addBook(data);
    } else if (formBook) {
      await bookApi.updateBook(formBook.id, data);
    }
    setFormBook(null);
    onDataChange();
  };

  const handleDelete = async (book: Book) => {
    if (!window.confirm(`确定要删除《${book.title}》吗？`)) return;
    try {
      await bookApi.deleteBook(book.id);
      onDataChange();
    } catch (err: any) {
      alert(err.response?.data?.error || '删除失败');
    }
  };

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>📚 图书管理</h2>
          <p style={styles.sectionSubtitle}>
            共 <strong style={styles.totalNum}>{total}</strong> 本图书
            {debouncedSearch && ` · 搜索「${debouncedSearch}」`}
            {category !== '全部' && ` · ${category}分类`}
          </p>
        </div>
        <button style={styles.addBtn} onClick={handleOpenAddForm}>
          ➕ 添加新书
        </button>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchWrap}>
          <svg
            style={styles.searchIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            style={styles.searchInput}
            placeholder="搜索书名或作者..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={styles.filterWrap}>
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            const activeColor = categoryBtnColors[cat];
            return (
              <button
                key={cat}
                style={{
                  ...styles.filterBtn,
                  ...(active
                    ? {
                        backgroundColor: activeColor,
                        color: '#ffffff',
                        boxShadow: `0 4px 12px ${activeColor}40`,
                        transform: 'translateY(-2px)',
                      }
                    : {}),
                }}
                onClick={() => handleCategoryChange(cat)}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <div style={styles.listArea}>
        {loading ? (
          <div style={styles.loading}>
            <div style={styles.spinner} />
            <span>加载中...</span>
          </div>
        ) : (
          <>
            <BookList
              books={books}
              onBorrow={handleBorrow}
              onEdit={handleEdit}
              onDelete={handleDelete}
              animationClass={
                pageAnim === 'left'
                  ? 'page-enter-left'
                  : pageAnim === 'right'
                  ? 'page-enter-right'
                  : undefined
              }
            />
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>

      <BorrowDialog
        book={borrowBook}
        onClose={() => setBorrowBook(null)}
        onSubmit={handleBorrowSubmit}
      />
      <BookFormDialog
        book={formMode === 'edit' ? formBook : null}
        mode={formMode}
        onClose={() => setFormBook(null)}
        onSubmit={handleFormSubmit}
      />
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 28,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    animation: 'fadeIn 0.5s ease 0.2s both',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1a202c',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#718096',
  },
  totalNum: {
    color: '#2b6cb0',
    fontSize: 16,
  },
  addBtn: {
    padding: '10px 20px',
    borderRadius: 10,
    backgroundColor: '#3182ce',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    boxShadow: '0 4px 12px rgba(49,130,206,0.25)',
    transition: 'all 0.2s ease',
  },
  toolbar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  searchWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    width: 18,
    height: 18,
    color: '#a0aec0',
    zIndex: 1,
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px 12px 44px',
    borderRadius: 12,
    border: '2px solid #cbd5e0',
    fontSize: 15,
    color: '#2d3748',
    backgroundColor: '#ffffff',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
  },
  filterWrap: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '8px 18px',
    borderRadius: 999,
    backgroundColor: '#edf2f7',
    color: '#4a5568',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  listArea: {
    minHeight: 200,
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: 16,
    color: '#718096',
    fontSize: 14,
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #e2e8f0',
    borderTopColor: '#3182ce',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

export default ManagePage;
