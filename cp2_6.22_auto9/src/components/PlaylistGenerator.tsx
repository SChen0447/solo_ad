import { useState, useRef, useCallback } from 'react';
import { generatePlaylist, type Episode, type Podcast } from '@/api/api';
import './PlaylistGenerator.css';

interface PlaylistGeneratorProps {
  onPlayEpisode?: (episode: Episode) => void;
}

export default function PlaylistGenerator({ onPlayEpisode }: PlaylistGeneratorProps) {
  const [duration, setDuration] = useState(30);
  const [playlist, setPlaylist] = useState<Episode[]>([]);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragStartY = useRef(0);
  const dragItemRef = useRef<HTMLDivElement | null>(null);

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const result = await generatePlaylist(duration, false);
      setPlaylist(result.playlist);
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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (index !== draggedIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newPlaylist = [...playlist];
    const [draggedItem] = newPlaylist.splice(draggedIndex, 1);
    newPlaylist.splice(dropIndex, 0, draggedItem);
    setPlaylist(newPlaylist);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const emptyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15V6"/>
    <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
    <path d="M12 12H3"/>
    <path d="M16 6H3"/>
    <path d="M12 18H3"/>
  </svg>`;

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
        {playlist.length > 0 && (
          <div className="playlist-summary">
            共 <span>{playlist.length}</span> 期节目，总时长 <span>{formatDuration(totalDuration)}</span>
          </div>
        )}
      </div>

      <div className="playlist-content">
        {playlist.length === 0 ? (
          <div className="empty-playlist">
            <div dangerouslySetInnerHTML={{ __html: emptyIcon }} />
            <p>还没有生成播放列表</p>
            <p>设置时长并点击"生成播放列表"按钮</p>
          </div>
        ) : (
          <>
            <p className="drag-hint">💡 拖拽卡片调整播放顺序</p>
            <div className="playlist-cards">
              {playlist.map((episode, index) => (
                <div
                  key={episode.id}
                  className={`playlist-card ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  style={{
                    transition: draggedIndex !== null ? 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'all 0.2s ease',
                  }}
                >
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
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
