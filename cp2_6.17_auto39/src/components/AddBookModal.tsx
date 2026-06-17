import React, { useState } from 'react';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (book: {
    title: string;
    author: string;
    coverUrl: string;
    totalPages: number;
    currentPage: number;
  }) => void;
}

const AddBookModal: React.FC<AddBookModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [currentPage, setCurrentPage] = useState('0');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim() || !totalPages) return;

    onAdd({
      title: title.trim(),
      author: author.trim(),
      coverUrl: coverUrl.trim(),
      totalPages: parseInt(totalPages),
      currentPage: parseInt(currentPage) || 0
    });

    setTitle('');
    setAuthor('');
    setCoverUrl('');
    setTotalPages('');
    setCurrentPage('0');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">添加书籍</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">书名 *</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入书名"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">作者 *</label>
            <input
              type="text"
              className="form-input"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="请输入作者"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">封面URL</label>
            <input
              type="url"
              className="form-input"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="请输入封面图片URL（可选）"
            />
          </div>
          <div className="form-group">
            <label className="form-label">总页数 *</label>
            <input
              type="number"
              className="form-input"
              value={totalPages}
              onChange={(e) => setTotalPages(e.target.value)}
              placeholder="请输入总页数"
              min="1"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">当前页码</label>
            <input
              type="number"
              className="form-input"
              value={currentPage}
              onChange={(e) => setCurrentPage(e.target.value)}
              placeholder="请输入当前阅读页码"
              min="0"
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn">
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBookModal;
