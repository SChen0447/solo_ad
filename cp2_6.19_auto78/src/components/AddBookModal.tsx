import { useState } from 'react';
import type { Book } from '../types';

interface AddBookModalProps {
  onClose: () => void;
  onAdded: (book: Book) => void;
  categories: string[];
}

function AddBookModal({ onClose, onAdded, categories }: AddBookModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: categories[0] || '文学',
    coverUrl: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = '请输入书名';
    }
    if (!formData.author.trim()) {
      newErrors.author = '请输入作者';
    }
    if (!formData.isbn.trim()) {
      newErrors.isbn = '请输入ISBN';
    }
    if (!formData.category) {
      newErrors.category = '请选择分类';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const newBook = await res.json();
        onAdded(newBook);
        onClose();
      } else {
        const error = await res.json();
        setErrors({ submit: error.error || '提交失败，请重试' });
      }
    } catch {
      setErrors({ submit: '网络错误，请稍后重试' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">上架新图书</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">书名 *</label>
              <input
                type="text"
                className={`form-input ${errors.title ? 'error' : ''}`}
                placeholder="请输入书名"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                autoFocus
              />
              {errors.title && <div className="form-error">{errors.title}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">作者 *</label>
              <input
                type="text"
                className={`form-input ${errors.author ? 'error' : ''}`}
                placeholder="请输入作者"
                value={formData.author}
                onChange={(e) => handleChange('author', e.target.value)}
              />
              {errors.author && <div className="form-error">{errors.author}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">ISBN *</label>
              <input
                type="text"
                className={`form-input ${errors.isbn ? 'error' : ''}`}
                placeholder="请输入ISBN编号"
                value={formData.isbn}
                onChange={(e) => handleChange('isbn', e.target.value)}
              />
              {errors.isbn && <div className="form-error">{errors.isbn}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">分类 *</label>
              <select
                className={`form-input ${errors.category ? 'error' : ''}`}
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && <div className="form-error">{errors.category}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">封面图URL（可选）</label>
              <input
                type="text"
                className="form-input"
                placeholder="请输入封面图片URL"
                value={formData.coverUrl}
                onChange={(e) => handleChange('coverUrl', e.target.value)}
              />
            </div>

            {errors.submit && (
              <div className="form-error" style={{ marginTop: '12px' }}>
                {errors.submit}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? '提交中...' : '确认上架'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddBookModal;
