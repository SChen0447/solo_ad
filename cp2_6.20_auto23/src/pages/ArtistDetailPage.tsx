import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Track } from '../types';
import { formatDuration, formatDateCN, getArtistColor } from '../utils/helpers';
import ForceGraph from '../components/ForceGraph';
import ReleaseTimeline from '../components/ReleaseTimeline';
import { DetailHeaderSkeleton } from '../components/Skeleton';

const ArtistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { artists, tracks, shows, styleColors, loading } = useAppContext();

  const artist = useMemo(() => artists.find(a => a.id === id), [artists, id]);
  const artistTracks = useMemo(() => tracks.filter(t => t.artistId === id), [tracks, id]);
  const artistShows = useMemo(() => shows.filter(s => s.artistId === id), [shows, id]);

  if (loading && artists.length === 0) {
    return <DetailHeaderSkeleton />;
  }

  if (!artist) {
    return (
      <div className="empty-state" style={{ padding: 60 }}>
        <div className="empty-icon" style={{ fontSize: 48 }}>❓</div>
        <div className="empty-text">未找到该艺术家</div>
        <button className="btn btn-primary" onClick={() => navigate('/artists')}>
          返回艺术家列表
        </button>
      </div>
    );
  }

  return (
    <div className="artist-detail-page">
      <div className="detail-header">
        <button className="btn btn-ghost btn-sm back-btn" onClick={() => navigate('/artists')}>
          ← 返回
        </button>
        <div className="detail-header-content">
          <div className="detail-avatar">
            <img src={artist.avatarUrl} alt={artist.name} />
          </div>
          <div className="detail-info">
            <h1 className="detail-name">{artist.name}</h1>
            <div className="detail-tags">
              {artist.styleTags.slice(0, 3).map((tag, i) => (
                <span
                  key={tag}
                  className="style-tag"
                  style={{ backgroundColor: styleColors[tag] || '#6c63ff' }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="detail-bio">{artist.bio}</p>
            <div className="detail-stats">
              <div className="stat-item">
                <div className="stat-value">{artistTracks.length}</div>
                <div className="stat-label">作品</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{artistShows.length}</div>
                <div className="stat-label">演出</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-sections">
        <section className="detail-section">
          <div className="section-header">
            <h2>🎵 作品列表</h2>
            <span className="section-count">{artistTracks.length} 首作品</span>
          </div>
          {artistTracks.length > 0 ? (
            <div className="track-cards-grid">
              {artistTracks.map(track => (
                <TrackCard
                  key={track.id}
                  track={track}
                  artistTags={artist.styleTags}
                  styleColors={styleColors}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 30 }}>
              <div className="empty-text">暂无作品</div>
            </div>
          )}
        </section>

        <section className="detail-section">
          <ReleaseTimeline artistId={artist.id} />
        </section>

        <section className="detail-section">
          <div className="section-header">
            <h2>🔗 风格关联图谱</h2>
            <span className="section-hint">拖拽节点可调整位置</span>
          </div>
          <div className="force-graph-wrapper" style={{ height: 380 }}>
            <ForceGraph
              artist={artist}
              allArtists={artists}
              allTracks={tracks}
              styleColors={styleColors}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

const TrackCard: React.FC<{
  track: Track;
  artistTags: string[];
  styleColors: Record<string, string>;
}> = ({ track, artistTags, styleColors }) => {
  const handlePlay = () => {
    if (track.playLink) {
      window.open(track.playLink, '_blank', 'noopener,noreferrer');
    }
  };

  const displayTags = artistTags.slice(0, 3);
  const extraCount = artistTags.length - 3;

  return (
    <div className="track-card">
      <div className="track-card-accents" />
      <div className="track-card-content">
        <div className="track-card-row">
          <div className="track-card-name">{track.name}</div>
          <div className="track-card-duration">
            {track.duration ? formatDuration(track.duration) : '—'}
          </div>
        </div>
        <div className="track-card-row">
          <div className="track-card-date">
            {formatDateCN(track.releaseDate)} 发行
          </div>
          <button
            className={`play-button ${!track.playLink ? 'disabled' : ''}`}
            onClick={handlePlay}
            disabled={!track.playLink}
            title={track.playLink ? '在新标签页播放' : '暂无播放链接'}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
              <polygon points="8,5 19,12 8,19" />
            </svg>
          </button>
        </div>
        {artistTags.length > 0 && (
          <div className="track-card-tags">
            {displayTags.map(tag => (
              <span
                key={tag}
                className="track-card-tag"
                style={{ backgroundColor: styleColors[tag] || '#6c63ff' }}
              >
                {tag}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="track-card-tag track-card-tag-extra">
                +{extraCount}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistDetailPage;
