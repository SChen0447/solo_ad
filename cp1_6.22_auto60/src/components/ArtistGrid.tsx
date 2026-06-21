import { Artist, STYLE_COLORS } from '../types';

interface ArtistGridProps {
  artists: Artist[];
  loading: boolean;
  onArtistClick: (id: number) => void;
}

function ArtistGrid({ artists, loading, onArtistClick }: ArtistGridProps) {
  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (artists.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🎨</div>
        <p>暂无匹配的手作人</p>
      </div>
    );
  }

  return (
    <div className="artist-grid">
      {artists.map((artist, index) => (
        <div
          key={artist.id}
          className="artist-card"
          onClick={() => onArtistClick(artist.id)}
          style={{ animationDelay: `${index * 0.05}s`}
        >
          <img
            src={artist.works[0]}
            alt={artist.name}
            className="card-image"
            loading={index < 4 ? 'eager' : 'lazy'}
          />
          <div className="card-body">
            <div className="card-header">
              <img
                src={artist.avatar}
                alt={artist.name}
                className="avatar"
              />
              <div className="card-info">
                <div className="card-name">{artist.name}</div>
                <span
                  className="style-tag"
                  style={{ backgroundColor: STYLE_COLORS[artist.style] || '#718096' }}
                >
                  {artist.style}
                </span>
              </div>
            </div>
            <div className="card-materials">
              材料：{artist.materials.slice(0, 3).join('、')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ArtistGrid;
