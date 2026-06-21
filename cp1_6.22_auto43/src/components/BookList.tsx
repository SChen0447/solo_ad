import type { Book } from '../types';
import type { BookStatus, Category } from '../types';

interface Props {
  books: Book[];
  onBorrow: (book: Book) => void;
  onEdit: (book: Book) => void;
  onDelete: (book: Book) => void;
  animationClass?: string;
}

const categoryColors: Record<Category, { bg: string; color: string }> = {
  文学: { bg: '#fef3c7', color: '#92400e' },
  科技: { bg: '#dbeafe', color: '#1e40af' },
  生活: { bg: '#dcfce7', color: '#166534' },
  童书: { bg: '#fce7f3', color: '#9d174d' },
};

const statusColors: Record<BookStatus, { bg: string; color: string; dot: string }> = {
  在架: { bg: '#c6f6d5', color: '#22543d', dot: '#48bb78' },
  借出: { bg: '#feebc8', color: '#7b341e', dot: '#ed8936' },
  下架: { bg: '#e2e8f0', color: '#4a5568', dot: '#a0aec0' },
};

function BookList({ books, onBorrow, onEdit, onDelete, animationClass }: Props) {
  if (books.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>📭</div>
        <div style={styles.emptyText}>暂无图书数据</div>
        <div style={styles.emptyHint}>试试添加一本新书，或者调整筛选条件</div>
      </div>
    );
  }

  return (
    <div className={`book-grid ${animationClass || ''}`} style={styles.grid}>
      {books.map((book, idx) => {
        const catStyle = categoryColors[book.category];
        const statStyle = statusColors[book.status];
        const canBorrow = book.available_stock > 0;

        return (
          <div
            key={book.id}
            className="book-card"
            style={{
              ...styles.card,
              animation: `fadeIn 0.4s ease ${idx * 0.03}s both`,
            }}
          >
            <div style={styles.cardHeader}>
              <span
                style={{
                  ...styles.categoryPill,
                  backgroundColor: catStyle.bg,
                  color: catStyle.color,
                }}
              >
                {book.category}
              </span>
              <span
                style={{
                  ...styles.statusBadge,
                  backgroundColor: statStyle.bg,
                  color: statStyle.color,
                }}
              >
                <span
                  style={{
                    ...styles.statusDot,
                    backgroundColor: statStyle.dot,
                  }}
                />
                {book.status}
              </span>
            </div>

            <div style={styles.cardBody}>
              <h3 style={styles.bookTitle} title={book.title}>
                {book.title}
              </h3>
              <p style={styles.bookAuthor}>作者：{book.author}</p>
              <p style={styles.bookIsbn}>ISBN：{book.isbn}</p>
            </div>

            <div style={styles.stockBar}>
              <div style={styles.stockInfo}>
                <span style={styles.stockLabel}>库存</span>
                <span style={styles.stockValue}>
                  <strong style={styles.availableStock}>{book.available_stock}</strong>
                  <span style={styles.stockDivider}>/</span>
                  <span style={styles.totalStock}>{book.total_stock}</span>
                </span>
              </div>
              <div style={styles.stockProgressWrap}>
                <div
                  style={{
                    ...styles.stockProgress,
                    width: `${book.total_stock > 0 ? (book.available_stock / book.total_stock) * 100 : 0}%`,
                    backgroundColor:
                      book.available_stock === 0
                        ? '#e53e3e'
                        : book.available_stock < book.total_stock * 0.3
                        ? '#ed8936'
                        : '#48bb78',
                  }}
                />
              </div>
            </div>

            <div style={styles.cardActions}>
              <button
                style={{
                  ...styles.actionBtn,
                  ...styles.borrowBtn,
                  ...(!canBorrow ? styles.btnDisabled : {}),
                }}
                onClick={() => canBorrow && onBorrow(book)}
                disabled={!canBorrow}
              >
                📤 借出
              </button>
              <button
                style={{ ...styles.actionBtn, ...styles.editBtn }}
                onClick={() => onEdit(book)}
              >
                ✏️ 编辑
              </button>
              <button
                style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                onClick={() => onDelete(book)}
              >
                🗑️ 删除
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 24,
  },
  '@media (min-width: 768px) and (max-width: 1023px)': {
    grid: {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
  },
  '@media (min-width: 1024px)': {
    grid: {
      gridTemplateColumns: 'repeat(3, 1fr)',
    },
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryPill: {
    padding: '4px 12px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    display: 'inline-block',
  },
  cardBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minHeight: 0,
  },
  bookTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: '#1a202c',
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  bookAuthor: {
    fontSize: 14,
    color: '#4a5568',
  },
  bookIsbn: {
    fontSize: 12,
    color: '#a0aec0',
    marginTop: 'auto',
  },
  stockBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  stockInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 12,
    color: '#718096',
  },
  stockValue: {
    fontSize: 14,
    display: 'flex',
    alignItems: 'baseline',
    gap: 4,
  },
  availableStock: {
    fontSize: 18,
    fontWeight: 700,
    color: '#2d3748',
  },
  stockDivider: {
    color: '#cbd5e0',
  },
  totalStock: {
    color: '#a0aec0',
  },
  stockProgressWrap: {
    height: 6,
    backgroundColor: '#edf2f7',
    borderRadius: 3,
    overflow: 'hidden',
  },
  stockProgress: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.3s ease, background-color 0.3s ease',
  },
  cardActions: {
    display: 'flex',
    gap: 8,
    paddingTop: 4,
    borderTop: '1px solid #f0f4f8',
  },
  actionBtn: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.15s ease',
  },
  borrowBtn: {
    backgroundColor: '#ebf8ff',
    color: '#2b6cb0',
  },
  editBtn: {
    backgroundColor: '#faf5ff',
    color: '#6b46c1',
  },
  deleteBtn: {
    backgroundColor: '#fff5f5',
    color: '#c53030',
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    backgroundColor: '#edf2f7',
    color: '#a0aec0',
  },
  empty: {
    padding: '60px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    fontSize: 64,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 500,
    color: '#4a5568',
  },
  emptyHint: {
    fontSize: 14,
    color: '#a0aec0',
  },
};

export default BookList;
