import { useState } from 'react';
import { generatePlaylist, type Episode } from '@/api/api';
import './PlaylistGenerator.css';

interface PlaylistGeneratorProps {
  onPlayEpisode?: (episode: Episode) => void;
}

export default function PlaylistGenerator({ onPlayEpisode }: PlaylistGeneratorProps) {
  const [duration, setDuration] = useState(30);
  const [playlist, setPlaylist] = useState<Episode[]>([]);
  const [candidates, setCandidates] = useState<Episode[]>([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const maxDurationSeconds = duration * 60;
  const remainingDuration = Math.max(0, maxDurationSeconds - totalDuration);
  const usagePercent = maxDurationSeconds > 0 ? Math.min(100, (totalDuration / maxDurationSeconds) * 100) : 0;
  const isOverLimit = totalDuration > maxDurationSeconds;
  const overLimitMinutes = Math.ceil((totalDuration - maxDurationSeconds) / 60);

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const result = await generatePlaylist(duration, false);
      setPlaylist(result.playlist);
      setCandidates(result.candidates || []);
      setTotalDuration(result.totalDuration);
    } catch (err) {
      console.error('Failed to generate playlist:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins < 60) return `${mins}分${secs}秒`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}小时${remainMins}分`;
  };

  const handleAddCandidate = (episode: Episode) => {
    if (isOverLimit) return;
    setCandidates((prev) => prev.filter((ep) => ep.id !== episode.id));
    setPlaylist((prev) => [...prev, episode]);
    setTotalDuration((prev) => prev + episode.duration);
  };

  const handleRemoveFromPlaylist = (index: number) => {
    const removed = playlist[index];
    const newPlaylist = playlist.filter((_, i) => i !== index);
    setPlaylist(newPlaylist);
    setCandidates((prev) => {
      const updated = [...prev, removed];
      updated.sort((a, b) => b.rating - a.rating);
      return updated;
    });
    setTotalDuration((prev) => prev - removed.duration);
  };

  const hasGenerated = playlist.length > 0 || candidates.length > 0;

  const emptyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15V6"/>
    <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
    <path d="M12 12H3"/>
    <path d="M16 6H3"/>
    <path d="M12 18H3"/>
  </svg>`;

  const PlaylistCard = ({
    episode,
    index,
    showRemove = false,
    showAdd = false,
    isInPlaylist = false,
  }: {
    episode: Episode;
    index?: number;
    showRemove?: boolean;
    showAdd?: boolean;
    isInPlaylist?: boolean;
  }) => {
    const isAddDisabled = showAdd && isOverLimit;

    return (
      <div
        className={`playlist-card ${showAdd ? 'candidate-card' : ''}`}
        style={{
          transition: 'all 0.2s ease',
        }}
      >
        {showRemove && (
          <button
            className="card-action-btn remove-btn"
            onClick={() => handleRemoveFromPlaylist(index!)}
            title="从列表移除"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}

        {showAdd && (
          <button
            className={`card-action-btn add-btn ${isAddDisabled ? 'disabled' : ''}`}
            onClick={() => !isAddDisabled && handleAddCandidate(episode)}
            title={isAddDisabled ? '已超时长限制，无法添加' : '添加到播放列表'}
            disabled={isAddDisabled}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        )}

        {isInPlaylist && (
          <div className="card-index-badge">{(index ?? 0) + 1}</div>
        )}

        <img
          src={episode.coverUrl}
          alt={episode.title}
          className="playlist-card-cover"
        />
        <h3 className="playlist-card-title">{episode.title}</h3>
        <div className="playlist-card-meta">
          <span>{formatDuration(episode.duration)}</span>
          <span className="playlist-card-rating">⭐ {episode.rating.toFixed(1)}</span>
        </div>
        {episode.podcastTitle && (
          <p className="playlist-card-podcast">{episode.podcastTitle}</p>
        )}
        <div className="playlist-card-overlay">
          <div
            className="play-btn-icon"
            onClick={(e) => {
              e.stopPropagation();
              onPlayEpisode?.(episode);
            }}
          >
            <svg viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="playlist-generator">
      <div className="playlist-header">
        <h2>智能播放列表</h2>
        <div className="playlist-controls">
          <div className="duration-input-wrapper">
            <label htmlFor="duration">时长限制：</label>
            <input
              id="duration"
              type="number"
              className="duration-input"
              value={duration}
              onChange={(e) => setDuration(Math.max(5, Math.min(300, Number(e.target.value) || 0)))}
              min={5}
              max={300}
            />
            <span className="duration-unit">分钟</span>
          </div>
          <button
            className="generate-btn"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? '生成中...' : '生成播放列表'}
          </button>
        </div>

        {hasGenerated && (
          <div className="playlist-progress-section">
            <div className="playlist-progress-header">
              <div className="progress-stats">
                <span className="progress-item">
                  <span className="progress-label">节目数</span>
                  <span className="progress-value primary">{playlist.length} 期</span>
                </span>
                <span className="progress-item">
                  <span className="progress-label">总时长</span>
                  <span className={`progress-value ${isOverLimit ? 'danger' : 'success'}`}>
                    {formatDuration(totalDuration)}
                  </span>
                </span>
                <span className="progress-item">
                  <span className="progress-label">剩余可用</span>
                  <span className={`progress-value ${isOverLimit ? 'danger' : ''}`}>
                    {isOverLimit ? '超出 ' : ''}
                    {formatDuration(Math.abs(remainingDuration))}
                  </span>
                </span>
                <span className="progress-item">
                  <span className="progress-label">时长限制</span>
                  <span className="progress-value">{formatDuration(maxDurationSeconds)}</span>
                </span>
              </div>
              <div className="progress-right">
                <div className="progress-percent">{usagePercent.toFixed(0)}%</div>
                {isOverLimit && (
                  <div className="over-limit-warning">
                    ⚠️ 已超出限制 {overLimitMinutes} 分钟
                  </div>
                )}
              </div>
            </div>
            <div className="playlist-progress-bar">
              <div
                className={`playlist-progress-fill ${isOverLimit ? 'over-limit' : ''}`}
                style={{ width: `${Math.min(100, usagePercent)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="playlist-content">
        {!hasGenerated ? (
          <div className="empty-playlist">
            <div dangerouslySetInnerHTML={{ __html: emptyIcon }} />
            <p>还没有生成播放列表</p>
            <p>设置时长并点击"生成播放列表"按钮</p>
          </div>
        ) : (
          <div className="two-column-layout">
            <section className="playlist-section">
              <div className="section-header">
                <div className="section-title-row">
                  <span className="section-icon playlist-icon">📋</span>
                  <h3 className="section-title">当前播放列表</h3>
                  <span className="section-count">{playlist.length} 期</span>
                </div>
                <p className="section-hint">点击 × 移除节目，可从候选池重新添加</p>
              </div>
              {playlist.length === 0 ? (
                <div className="section-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  <p>播放列表为空</p>
                  <span>从右侧候选池中添加节目</span>
                </div>
              ) : (
                <div className="playlist-cards">
                  {playlist.map((episode, index) => (
                    <PlaylistCard
                      key={episode.id}
                      episode={episode}
                      index={index}
                      showRemove
                      isInPlaylist
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="candidates-section">
              <div className="section-header">
                <div className="section-title-row">
                  <span className="section-icon candidates-icon">✨</span>
                  <h3 className="section-title">候选节目池</h3>
                  <span className={`section-count ${isOverLimit ? 'disabled' : ''}`}>
                    {candidates.length} 期可用
                  </span>
                </div>
                <p className={`section-hint ${isOverLimit ? 'danger' : ''}`}>
                  {isOverLimit
                    ? '⚠️ 已超时长限制，无法继续添加'
                    : '点击 + 将节目添加到播放列表末尾'}
                </p>
              </div>
              {candidates.length === 0 ? (
                <div className="section-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <p>所有可用节目已添加</p>
                  <span>候选池暂无更多节目</span>
                </div>
              ) : (
                <div className="candidates-grid">
                  {candidates.map((episode) => (
                    <PlaylistCard
                      key={episode.id}
                      episode={episode}
                      showAdd
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
