import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Artist } from '../types';
import '../styles/artist-card.css';

interface ArtistCardProps {
  artist: Artist;
  isNew?: boolean;
}

const styleTagColors = [
  '#6c63ff',
  '#4ade80',
  '#fbbf24',
  '#f472b6',
  '#38bdf8',
  '#fb923c',
  '#a78bfa',
  '#34d399',
  '#f87171',
  '#2dd4bf',
];

const ArtistCard: React.FC<ArtistCardProps> = ({ artist, isNew }) => {
  const navigate = useNavigate();

  const latestWork = artist.works.length > 0
    ? artist.works.reduce((latest, work) =>
        work.releaseDate > latest.releaseDate ? work : latest
      )
    : null;

  const handleClick = () => {
    navigate(`/artists/${artist.id}`);
  };

  return (
    <div
      className={`artist-card ${isNew ? 'card-pop-in' : ''}`}
      onClick={handleClick}
    >
      <div className="card-style-tags">
        {artist.styleTags.slice(0, 3).map((tag, idx) => (
          <span
            key={tag}
            className="style-tag"
            style={{ backgroundColor: styleTagColors[idx % styleTagColors.length] }}
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="card-avatar">
        {artist.avatarUrl ? (
          <img src={artist.avatarUrl} alt={artist.name} />
        ) : (
          <div className="avatar-placeholder">🎤</div>
        )}
      </div>
      <div className="card-name">{artist.name}</div>
      <div className="card-bio">{artist.bio || '暂无简介'}</div>
      <div className="card-footer">
        {latestWork ? (
          <span className="latest-release">
            最新作品: {latestWork.releaseDate}
          </span>
        ) : (
          <span className="no-works">暂无作品</span>
        )}
      </div>
    </div>
  );
};

export default ArtistCard;
