import { useState, useRef } from 'react';
import { Book } from '../api';

interface Props {
  books: Book[];
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    bookIds: string[];
    maxMembers: number;
    tags: string[];
  }) => Promise<void>;
}

export default function CircleFormModal({ books, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxMembers, setMaxMembers] = useState(6);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const tagRef = useRef<HTMLInputElement>(null);

  const toggleBook = (id: string) => {
    setSelectedBooks((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

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
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        bookIds: selectedBooks,
        maxMembers,
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
            <div className="modal-title">创建阅读圈</div>
            <button type="button" className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">圈名 *</label>
              <input
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：三体深度阅读圈"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">简介</label>
              <textarea
                className="form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="介绍一下你们的阅读计划..."
                rows={3}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">最多成员数</label>
                <input
                  type="number"
                  className="form-input"
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(Math.max(2, Math.min(20, parseInt(e.target.value) || 6)))}
                  min={2}
                  max={20}
                />
              </div>
              <div className="form-group">
                <label className="form-label">圈子标签</label>
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
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">计划阅读书目（可多选）</label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                maxHeight: '180px',
                overflowY: 'auto',
                padding: '10px',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: 'var(--radius-sm)'
              }}>
                {books.length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', gridColumn: '1 / -1' }}>
                    暂无书籍，先发布书籍再创建圈子吧
                  </div>
                )}
                {books.map((b) => (
                  <label
                    key={b.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: selectedBooks.includes(b.id) ? 'var(--accent-light)' : 'var(--bg-card)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      border: selectedBooks.includes(b.id) ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedBooks.includes(b.id)}
                      onChange={() => toggleBook(b.id)}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: selectedBooks.includes(b.id) ? 600 : 400
                    }}>
                      {b.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !name.trim()}>
              {submitting ? '创建中...' : '创建圈子'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
