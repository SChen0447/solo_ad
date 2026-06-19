import React, { useState, useRef } from 'react';
import { BOOK_GENRES, PRESET_COVERS, type BookGenre } from '@/types';
import type { BookStatus } from '@/types';

interface AddBookModalProps {
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    author: string;
    totalPages: number;
    genre: BookGenre;
    coverImage: string;
    startDate: string;
    currentPage: number;
    status: BookStatus;
  }) => void;
}

const AddBookModal: React.FC<AddBookModalProps> = ({ onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [currentPage, setCurrentPage] = useState('0');
  const [genre, setGenre] = useState<BookGenre>('小说');
  const [coverImage, setCoverImage] = useState(PRESET_COVERS[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customCover, setCustomCover] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setCoverImage(dataUrl);
      setCustomCover(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim() || !totalPages) return;
    const pages = Math.max(1, parseInt(totalPages) || 1);
    const cur = Math.min(pages, Math.max(0, parseInt(currentPage) || 0));
    const status: BookStatus =
      cur === 0 ? 'not_started' : cur >= pages ? 'completed' : 'reading';

    onSubmit({
      title: title.trim(),
      author: author.trim(),
      totalPages: pages,
      genre,
      coverImage,
      startDate,
      currentPage: cur,
      status,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>添加新书本</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="cover-selector">
            <label className="form-label">选择封面</label>
            <div className="cover-preview">
              <img src={coverImage} alt="封面预览" />
            </div>
            <div className="cover-presets">
              {PRESET_COVERS.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  className={`cover-thumb ${coverImage === c && !customCover ? 'active' : ''}`}
                  onClick={() => { setCoverImage(c); setCustomCover(''); }}
                >
                  <img src={c} alt={`预设${i + 1}`} loading="lazy" />
                </button>
              ))}
              <button
                type="button"
                className="cover-upload-btn"
                onClick={() => fileRef.current?.click()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                <span>上传封面</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-item col-span-2">
              <label className="form-label">书名 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="请输入书名"
                className="form-input"
              />
            </div>
            <div className="form-item col-span-2">
              <label className="form-label">作者 *</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                required
                placeholder="请输入作者"
                className="form-input"
              />
            </div>
            <div className="form-item">
              <label className="form-label">类型</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value as BookGenre)}
                className="form-input"
              >
                {BOOK_GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="form-item">
              <label className="form-label">开始阅读日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-item">
              <label className="form-label">总页数 *</label>
              <input
                type="number"
                min="1"
                value={totalPages}
                onChange={(e) => setTotalPages(e.target.value)}
                required
                placeholder="300"
                className="form-input"
              />
            </div>
            <div className="form-item">
              <label className="form-label">当前页码</label>
              <input
                type="number"
                min="0"
                value={currentPage}
                onChange={(e) => setCurrentPage(e.target.value)}
                placeholder="0"
                className="form-input"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn-primary">
              添加到书架
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBookModal;
