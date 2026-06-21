import { useState, useEffect, useCallback } from 'react';
import PodcastList from './components/PodcastList';
import PlaylistGenerator from './components/PlaylistGenerator';
import Player from './components/Player';
import type { Podcast, Episode, ListeningProgress } from './types';
import { api, loadProgressFromLocal } from './api/api';

export default function App() {
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [playingEpisode, setPlayingEpisode] = useState<Episode | null>(null);
  const [progressMap, setProgressMap] = useState<Map<string, ListeningProgress>>(new Map());

  useEffect(() => {
    const saved = loadProgressFromLocal();
    const map = new Map<string, ListeningProgress>();
    saved.forEach((p) => map.set(p.episodeId, p));
    setProgressMap(map);
  }, []);

  const handleSelectPodcast = useCallback(async (podcast: Podcast) => {
    setSelectedPodcast(podcast);
    try {
      const eps = await api.getEpisodes(podcast.id);
      setEpisodes(eps);
    } catch (err) {
      console.error('Failed to load episodes:', err);
      setEpisodes([]);
    }
  }, []);

  const handlePlayEpisode = useCallback((episode: Episode) => {
    setPlayingEpisode(episode);
  }, []);

  const handleProgressUpdate = useCallback(
    (episodeId: string, position: number, status: ListeningProgress['status']) => {
      setProgressMap((prev) => {
        const next = new Map(prev);
        next.set(episodeId, {
          episodeId,
          position,
          status,
          updatedAt: new Date().toISOString()
        });
        return next;
      });
    },
    []
  );

  return (
    <div style={appStyle}>
      <header style={headerStyle}>
        <h1 style={headerTitleStyle}>🎧 播客收藏管理器</h1>
        <div style={headerSubtitleStyle}>管理订阅 · 智能播放列表 · 进度同步</div>
      </header>

      <div style={mainLayoutStyle}>
        <aside style={sidebarStyle}>
          <PodcastList
            selectedPodcastId={selectedPodcast?.id ?? null}
            onSelectPodcast={handleSelectPodcast}
          />
        </aside>

        <main style={contentStyle} className="fade-in">
          <div style={contentInnerStyle}>
            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>
                {selectedPodcast ? selectedPodcast.title : '节目详情'}
              </h2>
              {selectedPodcast ? (
                episodes.length > 0 ? (
                  <div style={episodeGridStyle}>
                    {episodes.map((ep, idx) => {
                      const progress = progressMap.get(ep.id);
                      return (
                        <EpisodeCard
                          key={ep.id}
                          episode={ep}
                          progress={progress}
                          delay={idx * 0.02}
                          onClick={() => handlePlayEpisode(ep)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState message="暂无节目数据" />
                )
              ) : (
                <EmptyState message="请从左侧选择一个播客查看节目列表" />
              )}
            </section>

            <section style={{ ...sectionStyle, marginTop: 32 }}>
              <PlaylistGenerator
                onPlayEpisode={handlePlayEpisode}
                progressMap={progressMap}
              />
            </section>
          </div>
        </main>
      </div>

      {playingEpisode && (
        <Player
          episode={playingEpisode}
          onClose={() => setPlayingEpisode(null)}
          onProgressUpdate={handleProgressUpdate}
          initialProgress={progressMap.get(playingEpisode.id)}
        />
      )}
    </div>
  );
}

function EpisodeCard({
  episode,
  progress,
  delay,
  onClick
}: {
  episode: Episode;
  progress?: ListeningProgress;
  delay: number;
  onClick: () => void;
}) {
  const progressPercent = progress
    ? progress.status === 'completed'
      ? 100
      : Math.min(100, (progress.position / episode.duration) * 100)
    : 0;

  const isCompleted = progress?.status === 'completed';

  return (
    <div
      style={{
        ...episodeCardStyle,
        animation: `fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) ${delay}s both`
      }}
      onClick={onClick}
    >
      <div style={episodeCardHeaderStyle}>
        <img src={episode.coverUrl} alt="" style={episodeCoverStyle} />
        <div style={episodeMetaStyle}>
          <div style={episodeTitleStyle}>{episode.title}</div>
          <div style={episodeSubStyle}>
            <span>{formatDuration(episode.duration)}</span>
            <span style={starStyle}>
              {'★'.repeat(Math.round(episode.rating))}
              <span style={starEmptyStyle}>
                {'★'.repeat(5 - Math.round(episode.rating))}
              </span>
              {episode.rating.toFixed(1)}
            </span>
            <span>{new Date(episode.publishDate).toLocaleDateString('zh-CN')}</span>
          </div>
        </div>
      </div>
      <div style={episodeSummaryStyle}>{episode.summary}</div>
      <div style={progressContainerStyle}>
        <div style={progressTrackStyle}>
          <div
            style={{
              ...progressFillStyle,
              width: `${progressPercent}%`,
              backgroundColor: isCompleted ? 'var(--success)' : 'var(--progress-filled)',
              backgroundImage: isCompleted
                ? 'none'
                : undefined
            }}
          />
          {!isCompleted && (
            <div
              style={{
                ...progressEmptyFillStyle,
                width: `${100 - progressPercent}%`,
                left: `${progressPercent}%`
              }}
            />
          )}
        </div>
        {isCompleted && <CheckIcon />}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={emptyStateStyle}>
      <svg
        width="80"
        height="80"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#71717A"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      <p style={emptyTextStyle}>{message}</p>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--success)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ marginLeft: 8, flexShrink: 0 }}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const appStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  minHeight: '100vh',
  backgroundColor: 'var(--bg-primary)'
};

const headerStyle: React.CSSProperties = {
  padding: '20px 32px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, transparent 60%)'
};

const headerTitleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: 'var(--text-primary)',
  letterSpacing: 0.5
};

const headerSubtitleStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  color: 'var(--text-secondary)'
};

const mainLayoutStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  minHeight: 0
};

const sidebarStyle: React.CSSProperties = {
  width: 320,
  flexShrink: 0,
  borderRight: '1px solid rgba(255,255,255,0.06)',
  backgroundColor: 'rgba(0,0,0,0.15)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflowY: 'auto',
  padding: '28px 32px 120px'
};

const contentInnerStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto'
};

const sectionStyle: React.CSSProperties = {};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: 'var(--text-primary)',
  marginBottom: 18
};

const episodeGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: 16
};

const episodeCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  borderRadius: 14,
  padding: 16,
  cursor: 'pointer',
  transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
  border: '2px solid transparent',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  willChange: 'transform'
};

const episodeCardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12
};

const episodeCoverStyle: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 10,
  flexShrink: 0,
  objectFit: 'cover'
};

const episodeMetaStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minWidth: 0,
  flex: 1
};

const episodeTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text-primary)',
  lineHeight: 1.4,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
};

const episodeSubStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  fontSize: 11,
  color: 'var(--text-secondary)',
  alignItems: 'center'
};

const starStyle: React.CSSProperties = {
  color: '#F59E0B',
  fontSize: 10,
  letterSpacing: 1
};

const starEmptyStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.15)'
};

const episodeSummaryStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'rgba(228,228,231,0.65)',
  lineHeight: 1.55,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
};

const progressContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center'
};

const progressTrackStyle: React.CSSProperties = {
  position: 'relative',
  flex: 1,
  height: 4,
  borderRadius: 2,
  overflow: 'hidden'
};

const progressFillStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  height: '100%',
  borderRadius: 2,
  transition: 'width 0.3s'
};

const progressEmptyFillStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  height: '100%',
  backgroundImage:
    'repeating-linear-gradient(90deg, var(--progress-empty) 0, var(--progress-empty) 4px, transparent 4px, transparent 8px)',
  borderRadius: 2
};

const emptyStateStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '64px 24px',
  gap: 16
};

const emptyTextStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 14
};

(function applyHoverStyles() {
  const style = document.createElement('style');
  style.textContent = `
    [data-episode-card]:hover {
      transform: translateY(-2px);
      border-color: var(--accent) !important;
      box-shadow: var(--shadow-hover);
    }
  `;
  document.head.appendChild(style);
  const observer = new MutationObserver(() => {
    document.querySelectorAll('[style*="episodeCardStyle"]').forEach((el) => {
      (el as HTMLElement).setAttribute('data-episode-card', 'true');
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
