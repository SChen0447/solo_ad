import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, PlaylistDetail } from '../api';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const loadPlaylist = useCallback(() => {
    if (!id) return;
    api.getPlaylist(id).then(setPlaylist).catch(console.error);
  }, [id]);

  useEffect(() => {
    loadPlaylist();
  }, [loadPlaylist]);

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setOverIdx(idx);
  };

  const handleDragEnd = () => {
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx && playlist) {
      const newSongs = [...playlist.songs];
      const [moved] = newSongs.splice(dragIdx, 1);
      newSongs.splice(overIdx, 0, moved);
      const newSongIds = newSongs.map(s => s.id);
      setPlaylist({ ...playlist, songs: newSongs });
      api.reorderPlaylist(playlist.id, newSongIds).catch(console.error);
    }
    setDragIdx(null);
    setOverIdx(null);
  };

  if (!playlist) {
    return <div className="loading-text">加载中...</div>;
  }

  return (
    <div className="playlist-detail-page">
      <Link to="/playlists" className="back-link">← 返回歌单列表</Link>
      <div className="playlist-detail-header">
        <div className="playlist-detail-cover" style={{ background: playlist.coverColor }}>
          <span className="cover-icon-large">🎶</span>
        </div>
        <div className="playlist-detail-info">
          <h1>{playlist.name}</h1>
          {playlist.description && <p className="playlist-desc">{playlist.description}</p>}
          <p className="detail-meta">歌曲数: <span className="detail-value">{playlist.songs.length}</span></p>
          <p className="detail-meta">总时长: <span className="detail-value">{formatDuration(playlist.totalDuration || 0)}</span></p>
          <p className="detail-meta">
            平均评分:
            <span className="star-rating">
              {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className={i <= Math.round(playlist.averageRating) ? 'star filled' : 'star empty'}>
                  {i <= Math.round(playlist.averageRating) ? '★' : '☆'}
                </span>
              ))}
              <span className="rating-num">{playlist.averageRating.toFixed(1)}</span>
            </span>
          </p>
        </div>
      </div>

      <h2>歌曲列表 <span className="drag-hint">（拖拽调整顺序）</span></h2>
      <div className="playlist-songs" ref={listRef}>
        {playlist.songs.map((song, idx) => (
          <div
            key={song.id}
            className={`playlist-song-item ${dragIdx === idx ? 'dragging' : ''} ${overIdx === idx ? 'drag-over' : ''}`}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
          >
            <span className="drag-handle">⠿</span>
            <span className="song-index">{idx + 1}</span>
            <Link to={`/songs/${song.id}`} className="song-link">
              <span className="song-title">{song.title}</span>
              <span className="song-artist">{song.artist}</span>
            </Link>
            <span className="song-duration">{formatTime(song.duration)}</span>
            <span className="star-rating small">
              {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className={i <= Math.round(song.averageRating) ? 'star filled' : 'star empty'}>
                  {i <= Math.round(song.averageRating) ? '★' : '☆'}
                </span>
              ))}
            </span>
          </div>
        ))}
        {playlist.songs.length === 0 && <div className="empty-state">歌单中暂无歌曲</div>}
      </div>
    </div>
  );
}
