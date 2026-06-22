import { useRef, useCallback, useState, useEffect } from 'react';
import styled from 'styled-components';
import AnimationBox from './AnimationBox';
import { AnimationConfig } from '@/types/animation';

interface PreviewPanelProps {
  animations: AnimationConfig[];
  selectedId: string;
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  playKey: number;
  isSeeking: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onSeekStart: () => void;
  onSeekEnd: () => void;
  onRestart: () => void;
  onSelect: (id: string) => void;
}

const PreviewContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const TimelineBar = styled.div`
  width: 100%;
  height: 6px;
  background: #E5E7EB;
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
  z-index: 10;
`;

const TimelineProgress = styled.div<{ $progress: number }>`
  height: 100%;
  background: linear-gradient(90deg, #6366F1, #C084FC);
  width: ${props => props.$progress * 100}%;
  border-radius: 0 3px 3px 0;
`;

const TimelineThumb = styled.div<{ $progress: number }>`
  position: absolute;
  top: 50%;
  left: ${props => props.$progress * 100}%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background: white;
  border: 3px solid #8B5CF6;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
  cursor: grab;
  
  &:active {
    cursor: grabbing;
  }
`;

const TimeLabels = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 4px 16px;
  font-size: 11px;
  color: #9CA3AF;
  flex-shrink: 0;
`;

const ControlBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  flex-shrink: 0;
`;

const PlayButton = styled.button`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8B5CF6, #3B82F6);
  color: white;
  border: none;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 24px rgba(139, 92, 246, 0.5);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const SecondaryButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: white;
  color: #6B7280;
  border: 2px solid #E5E7EB;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    border-color: #8B5CF6;
    color: #8B5CF6;
  }
`;

const AnimationGrid = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40px;
  flex-wrap: wrap;
  padding: 40px;
  overflow-y: auto;
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9CA3AF;
  gap: 12px;
`;

const PreviewPanel = ({
  animations,
  selectedId,
  isPlaying,
  currentTime,
  totalDuration,
  playKey,
  isSeeking,
  onPlay,
  onPause,
  onSeek,
  onSeekStart,
  onSeekEnd,
  onRestart,
  onSelect,
}: PreviewPanelProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const progress = totalDuration > 0 ? (currentTime % totalDuration) / totalDuration : 0;

  const getTimeFromEvent = useCallback((clientX: number) => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    return (x / rect.width) * totalDuration;
  }, [totalDuration]);

  const handleTimelineMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    onSeekStart();
    const time = getTimeFromEvent(e.clientX);
    onSeek(time);
  }, [getTimeFromEvent, onSeek, onSeekStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const time = getTimeFromEvent(e.clientX);
    onSeek(time);
  }, [isDragging, getTimeFromEvent, onSeek]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onSeekEnd();
    }
  }, [isDragging, onSeekEnd]);

  const handleRestart = useCallback(() => {
    onRestart();
  }, [onRestart]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  }, [isPlaying, onPlay, onPause]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <PreviewContainer>
      <TimelineBar ref={timelineRef} onMouseDown={handleTimelineMouseDown}>
        <TimelineProgress $progress={progress} />
        <TimelineThumb $progress={progress} />
      </TimelineBar>

      <TimeLabels>
        <span>0:00</span>
        <span>{totalDuration.toFixed(1)}s</span>
      </TimeLabels>

      <ControlBar>
        <SecondaryButton onClick={handleRestart} title="重新播放">
          ⟲
        </SecondaryButton>
        <PlayButton onClick={handlePlayPause} title={isPlaying ? '暂停' : '播放'}>
          {isPlaying ? '⏸' : '▶'}
        </PlayButton>
        <div style={{ width: 40 }} />
      </ControlBar>

      {animations.length > 0 ? (
        <AnimationGrid>
          {animations.map(anim => (
            <AnimationBox
              key={anim.id}
              animation={anim}
              currentTime={currentTime}
              isPlaying={isPlaying}
              isSelected={anim.id === selectedId}
              isSeeking={isSeeking}
              playKey={playKey}
              onClick={() => onSelect(anim.id)}
            />
          ))}
        </AnimationGrid>
      ) : (
        <EmptyState>
          <p style={{ fontSize: '48px', margin: 0 }}>🎬</p>
          <p>暂无动画实例，点击左侧添加</p>
        </EmptyState>
      )}
    </PreviewContainer>
  );
};

export default PreviewPanel;
