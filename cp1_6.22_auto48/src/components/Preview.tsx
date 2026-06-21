import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { marked } from 'marked';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { useStoryStore } from '@/store';
import { Story, StoryNode } from '@/types';
import { parseShareUrl } from '@/utils/storage';

interface PreviewProps {
  externalStory?: Story;
  onClose?: () => void;
  isShareMode?: boolean;
}

const Preview: React.FC<PreviewProps> = ({ externalStory, onClose, isShareMode }) => {
  const { story: storeStory, setMode } = useStoryStore();

  const story = externalStory || storeStory;
  const sortedNodes = useMemo(
    () => [...story.nodes].sort((a, b) => a.timestamp - b.timestamp),
    [story.nodes]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [imageVisible, setImageVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);

  const timerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentNode: StoryNode | undefined = sortedNodes[currentIndex];
  const progress = sortedNodes.length > 0 ? ((currentIndex + 1) / sortedNodes.length) * 100 : 0;

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const baseDuration = 3000;

  const showNodeContent = useCallback(() => {
    setIsTransitioning(true);
    setContentVisible(false);
    setImageVisible(false);
    setTextVisible(false);

    setTimeout(() => {
      setContentVisible(true);
      setTimeout(() => setImageVisible(true), 200);
      setTimeout(() => setTextVisible(true), 500);
      setTimeout(() => setIsTransitioning(false), 1000);
    }, 100);
  }, []);

  useEffect(() => {
    showNodeContent();
  }, [currentIndex, showNodeContent]);

  useEffect(() => {
    if (isPlaying && !isTransitioning && sortedNodes.length > 0) {
      const duration = baseDuration / playbackSpeed;
      timerRef.current = window.setTimeout(() => {
        if (currentIndex < sortedNodes.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, currentIndex, playbackSpeed, sortedNodes.length, isTransitioning]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0;
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    setIsPlaying(false);
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(sortedNodes.length - 1, prev + 1));
    setIsPlaying(false);
  }, [sortedNodes.length]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const newIndex = Math.floor(percentage * sortedNodes.length);
      setCurrentIndex(Math.max(0, Math.min(sortedNodes.length - 1, newIndex)));
      setIsPlaying(false);
    },
    [sortedNodes.length]
  );

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      setMode('edit');
    }
  }, [onClose, setMode]);

  const isFinished = currentIndex === sortedNodes.length - 1 && !isPlaying;

  if (sortedNodes.length === 0) {
    return (
      <div className="preview-container">
        <div className="preview-empty">
          <h2>暂无节点</h2>
          <p>请先添加时间节点</p>
          <button onClick={handleClose}>返回编辑</button>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-container" ref={containerRef}>
      <div className="preview-header">
        <h1 className="preview-title">{story.title}</h1>
        {!isShareMode && (
          <button className="preview-close-btn" onClick={handleClose}>
            <X size={24} />
          </button>
        )}
      </div>

      <div className="preview-content">
        {currentNode && (
          <div className={`preview-node ${contentVisible ? 'visible' : ''}`}>
            <div className="preview-node__header">
              <div
                className="preview-node__dot"
                style={{ backgroundColor: currentNode.color }}
              />
              <div className="preview-node__meta">
                <div className="preview-node__date">{currentNode.date}</div>
                <h2 className="preview-node__title">{currentNode.title}</h2>
              </div>
            </div>

            {currentNode.imageUrl && (
              <div
                className={`preview-node__image ${imageVisible ? 'visible' : ''}`}
              >
                <img src={currentNode.imageUrl} alt={currentNode.title} />
              </div>
            )}

            {currentNode.content && (
              <div
                className={`preview-node__content ${textVisible ? 'visible' : ''}`}
                dangerouslySetInnerHTML={{
                  __html: marked.parse(currentNode.content) as string,
                }}
              />
            )}
          </div>
        )}

        <div className="preview-timeline">
          {sortedNodes.map((node, index) => (
            <div
              key={node.id}
              className={`preview-timeline__item ${
                index === currentIndex ? 'active' : ''
              } ${index < currentIndex ? 'past' : ''}`}
              onClick={() => {
                setCurrentIndex(index);
                setIsPlaying(false);
              }}
            >
              <div
                className="preview-timeline__dot"
                style={{ backgroundColor: node.color }}
              />
              <div className="preview-timeline__line" />
            </div>
          ))}
        </div>
      </div>

      <div className="preview-controls">
        <div className="preview-progress" onClick={handleProgressClick}>
          <div className="preview-progress__bar" style={{ width: `${progress}%` }} />
          <div
            className="preview-progress__thumb"
            style={{ left: `${progress}%` }}
          />
        </div>

        <div className="preview-controls__buttons">
          <button className="control-btn" onClick={handlePrev} disabled={currentIndex === 0}>
            <SkipBack size={20} />
          </button>

          <button className="control-btn control-btn--primary" onClick={handlePlayPause}>
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>

          <button
            className="control-btn"
            onClick={handleNext}
            disabled={currentIndex === sortedNodes.length - 1}
          >
            <SkipForward size={20} />
          </button>

          <div className="speed-control">
            <button
              className="control-btn control-btn--speed"
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            >
              <Settings size={18} />
              <span>{playbackSpeed}x</span>
              <ChevronDown size={14} />
            </button>
            {showSpeedMenu && (
              <div className="speed-menu">
                {speedOptions.map((speed) => (
                  <button
                    key={speed}
                    className={`speed-menu__item ${
                      playbackSpeed === speed ? 'active' : ''
                    }`}
                    onClick={() => {
                      setPlaybackSpeed(speed);
                      setShowSpeedMenu(false);
                    }}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="preview-counter">
          {currentIndex + 1} / {sortedNodes.length}
        </div>
      </div>

      {isFinished && sortedNodes.length > 0 && (
        <div className="preview-finished">
          <h2>播放完成</h2>
          <div className="preview-finished__actions">
            <button
              onClick={() => {
                setCurrentIndex(0);
                setIsPlaying(true);
              }}
            >
              重新播放
            </button>
            <button onClick={handleClose}>返回编辑</button>
          </div>
        </div>
      )}
    </div>
  );
};

export const ShareView: React.FC = () => {
  const [sharedStory, setSharedStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const story = parseShareUrl();
    setSharedStory(story);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="preview-container">
        <div className="preview-empty">
          <h2>加载中...</h2>
        </div>
      </div>
    );
  }

  if (!sharedStory) {
    return (
      <div className="preview-container">
        <div className="preview-empty">
          <h2>无效的分享链接</h2>
          <p>无法解析故事数据</p>
        </div>
      </div>
    );
  }

  return <Preview externalStory={sharedStory} isShareMode />;
};

export default Preview;
