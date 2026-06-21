import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, Playlist } from '../api';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export default function PlaylistList() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPlaylists().then(data => {
      setPlaylists(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="loading-text">加载中...</div>;
  }

  return (
    <div className="playlist-list-page">
      <div className="page-header">
        <h1>我的歌单</h1>
        <Link to="/playlists/new" className="create-playlist-link">+ 创建歌单</Link>
      </div>
      <div className="playlist-grid">
        {playlists.map(pl => (
          <Link to={`/playlists/${pl.id}`} key={pl.id} className="playlist-card">
            <div className="playlist-cover" style={{ background: pl.coverColor }}>
              <span className="cover-icon">🎶</span>
            </div>
            <div className="playlist-card-info">
              <h3>{pl.name}</h3>
              <p className="playlist-meta">{pl.songCount || 0} 首歌曲</p>
              <p className="playlist-meta">{formatDuration(pl.totalDuration || 0)}</p>
            </div>
          </Link>
        ))}
      </div>
      {playlists.length === 0 && (
        <div className="empty-state">
          还没有歌单，<Link to="/playlists/new">创建一个吧</Link>！
        </div>
      )}
    </div>
  );
}
