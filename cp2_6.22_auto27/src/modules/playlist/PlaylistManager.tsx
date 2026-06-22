import React, { useState, useCallback, useRef } from 'react';
import { apiClient, Track } from '@/api/apiClient';

interface PlaylistManagerProps {
  tracks: Track[];
  onTracksChange: (tracks: Track[]) => void;
}

const PlaylistManager: React.FC<PlaylistManagerProps> = ({ tracks, onTracksChange }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', artist: '', duration: '', note: '' });
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const dragItemRef = useRef<HTMLDivElement>(null);

  const handleAdd = useCallback(async () => {
    if (!formData.name.trim() || !formData.artist.trim() || !formData.duration.trim()) return;
    try {
      const updated = await apiClient.playlist.add(formData);
      onTracksChange(updated);
      setFormData({ name: '', artist: '', duration: '', note: '' });
      setShowForm(false);
    } catch (e) {
      console.error(e);
    }
  }, [formData, onTracksChange]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    await new Promise((r) => setTimeout(r, 300));
    try {
      const updated = await apiClient.playlist.remove(id);
      onTracksChange(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  }, [onTracksChange]);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newTracks = [...tracks];
    const [moved] = newTracks.splice(dragIndex, 1);
    newTracks.splice(dropIndex, 0, moved);
    const orderedIds = newTracks.map((t) => t.id);
    try {
      const updated = await apiClient.playlist.reorder(orderedIds);
      onTracksChange(updated);
    } catch (err) {
      console.error(err);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, tracks, onTracksChange]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  return (
    <div className="playlist-manager">
      <div className="playlist-header">
        <h2 style={{ color: '#C084FC', fontSize: '24px', fontWeight: 700, margin: 0 }}>
          🎵 曲目编排
        </h2>
        <button
          className="btn-primary ripple"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '取消' : '+ 添加曲目'}
        </button>
      </div>

      {showForm && (
        <div className="playlist-form">
          <div className="form-row">
            <input
              placeholder="曲名 *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
            />
            <input
              placeholder="艺人 *"
              value={formData.artist}
              onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
              className="form-input"
            />
          </div>
          <div className="form-row">
            <input
              placeholder="时长 * (如 4:32)"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="form-input"
            />
            <input
              placeholder="备注"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="form-input"
            />
          </div>
          <button className="btn-primary ripple" onClick={handleAdd}>
            确认添加
          </button>
        </div>
      )}

      <div className="playlist-list">
        {tracks.map((track, index) => (
          <div
            key={track.id}
            ref={index === dragIndex ? dragItemRef : undefined}
            className={`playlist-item ${deletingId === track.id ? 'deleting' : ''} ${dragIndex === index ? 'dragging' : ''} ${dragOverIndex === index && dragIndex !== index ? 'drag-over' : ''}`}
            style={{
              opacity: dragIndex === index ? 0.6 : 1,
              transform: deletingId === track.id ? 'translateX(-100%)' : undefined,
            }}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            <span className="track-index">{index + 1}</span>
            <div className="track-info">
              <span className="track-name">{track.name}</span>
              <span className="track-artist">{track.artist}</span>
              {track.note && <span className="track-note">{track.note}</span>}
            </div>
            <div className="track-actions">
              <span className="track-duration">{track.duration}</span>
              <button
                className="btn-delete ripple"
                onClick={() => handleDelete(track.id)}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        {tracks.length === 0 && (
          <div className="empty-state">
            还没有曲目，点击上方按钮添加
          </div>
        )}
      </div>

      <style>{`
        .playlist-manager {
          width: 100%;
        }
        .playlist-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .playlist-form {
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .form-row {
          display: flex;
          gap: 12px;
        }
        .form-input {
          flex: 1;
          background: rgba(30, 27, 75, 0.6);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 8px;
          padding: 10px 14px;
          color: #E5E7EB;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-input:focus {
          border-color: #6366F1;
        }
        .form-input::placeholder {
          color: #6B7280;
        }
        .playlist-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .playlist-item {
          display: flex;
          align-items: center;
          height: 56px;
          background: rgba(30, 27, 75, 0.5);
          border: 1px solid rgba(99, 102, 241, 0.15);
          border-radius: 10px;
          padding: 0 16px;
          cursor: grab;
          transition: transform 0.3s ease, opacity 0.15s, box-shadow 0.2s, margin 0.2s;
          user-select: none;
        }
        .playlist-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }
        .playlist-item.dragging {
          cursor: grabbing;
          transform: scale(1.02);
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
        }
        .playlist-item.drag-over {
          border-top: 2px solid #6366F1;
        }
        .playlist-item.deleting {
          transition: transform 0.3s ease-out;
          transform: translateX(-100%);
          opacity: 0;
        }
        .track-index {
          font-size: 16px;
          color: #6B7280;
          min-width: 32px;
          font-weight: 600;
        }
        .track-info {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          overflow: hidden;
        }
        .track-name {
          font-size: 18px;
          color: #1F2937;
          color: #E5E7EB;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .track-artist {
          font-size: 14px;
          color: #9CA3AF;
          white-space: nowrap;
        }
        .track-note {
          font-size: 12px;
          color: #6366F1;
          background: rgba(99, 102, 241, 0.15);
          padding: 2px 8px;
          border-radius: 4px;
          white-space: nowrap;
        }
        .track-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .track-duration {
          font-size: 14px;
          color: #9CA3AF;
          font-variant-numeric: tabular-nums;
        }
        .btn-delete {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: none;
          background: rgba(239, 68, 68, 0.15);
          color: #EF4444;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: background 0.2s;
        }
        .btn-delete:hover {
          background: rgba(239, 68, 68, 0.3);
        }
        .empty-state {
          text-align: center;
          padding: 40px;
          color: #6B7280;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
};

export default PlaylistManager;
