import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Artist, Track } from '../types';
import { useAppContext } from '../context/AppContext';
import { getLatestReleaseDate, formatDate } from '../utils/helpers';

interface Props {
  artist: Artist;
  isNew?: boolean;
  fromPoint?: { x: number; y: number } | null;
  onAnimDone?: () => void;
}

const ArtistCard: React.FC<Props> = ({ artist, isNew, fromPoint, onAnimDone }) => {
  const navigate = useNavigate();
  const { tracks, styleColors } = useAppContext();
  const cardRef = useRef<HTMLDivElement>(null);
  const [animStyle, setAnimStyle] = useState<React.CSSProperties | null>(null);

  const artistTracks = tracks.filter(t => t.artistId === artist.id);
  const latest = getLatestReleaseDate(artistTracks);

  const colorForTag = (tag: string) => styleColors[tag] || '#6c63ff';

  useEffect(() => {
    if (!isNew || !fromPoint || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;
    const dx = fromPoint.x - targetX;
    const dy = fromPoint.y - targetY;

    setAnimStyle({
      transform: `translate(${dx}px, ${dy}px) scale(0.9)`,
      opacity: 0,
      animation: 'none',
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimStyle({
          transform: 'translate(0, 0) scale(1)',
          opacity: 1,
          transition: 'transform 0.3s cubic-bezier(0.68, -0.6, 0.32, 1.6), opacity 0.3s ease-out',
          animation: 'none',
        });
        setTimeout(() => {
          onAnimDone?.();
        }, 320);
      });
    });
  }, [isNew, fromPoint, onAnimDone]);

  return (
    <div
      ref={cardRef}
      className="artist-card"
      onClick={() => navigate(`/artists/${artist.id}`)}
      style={animStyle ?? (isNew ? undefined : { animation: 'none' })}
    >
      {artist.styleTags.length > 0 && (
        <div className="artist-card-tags">
          {artist.styleTags.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="artist-tag"
              style={{ background: colorForTag(tag) }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="artist-card-avatar">
        {artist.avatarUrl ? (
          <img
            src={artist.avatarUrl}
            alt={artist.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          artist.name.charAt(0)
        )}
      </div>
      <div className="artist-card-body">
        <div className="artist-card-name">{artist.name}</div>
        <div className="artist-card-footer">
          {latest ? (
            <span className="latest-release">{formatDate(latest)}</span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>暂无作品</span>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {artistTracks.length} 首
          </span>
        </div>
      </div>
    </div>
  );
};

export default ArtistCard;
