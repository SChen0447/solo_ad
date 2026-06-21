import { useState, useEffect } from 'react';
import type { Book } from '../types';

interface Props {
  book: Book | null;
  onClose: () => void;
  onSubmit: (data: { borrower_name: string; expected_return_date: string }) => Promise<void>;
}

function BorrowDialog({ book, onClose, onSubmit }: Props) {
  const [borrowerName, setBorrowerName] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (book) {
      setBorrowerName('');
      const date = new Date();
      date.setDate(date.getDate() + 30);
      setReturnDate(date.toISOString().split('T')[0]);
      setError('');
      setSubmitting(false);
    }
  }, [book]);

  if (!book) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!borrowerName.trim()) {
      setError('请输入借阅者姓名');
      return;
    }
    if (!returnDate) {
      setError('请选择预计归还日期');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        borrower_name: borrowerName.trim(),
        expected_return_date: returnDate,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || '提交失败，请重试');
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={styles.dialog}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <h2 style={styles.title}>📤 图书出借</h2>
          <button style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.bookInfo}>
          <div style={styles.bookTitle}>{book.title}</div>
          <div style={styles.bookMeta}>
            <span>作者：{book.author}</span>
            <span style={styles.metaSep}>·</span>
            <span>分类：{book.category}</span>
          </div>
          <div style={styles.stockHint}>
            当前可借库存：
            <strong style={styles.stockNum}>{book.available_stock}</strong> 本
          </div>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>借阅者姓名 <span style={styles.required}>*</span></label>
            <input
              type="text"
              style={styles.input}
              value={borrowerName}
              onChange={(e) => setBorrowerName(e.target.value)}
              placeholder="请输入借阅者姓名"
              disabled={submitting}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>预计归还日期 <span style={styles.required}>*</span></label>
            <input
              type="date"
              style={styles.input}
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              disabled={submitting}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.actions}>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={onClose}
              disabled={submitting}
            >
              取消
            </button>
            <button
              type="submit"
              style={styles.confirmBtn}
              disabled={submitting}
            >
              {submitting ? '提交中...' : '确认出借'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    padding: 28,
    boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
    animation: 'modalIn 0.2s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: '#1a202c',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f7fafc',
    color: '#718096',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s ease',
  },
  bookInfo: {
    backgroundColor: '#f7fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#2d3748',
    marginBottom: 6,
  },
  bookMeta: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  metaSep: {
    color: '#cbd5e0',
  },
  stockHint: {
    fontSize: 14,
    color: '#4a5568',
  },
  stockNum: {
    color: '#2b6cb0',
    fontSize: 18,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: '#4a5568',
  },
  required: {
    color: '#e53e3e',
  },
  input: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #cbd5e0',
    fontSize: 14,
    color: '#2d3748',
    backgroundColor: '#ffffff',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
  },
  error: {
    backgroundColor: '#fff5f5',
    color: '#c53030',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    border: '1px solid #feb2b2',
  },
  actions: {
    display: 'flex',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    padding: '11px 16px',
    borderRadius: 8,
    backgroundColor: '#edf2f7',
    color: '#4a5568',
    fontSize: 14,
    fontWeight: 500,
    transition: 'background-color 0.15s ease',
  },
  confirmBtn: {
    flex: 1,
    padding: '11px 16px',
    borderRadius: 8,
    backgroundColor: '#3182ce',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 500,
    transition: 'background-color 0.15s ease',
  },
};

export default BorrowDialog;
