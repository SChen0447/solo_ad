import { useState, useEffect, useRef, useCallback } from 'react'
import styled from 'styled-components'
import type { AnimationInstance } from '@/types/animation'
import { AnimationBox } from './AnimationBox'

const PreviewContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
`

const TimelineContainer = styled.div`
  position: relative;
  width: 100%;
  height: 6px;
  background: #E5E7EB;
  flex-shrink: 0;
  cursor: pointer;
  z-index: 2;
`

const TimelineFill = styled.div<{ $progress: number }>`
  height: 100%;
  background: linear-gradient(90deg, #6366F1 0%, #C084FC 100%);
  width: ${({ $progress }) => $progress}%;
  transition: width 0.05s linear;
  pointer-events: none;
`

const TimelineThumb = styled.div<{ $progress: number }>`
  position: absolute;
  top: 50%;
  left: ${({ $progress }) => $progress}%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background: #FFFFFF;
  border: 2px solid #8B5CF6;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(139, 92, 246, 0.3);
  cursor: grab;
  transition: transform 0.15s;
  pointer-events: auto;

  &:hover {
    transform: translate(-50%, -50%) scale(1.2);
  }

  &:active {
    cursor: grabbing;
  }
`

const TimelineInput = styled.input`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  margin: 0;
  padding: 0;

  &::-webkit-slider-thumb {
    width: 14px;
    height: 14px;
    cursor: grab;
  }
`

const ControlsBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  gap: 16px;
  background: #FFFFFF;
  border-bottom: 1px solid #E5E7EB;
  flex-shrink: 0;
`

const PlayBtn = styled.button<{ $playing: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%);
  color: #FFFFFF;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
  }

  &:active {
    transform: scale(0.95);
  }
`

const TimeDisplay = styled.span`
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 13px;
  color: #6B7280;
  min-width: 80px;
  text-align: center;
`

const InstancesGrid = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
  padding: 24px;
  align-content: center;
  justify-content: center;
  overflow-y: auto;
`

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9CA3AF;
  font-size: 14px;
`

interface PreviewPanelProps {
  instances: AnimationInstance[]
  isPlaying: boolean
  currentTime: number
  playKey: number
  maxDuration: number
  onPlayToggle: () => void
  onTimeChange: (time: number) => void
}

export function PreviewPanel({
  instances,
  isPlaying,
  currentTime,
  playKey,
  maxDuration,
  onPlayToggle,
  onTimeChange
}: PreviewPanelProps) {
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const startProgressRef = useRef<number>(0)
  const seekKeyRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!isPlaying || maxDuration <= 0 || isDragging) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp
        startProgressRef.current = currentTime
      }
      const elapsed = (timestamp - startTimeRef.current) / 1000
      const newTime = (startProgressRef.current + elapsed) % maxDuration
      onTimeChange(newTime)
      rafRef.current = requestAnimationFrame(animate)
    }

    startTimeRef.current = 0
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isPlaying, maxDuration, playKey, isDragging, onTimeChange])

  useEffect(() => {
    if (!isPlaying) {
      startTimeRef.current = 0
    }
  }, [isPlaying])

  const progress = maxDuration > 0 ? (currentTime / maxDuration) * 100 : 0

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    const newTime = (value / 100) * maxDuration
    onTimeChange(newTime)
  }, [maxDuration, onTimeChange])

  const handleSliderMouseDown = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleSliderMouseUp = useCallback(() => {
    setIsDragging(false)
    startTimeRef.current = 0
    startProgressRef.current = currentTime
    seekKeyRef.current += 1
  }, [currentTime])

  const formatTime = (s: number) => {
    return `${s.toFixed(2)}s / ${maxDuration.toFixed(2)}s`
  }

  return (
    <PreviewContainer>
      <TimelineContainer
        onMouseDown={handleSliderMouseDown}
        onMouseUp={handleSliderMouseUp}
        onMouseLeave={handleSliderMouseUp}
      >
        <TimelineFill $progress={progress} />
        <TimelineThumb $progress={progress} />
        <TimelineInput
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={handleSliderChange}
          aria-label="播放进度"
        />
      </TimelineContainer>

      <ControlsBar>
        <PlayBtn $playing={isPlaying} onClick={onPlayToggle} aria-label={isPlaying ? '暂停' : '播放'}>
          {isPlaying ? '⏸' : '▶'}
        </PlayBtn>
        <TimeDisplay>{formatTime(currentTime)}</TimeDisplay>
      </ControlsBar>

      {instances.length === 0 ? (
        <EmptyState>暂无动画实例，请在左侧添加</EmptyState>
      ) : (
        <InstancesGrid>
          {instances.map((instance, idx) => (
            <AnimationBox
              key={instance.id}
              instance={instance}
              isPlaying={isPlaying && !isDragging}
              currentTime={currentTime}
              playKey={playKey}
              seekKey={seekKeyRef.current}
              index={idx}
            />
          ))}
        </InstancesGrid>
      )}
    </PreviewContainer>
  )
}
