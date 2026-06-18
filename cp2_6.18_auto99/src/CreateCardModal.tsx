import React, { useState } from 'react';
import { CATEGORIES, Category } from './types';

interface CreateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { title: string; category: Category; content: string; difficulty: number }) => void;
}

const CreateCardModal: React.FC<CreateCardModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('前端');
  const [content, setContent] = useState('');
  const [difficulty, setDifficulty] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onCreate({ title, category, content, difficulty });
    setTitle('');
    setCategory('前端');
    setContent('');
    setDifficulty(1);
    onClose();
  };

  if (!isOpen) return null;

  const renderStars = (rating: number, interactive = true) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
            onClick={interactive ? () => setDifficulty(star) : undefined}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>创建新卡片</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入卡片标题..."
              className="form-input"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>分类</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="form-select"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>难度星级</label>
              {renderStars(difficulty)}
            </div>
          </div>

          <div className="form-group">
            <label>内容 (支持 Markdown)</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入卡片内容，支持 Markdown 格式..."
              className="form-textarea"
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              创建卡片
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCardModal;
