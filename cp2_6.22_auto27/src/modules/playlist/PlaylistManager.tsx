/**
 * PlaylistManager - 曲目管理模块
 *
 * 职责：展示已排曲目列表，支持拖拽排序、添加新曲目、删除曲目
 *
 * 调用链路 & 数据流向：
 *   用户交互 (拖拽/添加/删除)
 *     → 调用本模块的事件处理函数
 *       → 调用 apiClient.playlist.* 方法 (apiClient.ts)
 *         → 向后端 Express 服务器发起 HTTP 请求 (server/index.ts)
 *           → 后端更新内存数据并返回最新列表
 *             → apiClient 返回 Promise<json>
 *               → 本组件调用 onTracksChange 更新父组件状态
 *                 → React 重新渲染 UI
 *
 * 拖拽排序数据流：
 *   拖拽开始 → 记录 dragIndex
 *     → 拖拽经过其他项 → 实时计算新位置 → 本地预排序渲染
 *       → 松开释放 → handleDrop 调用 apiClient.playlist.reorder
 *         → 后端持久化排序 → 返回最新列表 → 更新 state
 *
 * 被调用方：App.tsx (通过 props 传入 tracks 和 onTracksChange)
 * 调用方依赖：apiClient.playlist.{getAll, add, remove, reorder}
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  const [isReordering, setIsReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const getDisplayTracks = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const reordered = [...tracks];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(dragOverIndex, 0, moved);
      return reordered;
    }
    return tracks;
  }, [tracks, dragIndex, dragOverIndex]);

  const displayTracks = getDisplayTracks();

  const handleAdd = useCallback(async () => {
    if (!formData.name.trim() || !formData.artist.trim() || !formData.duration.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const updated = await apiClient.playlist.add(formData);
      onTracksChange(updated);
      setFormData({ name: '', artist: '', duration: '', note: '' });
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '添加失败');
    } finally {
      setAdding(false);
    }
  }, [formData, onTracksChange]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    await new Promise((r) => setTimeout(r, 300));
    try {
      const updated = await apiClient.playlist.remove(id);
      onTracksChange(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    } finally {
      setDeletingId(null);
    }
  }, [onTracksChange]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    setDragOverIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    const target = e.currentTarget as HTMLElement;
    requestAnimationFrame(() => {
      target.style.opacity = '0.4';
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index);
    }
  }, [dragIndex]);

  const handleDragLeave = useCallback(() => {
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '';
    if (dragIndex === null || dragIndex === dropIndex || isReordering) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newTracks = [...tracks];
    const [moved] = newTracks.splice(dragIndex, 1);
    newTracks.splice(dropIndex, 0, moved);
    const orderedIds = newTracks.map((t) => t.id);
    setIsReordering(true);
    setError(null);
    try {
      const updated = await apiClient.playlist.reorder(orderedIds);
      onTracksChange(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : '排序失败');
    } finally {
      setIsReordering(false);
      setDragIndex(null);
      setDragOverIndex(null);
    }
  }, [dragIndex, tracks, isReordering, onTracksChange]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '';
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  return (
    <div className="playlist-manager">
      <div className="playlist-header">
        <h2 style={{ color: '#C084FC', fontSize: '24px', fontWeight: 700, margin: 0 }}>
          🎵 曲目编排
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="track-count-hint">{tracks.length} 首曲目</span>
          <button
            className="btn-primary ripple"
            onClick={() => setShowForm(!showForm)}
            disabled={adding}
          >
            {showForm ? '取消' : '+ 添加曲目'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-toast">
          ⚠️ {error}
        </div>
      )}

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
          <button className="btn-primary ripple" onClick={handleAdd} disabled={adding}>
            {adding ? '添加中...' : '确认添加'}
          </button>
        </div>
      )}

      {isReordering && (
        <div className="reorder-hint">
          ⏳ 正在同步排序到服务器...
        </div>
      )}

      {dragIndex !== null && (
        <div className="drag-hint">
          ↕ 拖拽中 — 松开鼠标完成排序
        </div>
      )}

      <div className="playlist-list" ref={listRef}>
        {displayTracks.map((track, displayIndex) => {
          const isDeleting = deletingId === track.id;
          const isDragging = dragIndex !== null && displayIndex === dragOverIndex && displayIndex !== dragIndex;
          const isDragSource = dragIndex !== null && displayIndex === dragIndex;
          const isDropTarget = dragOverIndex === displayIndex && dragIndex !== null && dragIndex !== displayIndex;
          return (
            <div
              key={track.id}
              className={`playlist-item ${isDeleting ? 'deleting' : ''} ${isDragSource ? 'drag-source' : ''} ${isDropTarget ? 'drop-target' : ''} ${isReordering ? 'reordering' : ''}`}
              style={{
                transform: isDeleting ? 'translateX(-100%)' : undefined,
              }}
              draggable={!isReordering && !deletingId}
              onDragStart={(e) => handleDragStart(e, displayIndex)}
              onDragOver={(e) => handleDragOver(e, displayIndex)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, displayIndex)}
              onDragEnd={handleDragEnd}
            >
              <div className="drag-handle" title="拖拽排序">
                <span className="drag-handle-icon">⠿</span>
              </div>
              <span className="track-index">{displayIndex + 1}</span>
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
                  disabled={deletingId === track.id}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
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
        .track-count-hint {
          font-size: 13px;
          color: #9CA3AF;
        }
        .error-toast {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #EF4444;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
          animation: slideDown 0.3s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .reorder-hint {
          color: #6366F1;
          font-size: 13px;
          margin-bottom: 12px;
          text-align: center;
          padding: 8px;
          background: rgba(99, 102, 241, 0.1);
          border-radius: 6px;
        }
        .drag-hint {
          color: #C084FC;
          font-size: 13px;
          margin-bottom: 8px;
          text-align: center;
          padding: 6px;
          background: rgba(192, 132, 252, 0.08);
          border-radius: 6px;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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
        @media (max-width: 768px) {
          .form-row {
            flex-direction: column;
          }
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
          padding: 0 16px 0 0;
          cursor: grab;
          transition: transform 0.25s cubic-bezier(0.2, 0, 0, 1),
                      opacity 0.15s,
                      box-shadow 0.2s,
                      border-color 0.2s,
                      background 0.2s;
          user-select: none;
          position: relative;
        }
        .playlist-item.reordering {
          cursor: not-allowed;
        }
        .playlist-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        }
        .playlist-item.reordering:hover {
          transform: none;
          box-shadow: none;
        }
        .playlist-item.drag-source {
          opacity: 0.4;
          border-style: dashed;
          border-color: rgba(99, 102, 241, 0.4);
        }
        .playlist-item.drop-target {
          border-color: #6366F1;
          background: rgba(99, 102, 241, 0.08);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25), 0 4px 16px rgba(99,102,241,0.15);
        }
        .playlist-item.drop-target::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: #6366F1;
          border-radius: 10px 0 0 10px;
        }
        .playlist-item.deleting {
          transition: transform 0.3s ease-out, opacity 0.3s ease-out;
          transform: translateX(-100%);
          opacity: 0;
        }
        .drag-handle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 56px;
          flex-shrink: 0;
          cursor: grab;
          opacity: 0.4;
          transition: opacity 0.2s, color 0.2s;
        }
        .playlist-item:hover .drag-handle {
          opacity: 0.7;
        }
        .playlist-item.drop-target .drag-handle {
          color: #6366F1;
          opacity: 1;
        }
        .drag-handle-icon {
          font-size: 18px;
          line-height: 1;
          color: inherit;
          letter-spacing: -1px;
        }
        .track-index {
          font-size: 16px;
          color: #6B7280;
          min-width: 28px;
          font-weight: 600;
          text-align: center;
        }
        .track-info {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          overflow: hidden;
          padding-left: 8px;
        }
        .track-name {
          font-size: 18px;
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
          padding-left: 8px;
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
        .btn-delete:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
