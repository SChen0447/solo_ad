import React, { useState } from 'react';
import { Card } from './types';
import { cardService } from './services/cardService';
import { marked } from 'marked';
import './CreateCardModal.css';

interface CreateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (card: Card) => void;
}

const CreateCardModal: React.FC<CreateCardModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('前端');
  const [content, setContent] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('标题和内容不能为空');
      return;
    }
    try {
      setSubmitting(true);
      const newCard = await cardService.createCard({
        title: title.trim(),
        category,
        content: content.trim(),
        difficulty
      });
      onCreated(newCard);
      setTitle('');
      setCategory('前端');
      setContent('');
      setDifficulty(3);
      setError('');
      onClose();
    } catch (err) {
      setError('创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>新建知识卡片</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label>标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入卡片标题"
              className="form-input"
              maxLength={100}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>分类</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="form-select"
              >
                <option value="前端">前端</option>
                <option value="后端">后端</option>
                <option value="工具">工具</option>
                <option value="踩坑">踩坑</option>
              </select>
            </div>

            <div className="form-group">
              <label>难度星级</label>
              <div className="difficulty-selector">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="star-btn"
                    onClick={() => setDifficulty(star)}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill={star <= difficulty ? '#f59e0b' : 'none'}
                      stroke={star <= difficulty ? '#f59e0b' : '#d1d5db'}
                      strokeWidth="2"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>正文内容 (Markdown)</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="支持 Markdown 格式，输入你的知识内容..."
              className="form-textarea"
              rows={10}
            />
          </div>

          {content && (
            <div className="form-group">
              <label>预览</label>
              <div
                className="markdown-preview"
                dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }}
              />
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? '创建中...' : '创建卡片'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCardModal;
