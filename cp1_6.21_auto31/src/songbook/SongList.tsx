import { useState, useEffect } from 'react';
import type { Song } from '../types';
import './SongList.css';

interface SongListProps {
  onSelectSong: (song: Song) => void;
  selectedSongId?: string;
}

export function SongList({ onSelectSong, selectedSongId }: SongListProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      const res = await fetch('/api/songs');
      const data = await res.json();
      setSongs(data);
    } catch (error) {
      console.error('获取曲目列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSongs = songs.filter((song) =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderDifficulty = (level: number) => {
    return (
      <div className="difficulty-stars">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={i <= level ? 'star filled' : 'star'}>★</span>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return <div className="song-list-loading">加载中...</div>;
  }

  return (
    <div className="song-list-container">
      <div className="song-list-header">
        <h2 className="section-title">曲目库</h2>
        <div className="search-box">
          <input
            type="text"
            placeholder="搜索曲目或调式..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="song-grid">
        {filteredSongs.map((song) => (
          <div
            key={song._id}
            className={`song-card ${selectedSongId === song._id ? 'selected' : ''}`}
            onClick={() => onSelectSong(song)}
          >
            <div className="vinyl-decoration">
              <div className="vinyl-disc">
                <div className="vinyl-label">
                  <span className="vinyl-title">{song.title.charAt(0)}</span>
                </div>
                <div className="vinyl-grooves"></div>
              </div>
            </div>
            <div className="song-info">
              <h3 className="song-title">{song.title}</h3>
              <div className="song-meta">
                <span className="song-key">{song.key}</span>
                <span className="song-bpm">{song.bpm} BPM</span>
              </div>
              {renderDifficulty(song.difficulty)}
              <div className="parts-count">
                {song.parts.length} 个分谱
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSongs.length === 0 && (
        <div className="empty-state">没有找到匹配的曲目</div>
      )}
    </div>
  );
}
