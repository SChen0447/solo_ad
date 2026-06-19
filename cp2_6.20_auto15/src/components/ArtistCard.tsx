import React, { useState } from 'react';
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
  const [tagsExpanded, setTagsExpanded] = useState(false);

  const latestWork = artist.works.length > 0
    ? artist.works.reduce((latest, work) =>
        work.releaseDate > latest.releaseDate ? work : latest
      )
    : null;

  const handleCardClick = () => {
    navigate(`/artists/${artist.id}`);
  };

  const handleMoreTagsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTagsExpanded(!tagsExpanded);
  };

  const displayTags = tagsExpanded ? artist.styleTags : artist.styleTags.slice(0, 3);
  const hiddenTagCount = artist.styleTags.length - 3;
  const hasMoreTags = hiddenTagCount > 0;

  return (
    <div
      className={`artist-card ${isNew ? 'card-pop-in' : ''}`}
      onClick={handleCardClick}
    >
      <div className={`card-style-tags ${tagsExpanded ? 'expanded' : ''}`}>
        {displayTags.map((tag, idx) => (
          <span
            key={tag}
            className="style-tag"
            style={{ backgroundColor: styleTagColors[idx % styleTagColors.length] }}
          >
            {tag}
          </span>
        ))}
        {!tagsExpanded && hasMoreTags && (
          <span
            className="more-tags-badge"
            onClick={handleMoreTagsClick}
          >
            +{hiddenTagCount}
          </span>
        )}
        {tagsExpanded && (
          <span
            className="collapse-tags-badge"
            onClick={handleMoreTagsClick}
          >
            收起 ↑
          </span>
        )}
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
          <div className="latest-release" title={`最新作品: ${latestWork.name}`}>
            <span className="calendar-icon">📅</span>
            <span className="release-text">
              {latestWork.releaseDate}
            </span>
          </div>
        ) : (
          <div className="no-works">
            <span className="calendar-icon">📅</span>
            <span className="release-text">暂无作品</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistCard;
