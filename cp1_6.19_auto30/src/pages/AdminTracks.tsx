import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, Upload, X, Eye, EyeOff } from 'lucide-react';
import useStore, { Track } from '../store/useStore';

interface FormErrors {
  name?: string;
  artist?: string;
  duration?: string;
}

const AdminTracks: React.FC = () => {
  const { tracks, fetchTracks, addTrack, updateTrack, toggleTrackPublish, deleteTrack, albums } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    artist: '',
    albumId: '',
    duration: '',
    lyrics: ''
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredTracks = useMemo(() => {
    if (!debouncedQuery) return tracks;
    const query = debouncedQuery.toLowerCase();
    return tracks.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.artist.toLowerCase().includes(query)
    );
  }, [tracks, debouncedQuery]);

  const openModal = (track?: Track) => {
    if (track) {
      setEditingTrack(track);
      setFormData({
        name: track.name,
        artist: track.artist,
        albumId: track.albumId || '',
        duration: track.duration,
        lyrics: track.lyrics
      });
      setCoverPreview(track.coverUrl);
    } else {
      setEditingTrack(null);
      setFormData({ name: '', artist: '', albumId: '', duration: '', lyrics: '' });
      setCoverPreview('');
    }
    setCoverFile(null);
    setAudioFile(null);
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTrack(null);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = '请输入曲名';
    if (!formData.artist.trim()) newErrors.artist = '请输入艺人';
    if (!formData.duration.trim()) {
      newErrors.duration = '请输入时长';
    } else if (!/^\d{1,2}:\d{2}$/.test(formData.duration)) {
      newErrors.duration = '时长格式应为 mm:ss';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('name', formData.name);
      formDataObj.append('artist', formData.artist);
      formDataObj.append('duration', formData.duration);
      formDataObj.append('lyrics', formData.lyrics);
      if (formData.albumId) formDataObj.append('albumId', formData.albumId);
      if (coverFile) formDataObj.append('cover', coverFile);
      if (audioFile) formDataObj.append('audio', audioFile);

      if (editingTrack) {
        await updateTrack(editingTrack.id, formDataObj);
      } else {
        await addTrack(formDataObj);
      }
      closeModal();
    } catch (error) {
      console.error('Error saving track:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrors({ ...errors, name: '封面图片不能超过 2MB' });
        return;
      }
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ ...errors, name: '音频文件不能超过 10MB' });
        return;
      }
      setAudioFile(file);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这首曲目吗？')) {
      deleteTrack(id);
    }
  };

  return (
    <div className="admin-tracks">
      <div className="page-header">
        <h1 className="page-title">曲目管理</h1>
        <button className="btn-primary" onClick={() => openModal()}>
          <Plus size={18} />
          <span>添加曲目</span>
        </button>
      </div>

      <div className="search-bar">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="搜索曲目或艺人..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="track-list">
        {filteredTracks.length === 0 ? (
          <div className="empty-state">
            <p>{searchQuery ? '没有找到匹配的曲目' : '还没有添加任何曲目'}</p>
            <button className="btn-primary" style={{ marginTop: '16px' }} onClick={() => openModal()}>
              添加第一首曲目
            </button>
          </div>
        ) : (
          filteredTracks.map((track) => (
            <div key={track.id} className="track-item">
              <img
                src={track.coverUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%23667eea" stroke-width="2"%3E%3Ccircle cx="12" cy="12" r="10"/%3E%3Cpolygon points="10 8 16 12 10 16 10 8"/%3E%3C/svg%3E'}
                alt={track.name}
                className="track-cover"
              />
              <div className="track-info">
                <div className="track-name">{track.name}</div>
                <div className="track-meta">
                  {track.artist}
                  <span className="separator">•</span>
                  {track.duration}
                  {track.albumId && (
                    <>
                      <span className="separator">•</span>
                      <span className="album-badge">
                        {albums.find((a) => a.id === track.albumId)?.name}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="track-actions">
                <button
                  className={`switch ${track.isPublished ? 'active' : ''}`}
                  onClick={() => toggleTrackPublish(track.id)}
                  title={track.isPublished ? '已发布' : '未发布'}
                />
                <button className="action-btn" onClick={() => openModal(track)} title="编辑">
                  <Edit2 size={18} />
                </button>
                <button className="action-btn danger" onClick={() => handleDelete(track.id)} title="删除">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTrack ? '编辑曲目' : '添加曲目'}</h2>
              <button className="close-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>曲名 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入曲名"
                  />
                  {errors.name && <div className="error-text">{errors.name}</div>}
                </div>

                <div className="form-group">
                  <label>艺人 *</label>
                  <input
                    type="text"
                    value={formData.artist}
                    onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                    placeholder="输入艺人名称"
                  />
                  {errors.artist && <div className="error-text">{errors.artist}</div>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>专辑</label>
                  <select
                    value={formData.albumId}
                    onChange={(e) => setFormData({ ...formData, albumId: e.target.value })}
                  >
                    <option value="">选择专辑（可选）</option>
                    {albums.map((album) => (
                      <option key={album.id} value={album.id}>
                        {album.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>时长 * (mm:ss)</label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="例如: 03:45"
                  />
                  {errors.duration && <div className="error-text">{errors.duration}</div>}
                </div>
              </div>

              <div className="form-group">
                <label>歌词</label>
                <textarea
                  value={formData.lyrics}
                  onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                  placeholder="输入歌词（支持换行）"
                  rows={4}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>封面图片 (PNG/JPG, 最大2MB)</label>
                  <div className="upload-area">
                    {coverPreview ? (
                      <div className="cover-preview">
                        <img src={coverPreview} alt="封面预览" />
                        <button
                          type="button"
                          className="remove-cover"
                          onClick={() => {
                            setCoverPreview('');
                            setCoverFile(null);
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="upload-label">
                        <Upload size={24} />
                        <span>点击上传封面</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={handleCoverChange}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>音频文件 (MP3, 最大10MB)</label>
                  <div className="upload-area">
                    <label className="upload-label">
                      <Upload size={24} />
                      <span>
                        {audioFile
                          ? `已选择: ${audioFile.name}`
                          : '点击上传音频'}
                      </span>
                      <input
                        type="file"
                        accept="audio/mpeg"
                        onChange={handleAudioChange}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  取消
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? '保存中...' : editingTrack ? '保存修改' : '添加曲目'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .admin-tracks {
          padding-bottom: 24px;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .page-header .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .search-bar {
          position: relative;
          margin-bottom: 24px;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
        }

        .search-input {
          padding-left: 44px;
        }

        .track-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .track-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: var(--bg-secondary);
          border-radius: 12px;
          transition: background 0.2s ease;
        }

        .track-item:hover {
          background: var(--bg-tertiary);
        }

        .track-cover {
          width: 64px;
          height: 64px;
          border-radius: 8px;
          object-fit: cover;
          flex-shrink: 0;
        }

        .track-info {
          flex: 1;
          min-width: 0;
        }

        .track-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .track-meta {
          font-size: 14px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .separator {
          opacity: 0.5;
        }

        .album-badge {
          background: var(--bg-tertiary);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
        }

        .track-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .action-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          color: var(--text-secondary);
          transition: all 0.2s ease;
        }

        .action-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .action-btn.danger:hover {
          color: var(--error-color);
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-secondary);
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal {
          background: var(--bg-secondary);
          border-radius: 16px;
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          border-bottom: 1px solid var(--border-color);
        }

        .modal-header h2 {
          font-size: 20px;
          font-weight: 600;
        }

        .close-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          color: var(--text-secondary);
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .modal-form {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .upload-area {
          min-height: 120px;
        }

        .upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          height: 120px;
          border: 2px dashed var(--border-color);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: var(--text-secondary);
        }

        .upload-label:hover {
          border-color: var(--accent-start);
          color: var(--accent-start);
        }

        .cover-preview {
          position: relative;
          width: 120px;
          height: 120px;
        }

        .cover-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 8px;
        }

        .remove-cover {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          background: var(--error-color);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 20px;
          border-top: 1px solid var(--border-color);
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .track-item {
            flex-wrap: wrap;
          }

          .track-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminTracks;
