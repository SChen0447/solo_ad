import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Track } from '../types';
import { snapToGrid, formatTime } from '../audioEngine';

interface AudioTimelineProps {
  tracks: Track[];
  zoomLevel: number;
  scrollOffset: number;
  currentTime: number;
  isPlaying: boolean;
  onTrackTimeUpdate: (id: string, startTime: number, endTime: number) => void;
  onTrackVolumeUpdate: (id: string, volume: number) => void;
  onTrackRemove: (id: string) => void;
  onScrollOffsetChange: (offset: number) => void;
  onDropResource: (resourceId: string) => void;
}

const TRACK_HEIGHT = 80;
const HEADER_HEIGHT = 32;
const PIXELS_PER_SECOND_BASE = 80;
const HANDLE_WIDTH = 8;

export default function AudioTimeline({
  tracks,
  zoomLevel,
  scrollOffset,
  currentTime,
  isPlaying,
  onTrackTimeUpdate,
  onTrackVolumeUpdate,
  onTrackRemove,
  onScrollOffsetChange,
  onDropResource,
}: AudioTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingTrack, setDraggingTrack] = useState<{
    id: string;
    type: 'start' | 'end' | 'move';
    initialX: number;
    initialStartTime: number;
    initialEndTime: number;
  } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<number | null>(null);

  const pps = PIXELS_PER_SECOND_BASE * zoomLevel;

  const maxTime = tracks.length > 0
    ? Math.max(...tracks.map((t) => t.endTime), 30)
    : 30;

  const totalWidth = Math.max(maxTime * pps + 200, 800);

  const timeToX = useCallback(
    (time: number) => time * pps - scrollOffset,
    [pps, scrollOffset]
  );

  const xToTime = useCallback(
    (x: number) => (x + scrollOffset) / pps,
    [pps, scrollOffset]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = Math.max(tracks.length * TRACK_HEIGHT + HEADER_HEIGHT, 200);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0d1b2a');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;

    const startSec = Math.floor(scrollOffset / pps);
    const endSec = Math.ceil((scrollOffset + width) / pps);
    const step = pps < 20 ? 10 : pps < 50 ? 5 : pps < 100 ? 2 : 1;

    for (let s = startSec; s <= endSec; s += step) {
      const x = timeToX(s);
      if (x >= 0 && x <= width) {
        ctx.beginPath();
        ctx.moveTo(x, HEADER_HEIGHT);
        ctx.lineTo(x, height);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.font = '10px Source Sans 3, sans-serif';
        ctx.fillText(formatTime(s), x + 4, HEADER_HEIGHT - 8);
      }
    }

    for (let i = 0; i <= tracks.length; i++) {
      const y = HEADER_HEIGHT + i * TRACK_HEIGHT;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    tracks.forEach((track, index) => {
      const y = HEADER_HEIGHT + index * TRACK_HEIGHT;

      if (index % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(0, y, width, TRACK_HEIGHT);
      }

      const startX = timeToX(track.startTime);
      const endX = timeToX(track.endTime);
      const trackWidth = endX - startX;

      if (endX < 0 || startX > width) return;

      const clipStart = Math.max(0, startX);
      const clipEnd = Math.min(width, endX);

      ctx.save();
      ctx.beginPath();
      ctx.rect(clipStart, y, clipEnd - clipStart, TRACK_HEIGHT);
      ctx.clip();

      const trackGrad = ctx.createLinearGradient(startX, y, endX, y + TRACK_HEIGHT);
      trackGrad.addColorStop(0, track.color + 'cc');
      trackGrad.addColorStop(1, track.color + '66');
      ctx.fillStyle = trackGrad;

      const radius = 6;
      ctx.beginPath();
      ctx.moveTo(startX + radius, y + 4);
      ctx.lineTo(endX - radius, y + 4);
      ctx.quadraticCurveTo(endX, y + 4, endX, y + 4 + radius);
      ctx.lineTo(endX, y + TRACK_HEIGHT - 4 - radius);
      ctx.quadraticCurveTo(endX, y + TRACK_HEIGHT - 4, endX - radius, y + TRACK_HEIGHT - 4);
      ctx.lineTo(startX + radius, y + TRACK_HEIGHT - 4);
      ctx.quadraticCurveTo(startX, y + TRACK_HEIGHT - 4, startX, y + TRACK_HEIGHT - 4 - radius);
      ctx.lineTo(startX, y + 4 + radius);
      ctx.quadraticCurveTo(startX, y + 4, startX + radius, y + 4);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = track.color + 'aa';
      ctx.lineWidth = 1;
      ctx.stroke();

      const channelData = track.buffer.getChannelData(0);
      const bufferDuration = track.buffer.duration;
      const samplesInTrack = Math.floor(trackWidth * bufferDuration / (track.endTime - track.startTime) * 2);
      const step2 = Math.max(1, Math.floor(channelData.length / samplesInTrack));

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();

      const midY = y + TRACK_HEIGHT / 2;
      const amplitude = (TRACK_HEIGHT / 2 - 8) * (track.volume / 100);

      for (let px = 0; px < trackWidth; px += 1) {
        const timeOffset = (px / trackWidth) * (track.endTime - track.startTime);
        const sampleIndex = Math.floor((timeOffset / bufferDuration) * channelData.length);
        if (sampleIndex < 0 || sampleIndex >= channelData.length) continue;

        let maxVal = 0;
        for (let s = 0; s < step2 && sampleIndex + s < channelData.length; s++) {
          maxVal = Math.max(maxVal, Math.abs(channelData[sampleIndex + s]));
        }

        const canvasX = startX + px;
        ctx.moveTo(canvasX, midY - maxVal * amplitude);
        ctx.lineTo(canvasX, midY + maxVal * amplitude);
      }
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 11px Source Sans 3, sans-serif';
      ctx.fillText(track.name, startX + 12, y + 18);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '10px Source Sans 3, sans-serif';
      ctx.fillText(
        `${formatTime(track.startTime)} - ${formatTime(track.endTime)}`,
        startX + 12,
        y + 32
      );

      ctx.restore();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(startX, y + 4, HANDLE_WIDTH, TRACK_HEIGHT - 8);
      ctx.fillRect(endX - HANDLE_WIDTH, y + 4, HANDLE_WIDTH, TRACK_HEIGHT - 8);

      const handlePattern = 3;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      for (let h = 0; h < 3; h++) {
        const hy = y + TRACK_HEIGHT / 2 - 6 + h * handlePattern * 2;
        ctx.fillRect(startX + 2, hy, 4, 2);
        ctx.fillRect(endX - 6, hy, 4, 2);
      }
    });

    if (dropIndicator !== null) {
      const dropY = HEADER_HEIGHT + dropIndicator * TRACK_HEIGHT;
      ctx.strokeStyle = '#e94560';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(0, dropY);
      ctx.lineTo(width, dropY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (isPlaying) {
      const progressX = timeToX(currentTime);
      if (progressX >= 0 && progressX <= width) {
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#e94560';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(progressX, HEADER_HEIGHT);
        ctx.lineTo(progressX, height);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#e94560';
        ctx.beginPath();
        ctx.moveTo(progressX - 5, HEADER_HEIGHT);
        ctx.lineTo(progressX + 5, HEADER_HEIGHT);
        ctx.lineTo(progressX, HEADER_HEIGHT + 8);
        ctx.closePath();
        ctx.fill();
      }
    }
  }, [tracks, zoomLevel, scrollOffset, currentTime, isPlaying, pps, timeToX, dropIndicator]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const trackIndex = Math.floor((y - HEADER_HEIGHT) / TRACK_HEIGHT);
      if (trackIndex < 0 || trackIndex >= tracks.length) return;

      const track = tracks[trackIndex];
      const startX = timeToX(track.startTime);
      const endX = timeToX(track.endTime);

      if (Math.abs(x - startX) < HANDLE_WIDTH + 4) {
        setDraggingTrack({
          id: track.id,
          type: 'start',
          initialX: x,
          initialStartTime: track.startTime,
          initialEndTime: track.endTime,
        });
      } else if (Math.abs(x - endX) < HANDLE_WIDTH + 4) {
        setDraggingTrack({
          id: track.id,
          type: 'end',
          initialX: x,
          initialStartTime: track.startTime,
          initialEndTime: track.endTime,
        });
      } else if (x > startX && x < endX) {
        setDraggingTrack({
          id: track.id,
          type: 'move',
          initialX: x,
          initialStartTime: track.startTime,
          initialEndTime: track.endTime,
        });
      }
    },
    [tracks, timeToX]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingTrack) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const deltaX = x - draggingTrack.initialX;
      const deltaTime = deltaX / pps;

      const track = tracks.find((t) => t.id === draggingTrack.id);
      if (!track) return;

      if (draggingTrack.type === 'start') {
        const newStart = snapToGrid(
          Math.max(0, Math.min(draggingTrack.initialStartTime + deltaTime, track.endTime - 0.1))
        );
        onTrackTimeUpdate(track.id, newStart, track.endTime);
      } else if (draggingTrack.type === 'end') {
        const newEnd = snapToGrid(
          Math.max(track.startTime + 0.1, draggingTrack.initialEndTime + deltaTime)
        );
        onTrackTimeUpdate(track.id, track.startTime, newEnd);
      } else {
        const duration = draggingTrack.initialEndTime - draggingTrack.initialStartTime;
        let newStart = snapToGrid(Math.max(0, draggingTrack.initialStartTime + deltaTime));
        const newEnd = newStart + duration;
        onTrackTimeUpdate(track.id, newStart, newEnd);
      }
    },
    [draggingTrack, pps, tracks, onTrackTimeUpdate]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingTrack(null);
  }, []);

  useEffect(() => {
    if (draggingTrack) {
      const onMouseMove = (e: MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const deltaX = x - draggingTrack.initialX;
        const deltaTime = deltaX / pps;
        const track = tracks.find((t) => t.id === draggingTrack.id);
        if (!track) return;

        if (draggingTrack.type === 'start') {
          const newStart = snapToGrid(
            Math.max(0, Math.min(draggingTrack.initialStartTime + deltaTime, track.endTime - 0.1))
          );
          onTrackTimeUpdate(track.id, newStart, track.endTime);
        } else if (draggingTrack.type === 'end') {
          const newEnd = snapToGrid(
            Math.max(track.startTime + 0.1, draggingTrack.initialEndTime + deltaTime)
          );
          onTrackTimeUpdate(track.id, track.startTime, newEnd);
        } else {
          const duration = draggingTrack.initialEndTime - draggingTrack.initialStartTime;
          const newStart = snapToGrid(Math.max(0, draggingTrack.initialStartTime + deltaTime));
          const newEnd = newStart + duration;
          onTrackTimeUpdate(track.id, newStart, newEnd);
        }
      };
      const onMouseUp = () => setDraggingTrack(null);

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    }
  }, [draggingTrack, pps, tracks, onTrackTimeUpdate]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      onScrollOffsetChange(e.currentTarget.scrollLeft);
    },
    [onScrollOffsetChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const resourceId = e.dataTransfer.getData('audio-resource-id');
      if (resourceId) {
        onDropResource(resourceId);
      }
      setDropIndicator(null);
    },
    [onDropResource]
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const index = Math.floor((y - HEADER_HEIGHT) / TRACK_HEIGHT);
      setDropIndicator(Math.max(0, Math.min(index, tracks.length)));
    },
    [tracks.length]
  );

  const handleDragLeave = useCallback(() => {
    setDropIndicator(null);
  }, []);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#0d1b2a',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        style={{
          height: HEADER_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <span
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 11,
            fontFamily: 'Source Sans 3, sans-serif',
          }}
        >
          TIMELINE
        </span>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        style={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'auto',
          cursor: draggingTrack ? 'grabbing' : 'default',
        }}
      >
        <div style={{ width: totalWidth, minHeight: tracks.length * TRACK_HEIGHT + HEADER_HEIGHT + 40 }}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ display: 'block' }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: '8px 12px',
          background: 'rgba(0,0,0,0.3)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          maxHeight: 180,
          overflowY: 'auto',
        }}
      >
        {tracks.map((track) => (
          <div
            key={track.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: track.color + '33',
              borderRadius: 8,
              padding: '4px 8px',
              border: `1px solid ${track.color}55`,
              minWidth: 200,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: track.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: 12,
                fontFamily: 'Source Sans 3, sans-serif',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {track.name}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={track.volume}
              onChange={(e) => onTrackVolumeUpdate(track.id, Number(e.target.value))}
              style={{
                width: 60,
                accentColor: track.color,
                cursor: 'pointer',
              }}
            />
            <span
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 10,
                fontFamily: 'Source Sans 3, sans-serif',
                width: 28,
                textAlign: 'right',
              }}
            >
              {track.volume}
            </span>
            <button
              onClick={() => onTrackRemove(track.id)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 4,
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.background = 'rgba(233,69,96,0.4)';
                (e.target as HTMLElement).style.color = '#e94560';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
                (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.6)';
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
