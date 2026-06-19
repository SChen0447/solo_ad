import { useState } from 'react';
import type { AddBookData } from '../types';

interface AddBookModalProps {
  categories: string[];
  onSubmit: (data: AddBookData) => Promise<void>;
  onClose: () => void;
}

interface FormErrors {
  title?: string;
  author?: string;
  isbn?: string;
  category?: string;
  coverUrl?: string;
}

export default function AddBookModal(props: AddBookModalProps) {
  const { categories, onSubmit, onClose } = props;

  const [formData, setFormData] = useState<AddBookData>({
    title: '',
    author: '',
    isbn: '',
    category: categories[0] || '',
    coverUrl: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    field: keyof AddBookData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!formData.title.trim()) errs.title = '请输入书名';
    if (!formData.author.trim()) errs.author = '请输入作者';
    if (!formData.isbn.trim()) errs.isbn = '请输入ISBN';
    if (!formData.category) errs.category = '请选择分类';
    if (!formData.coverUrl.trim()) {
      errs.coverUrl = '请输入封面图URL';
    } else {
      try {
        new URL(formData.coverUrl);
      } catch {
        errs.coverUrl = '请输入有效的URL地址';
      }
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: formData.title.trim(),
        author: formData.author.trim(),
        isbn: formData.isbn.trim(),
        category: formData.category,
        coverUrl: formData.coverUrl.trim(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '提交失败';
      setErrors({ title: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !submitting) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">📚 上架新书</div>
          <button
            className="modal-close"
            onClick={onClose}
            disabled={submitting}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="title">
                书名 <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                id="title"
                type="text"
                className="form-input"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="请输入书名"
                autoFocus
                disabled={submitting}
              />
              {errors.title && (
                <div className="form-error">{errors.title}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="author">
                作者 <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                id="author"
                type="text"
                className="form-input"
                value={formData.author}
                onChange={(e) => handleChange('author', e.target.value)}
                placeholder="请输入作者姓名"
                disabled={submitting}
              />
              {errors.author && (
                <div className="form-error">{errors.author}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="isbn">
                ISBN <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                id="isbn"
                type="text"
                className="form-input"
                value={formData.isbn}
                onChange={(e) => handleChange('isbn', e.target.value)}
                placeholder="如：9787111000000"
                disabled={submitting}
              />
              {errors.isbn && (
                <div className="form-error">{errors.isbn}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="category">
                分类 <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <select
                id="category"
                className="form-input"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                disabled={submitting}
                style={{ cursor: 'pointer' }}
              >
                <option value="">请选择分类</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.category && (
                <div className="form-error">{errors.category}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="coverUrl">
                封面图URL <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                id="coverUrl"
                type="text"
                className="form-input"
                value={formData.coverUrl}
                onChange={(e) => handleChange('coverUrl', e.target.value)}
                placeholder="https://example.com/cover.jpg"
                disabled={submitting}
              />
              {errors.coverUrl && (
                <div className="form-error">{errors.coverUrl}</div>
              )}
              {!errors.coverUrl && formData.coverUrl.trim() && (
                <div className="form-hint">
                  预览：
                  <img
                    src={formData.coverUrl}
                    alt="cover preview"
                    style={{
                      display: 'block',
                      marginTop: '8px',
                      width: '80px',
                      height: '112px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border)',
                    }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={submitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? '提交中...' : '确认上架'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
