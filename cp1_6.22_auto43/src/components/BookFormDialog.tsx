import { useState, useEffect } from 'react';
import type { Book, Category } from '../types';

interface Props {
  book: Book | null;
  mode: 'add' | 'edit';
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    author: string;
    isbn: string;
    category: Category;
    total_stock: number;
  }) => Promise<void>;
}

const categories: Category[] = ['文学', '科技', '生活', '童书'];

function BookFormDialog({ book, mode, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [category, setCategory] = useState<Category>('文学');
  const [stock, setStock] = useState(5);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (book && mode === 'edit') {
      setTitle(book.title);
      setAuthor(book.author);
      setIsbn(book.isbn);
      setCategory(book.category);
      setStock(book.total_stock);
    } else {
      setTitle('');
      setAuthor('');
      setIsbn('');
      setCategory('文学');
      setStock(5);
    }
    setErrors({});
    setSubmitting(false);
  }, [book, mode]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = '请输入书名';
    }
    if (!author.trim()) {
      newErrors.author = '请输入作者';
    }
    if (!/^\d{13}$/.test(isbn)) {
      newErrors.isbn = 'ISBN必须是13位数字';
    }
    if (stock < 0 || stock > 99) {
      newErrors.stock = '库存数量必须是0-99的整数';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        author: author.trim(),
        isbn,
        category,
        total_stock: stock,
      });
    } catch (err: any) {
      const errMsg = err.response?.data?.error || '提交失败，请重试';
      if (errMsg.includes('ISBN')) {
        setErrors({ isbn: errMsg });
      } else {
        setErrors({ _form: errMsg });
      }
      setSubmitting(false);
    }
  };

  const adjustStock = (delta: number) => {
    const newVal = Math.max(0, Math.min(99, stock + delta));
    setStock(newVal);
  };

  if (!book && mode === 'edit') return null;
  if (mode === 'add' && book) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            {mode === 'add' ? '➕ 添加新书' : '✏️ 编辑图书信息'}
          </h2>
          <button style={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>书名 <span style={styles.required}>*</span></label>
            <input
              type="text"
              style={{ ...styles.input, ...(errors.title ? styles.inputError : {}) }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入书名"
              disabled={submitting}
            />
            {errors.title && <div style={styles.fieldError}>{errors.title}</div>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>作者 <span style={styles.required}>*</span></label>
            <input
              type="text"
              style={{ ...styles.input, ...(errors.author ? styles.inputError : {}) }}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="请输入作者姓名"
              disabled={submitting}
            />
            {errors.author && <div style={styles.fieldError}>{errors.author}</div>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>ISBN（13位数字）<span style={styles.required}>*</span></label>
            <input
              type="text"
              inputMode="numeric"
              style={{ ...styles.input, ...(errors.isbn ? styles.inputError : {}) }}
              value={isbn}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 13);
                setIsbn(val);
              }}
              placeholder="请输入13位ISBN编号"
              maxLength={13}
              disabled={submitting || mode === 'edit'}
            />
            {errors.isbn && <div style={styles.fieldError}>{errors.isbn}</div>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>分类 <span style={styles.required}>*</span></label>
            <select
              style={styles.select}
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              disabled={submitting}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>初始库存（0-99）<span style={styles.required}>*</span></label>
            <div style={styles.stockInputWrap}>
              <button
                type="button"
                style={styles.stockBtn}
                onClick={() => adjustStock(-1)}
                disabled={submitting || stock <= 0}
              >
                −
              </button>
              <input
                type="number"
                min={0}
                max={99}
                style={{ ...styles.stockInput, ...(errors.stock ? styles.inputError : {}) }}
                value={stock}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) {
                    setStock(Math.max(0, Math.min(99, val)));
                  } else {
                    setStock(0);
                  }
                }}
                disabled={submitting}
              />
              <button
                type="button"
                style={styles.stockBtn}
                onClick={() => adjustStock(1)}
                disabled={submitting || stock >= 99}
              >
                +
              </button>
            </div>
            {errors.stock && <div style={styles.fieldError}>{errors.stock}</div>}
          </div>

          {errors._form && (
            <div style={styles.errorBox}>{errors._form}</div>
          )}

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
              {submitting
                ? '提交中...'
                : mode === 'add'
                ? '添加图书'
                : '保存修改'}
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
    maxWidth: 520,
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: 28,
    boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
    animation: 'modalIn 0.2s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
  select: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #cbd5e0',
    fontSize: 14,
    color: '#2d3748',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
  stockInputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    overflow: 'hidden',
    borderRadius: 8,
    border: '1px solid #cbd5e0',
    width: 'fit-content',
  },
  stockBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#f7fafc',
    color: '#4a5568',
    fontSize: 20,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    transition: 'background-color 0.15s ease',
  },
  stockInput: {
    width: 70,
    height: 40,
    border: 'none',
    borderLeft: '1px solid #e2e8f0',
    borderRight: '1px solid #e2e8f0',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 600,
    color: '#2d3748',
    backgroundColor: '#ffffff',
    appearance: 'textfield',
  },
  inputError: {
    borderColor: '#fc8181',
    backgroundColor: '#fff5f5',
  },
  fieldError: {
    fontSize: 12,
    color: '#c53030',
  },
  errorBox: {
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
  },
  confirmBtn: {
    flex: 1,
    padding: '11px 16px',
    borderRadius: 8,
    backgroundColor: '#3182ce',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 500,
  },
};

export default BookFormDialog;
