import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Artist, Track } from '../types';
import { useAppContext } from '../context/AppContext';
import { getLatestReleaseDate, formatDate } from '../utils/helpers';

interface Props {
  artist: Artist;
  isNew?: boolean;
}

const ArtistCard: React.FC<Props> = ({ artist, isNew }) => {
  const navigate = useNavigate();
  const { tracks, styleColors } = useAppContext();

  const artistTracks = tracks.filter(t => t.artistId === artist.id);
  const latest = getLatestReleaseDate(artistTracks);

  const colorForTag = (tag: string) => styleColors[tag] || '#6c63ff';

  return (
    <div
      className="artist-card"
      onClick={() => navigate(`/artists/${artist.id}`)}
      style={isNew ? undefined : { animation: 'none' }}
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
