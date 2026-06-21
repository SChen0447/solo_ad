import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, Song } from '../api';

type Genre = '全部' | '流行' | '摇滚' | '古典';

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <span className="star-rating">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= full ? 'star filled' : i === full + 1 && hasHalf ? 'star half' : 'star empty'}>
          {i <= full ? '★' : i === full + 1 && hasHalf ? '★' : '☆'}
        </span>
      ))}
      <span className="rating-num">{rating.toFixed(1)}</span>
    </span>
  );
}

function SongCard({ song }: { song: Song }) {
  return (
    <Link to={`/songs/${song.id}`} className="song-card">
      <div className="song-cover" style={{ background: song.coverColor }}>
        <span className="cover-icon">🎵</span>
      </div>
      <div className="song-card-info">
        <h3 className="song-card-title">{song.title}</h3>
        <p className="song-card-artist">{song.artist}</p>
        <StarRating rating={song.averageRating} />
      </div>
    </Link>
  );
}

export default function SongList() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [genre, setGenre] = useState<Genre>('全部');
  const [sortByRating, setSortByRating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSongs().then(data => {
      setSongs(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const genres: Genre[] = ['全部', '流行', '摇滚', '古典'];

  let filtered = genre === '全部' ? songs : songs.filter(s => s.genre === genre);
  if (sortByRating) {
    filtered = [...filtered].sort((a, b) => b.averageRating - a.averageRating);
  }

  if (loading) {
    return <div className="loading-text">加载中...</div>;
  }

  return (
    <div className="song-list-page">
      <div className="page-header">
        <h1>歌曲库</h1>
        <div className="filter-bar">
          <div className="genre-filters">
            {genres.map(g => (
              <button
                key={g}
                className={`genre-btn ${genre === g ? 'active' : ''}`}
                onClick={() => setGenre(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <button
            className={`sort-btn ${sortByRating ? 'active' : ''}`}
            onClick={() => setSortByRating(!sortByRating)}
          >
            {sortByRating ? '⭐ 按评分排序' : '按评分排序'}
          </button>
        </div>
      </div>
      <div className="song-grid">
        {filtered.map(song => (
          <SongCard key={song.id} song={song} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="empty-state">暂无符合条件的歌曲</div>
      )}
    </div>
  );
}
