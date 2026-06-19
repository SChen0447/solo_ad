import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import '../styles/modal.css';

interface AddArtistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded?: (artistId: string) => void;
}

const AddArtistModal: React.FC<AddArtistModalProps> = ({ isOpen, onClose, onAdded }) => {
  const { addArtist } = useApp();
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [styleTags, setStyleTags] = useState('');
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const tags = styleTags
        .split(/[,，、\s]+/)
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const artist = await addArtist({
        name: name.trim(),
        avatarUrl: avatarUrl.trim(),
        styleTags: tags,
        bio: bio.trim(),
      });

      setName('');
      setAvatarUrl('');
      setStyleTags('');
      setBio('');
      onClose();
      onAdded?.(artist.id);
    } catch (err) {
      console.error('Failed to add artist:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">新增艺术家</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">姓名 *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="输入艺术家姓名"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">头像 URL</label>
            <input
              type="text"
              className="form-input"
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">风格标签</label>
            <input
              type="text"
              className="form-input"
              value={styleTags}
              onChange={e => setStyleTags(e.target.value)}
              placeholder="用逗号分隔，如：摇滚, 电子, 独立"
            />
          </div>
          <div className="form-group">
            <label className="form-label">简介</label>
            <textarea
              className="form-textarea"
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="艺术家简介..."
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || !name.trim()}
            >
              {submitting ? '提交中...' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddArtistModal;
