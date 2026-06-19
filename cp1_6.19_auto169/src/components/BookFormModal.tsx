import { useState, useRef } from 'react';
import { Book } from '../api';

interface Props {
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    author: string;
    category: string;
    description: string;
    coverUrl: string;
    tags: string[];
  }) => Promise<void>;
  initialData?: Book | null;
}

const CATEGORIES = ['科幻', '文学', '技术', '历史', '艺术', '哲学', '经济', '其他'];

export default function BookFormModal({ onClose, onSubmit, initialData }: Props) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [author, setAuthor] = useState(initialData?.author || '');
  const [category, setCategory] = useState(initialData?.category || '科幻');
  const [description, setDescription] = useState(initialData?.description || '');
  const [coverUrl, setCoverUrl] = useState(initialData?.coverUrl || '');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [submitting, setSubmitting] = useState(false);
  const tagRef = useRef<HTMLInputElement>(null);

  const addTag = (text: string) => {
    const t = text.trim();
    if (!t) return;
    if (tags.includes(t)) return;
    setTags([...tags, t]);
    setTagsInput('');
  };

  const handleTagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
      e.preventDefault();
      addTag(tagsInput);
    } else if (e.key === 'Backspace' && tagsInput === '' && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        author: author.trim(),
        category,
        description: description.trim(),
        coverUrl: coverUrl.trim() || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop',
        tags
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay fade-in" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <div className="modal-title">{initialData ? '编辑书籍' : '发布闲置书籍'}</div>
            <button type="button" className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">书名 *</label>
                <input
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：三体"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">作者 *</label>
                <input
                  className="form-input"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="例如：刘慈欣"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">类别</label>
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">封面图片 URL</label>
                <input
                  className="form-input"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">简介</label>
              <textarea
                className="form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="写点关于这本书的介绍..."
                rows={3}
              />
            </div>
            <div className="form-group">
              <label className="form-label">标签</label>
              <div
                className="tags-input"
                onClick={() => tagRef.current?.focus()}
              >
                {tags.map((t, i) => (
                  <span key={t + i} className="tag-input-item">
                    {t}
                    <span
                      className="tag-input-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTags(tags.filter((_, idx) => idx !== i));
                      }}
                    >
                      ×
                    </span>
                  </span>
                ))}
                <input
                  ref={tagRef}
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onKeyDown={handleTagKey}
                  onBlur={() => addTag(tagsInput)}
                  placeholder="输入标签后回车"
                />
              </div>
              <div className="input-help">多个标签用回车或逗号分隔</div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? '提交中...' : initialData ? '保存修改' : '确认发布'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
