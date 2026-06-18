import React, { useState } from 'react';

interface NewCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string) => Promise<void>;
}

const NewCardModal: React.FC<NewCardModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('请填写标题');
      return;
    }

    if (!content.trim()) {
      setError('请填写内容');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(title.trim(), content.trim());
      setTitle('');
      setContent('');
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('发布失败，请重试');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('');
      setContent('');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose} disabled={isSubmitting}>
          ×
        </button>
        <h2 className="modal-title">匿名发布心声</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">标题</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={40}
              placeholder="请输入标题（最多40字）"
              disabled={isSubmitting}
            />
            <span className="char-count">{title.length}/40</span>
          </div>
          <div className="form-group">
            <label htmlFor="content">正文</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={500}
              placeholder="说出你的心声（最多500字）"
              rows={6}
              disabled={isSubmitting}
            />
            <span className="char-count">{content.length}/500</span>
          </div>
          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? '发布中...' : '匿名发布'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewCardModal;
