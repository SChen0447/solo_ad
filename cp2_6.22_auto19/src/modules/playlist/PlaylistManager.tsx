import React, { useState, useEffect, useRef } from 'react';
import { Song, playlistApi } from '@/api/apiClient';
import './PlaylistManager.css';

const PlaylistManager: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSong, setNewSong] = useState({ name: '', artist: '', duration: '', note: '' });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const dragItemRef = useRef<number | null>(null);

  useEffect(() => {
    loadPlaylist();
  }, []);

  const loadPlaylist = async () => {
    setLoading(true);
    try {
      const data = await playlistApi.getPlaylist();
      setSongs(data);
    } catch (error) {
      console.error('加载曲目列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSong.name || !newSong.artist || !newSong.duration) return;

    try {
      const added = await playlistApi.addSong({
        name: newSong.name,
        artist: newSong.artist,
        duration: Number(newSong.duration),
        note: newSong.note,
      });
      setSongs([...songs, added]);
      setNewSong({ name: '', artist: '', duration: '', note: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('添加曲目失败:', error);
    }
  };

  const handleDeleteSong = async (id: string) => {
    setDeletingId(id);
    setTimeout(async () => {
      try {
        await playlistApi.deleteSong(id);
        setSongs(songs.filter((s) => s.id !== id));
      } catch (error) {
        console.error('删除曲目失败:', error);
      } finally {
        setDeletingId(null);
      }
    }, 300);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    dragItemRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = dragItemRef.current;
    if (dragIndex === null || dragIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newSongs = [...songs];
    const [draggedItem] = newSongs.splice(dragIndex, 1);
    newSongs.splice(dropIndex, 0, draggedItem);

    setSongs(newSongs);
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragItemRef.current = null;

    try {
      await playlistApi.reorderSongs(newSongs);
    } catch (error) {
      console.error('排序保存失败:', error);
      loadPlaylist();
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragItemRef.current = null;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="playlist-manager">
      <div className="playlist-header">
        <h2>曲目编排</h2>
        <button className="btn-primary" onClick={() => setShowAddForm(true)}>
          + 添加曲目
        </button>
      </div>

      {showAddForm && (
        <div className="add-form">
          <h3>添加新曲目</h3>
          <form onSubmit={handleAddSong}>
            <div className="form-row">
              <input
                type="text"
                placeholder="曲名"
                value={newSong.name}
                onChange={(e) => setNewSong({ ...newSong, name: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="艺人"
                value={newSong.artist}
                onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })}
                required
              />
            </div>
            <div className="form-row">
              <input
                type="number"
                placeholder="时长（秒）"
                value={newSong.duration}
                onChange={(e) => setNewSong({ ...newSong, duration: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="备注（选填）"
                value={newSong.note}
                onChange={(e) => setNewSong({ ...newSong, note: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
                取消
              </button>
              <button type="submit" className="btn-primary">
                确认添加
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="song-list">
        {songs.length === 0 ? (
          <div className="empty-state">暂无曲目，点击上方按钮添加</div>
        ) : (
          songs.map((song, index) => (
            <div
              key={song.id}
              className={`song-item ${draggedIndex === index ? 'dragging' : ''} ${
                dragOverIndex === index && draggedIndex !== index ? 'drag-over' : ''
              } ${deletingId === song.id ? 'deleting' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className="song-index">{index + 1}</div>
              <div className="song-info">
                <div className="song-name">{song.name}</div>
                <div className="song-artist">{song.artist}</div>
                {song.note && <div className="song-note">{song.note}</div>}
              </div>
              <div className="song-actions">
                <span className="song-duration">{formatDuration(song.duration)}</span>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteSong(song.id)}
                  aria-label="删除"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PlaylistManager;
