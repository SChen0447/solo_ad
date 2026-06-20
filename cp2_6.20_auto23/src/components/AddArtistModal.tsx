import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Artist } from '../types';

export interface CreatedFromPoint {
  x: number;
  y: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (artist: Artist, fromPoint: CreatedFromPoint) => void;
}

const AddArtistModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const { addArtist, styleColors } = useAppContext();
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const tagRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setAvatarUrl('');
      setBio('');
      setTags([]);
      setTagInput('');
    }
  }, [open]);

  if (!open) return null;

  const handleAddTag = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().replace(',', '');
      if (t && !tags.includes(t) && tags.length < 5) {
        setTags([...tags, t]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter(x => x !== t));
  };

  const handleQuickTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter(x => x !== tag));
    } else if (tags.length < 5) {
      setTags([...tags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      let fromPoint: CreatedFromPoint = { x: window.innerWidth / 2, y: 100 };
      if (modalRef.current) {
        const rect = modalRef.current.getBoundingClientRect();
        fromPoint = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      }
      const artist = await addArtist({
        name: name.trim(),
        avatarUrl: avatarUrl.trim(),
        styleTags: tags,
        bio: bio.trim(),
      });
      onCreated?.(artist, fromPoint);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const colorForTag = (tag: string) => styleColors[tag] || '#6c63ff';

  const suggestedTags = ['Indie Rock', 'Electronic', 'Hip Hop', 'Jazz', 'Folk', 'Synthwave', 'Ambient', 'R&B', 'Punk', 'Dream Pop'];

  return (
    <div className="modal-overlay modal-overlay-enter" onClick={onClose}>
      <div className="modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <h2>添加新艺术家</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">艺术家姓名 *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入艺术家或乐队名称"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">头像 URL</label>
            <input
              type="text"
              className="form-input"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div className="form-group">
            <label className="form-label">风格标签（最多5个，Enter添加）</label>
            <div className="tags-input-wrapper" onClick={() => tagRef.current?.focus()}>
              {tags.map((t, i) => (
                <span
                  key={i}
                  className="tag-chip"
                  style={{ background: colorForTag(t), color: '#fff' }}
                >
                  {t}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemoveTag(t); }}
                  >×</button>
                </span>
              ))}
              <input
                ref={tagRef}
                className="tag-chip-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder={tags.length < 5 ? '输入风格...' : '已达上限'}
                disabled={tags.length >= 5}
              />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {suggestedTags.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleQuickTag(t)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 12,
                    border: `1px solid ${tags.includes(t) ? colorForTag(t) : '#d0d0d8'}`,
                    background: tags.includes(t) ? colorForTag(t) : 'transparent',
                    color: tags.includes(t) ? '#fff' : '#606078',
                    fontSize: 11,
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">简介</label>
            <textarea
              className="form-textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="关于这位艺术家的简短介绍..."
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              style={{ color: '#606078', borderColor: '#d0d0d8' }}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!name.trim()}
            >
              创建艺术家
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddArtistModal;
