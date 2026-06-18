import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Track } from './TrackManager';
import { audioEngine } from './AudioEngine';

interface MainTimelineProps {
  tracks: Track[];
  selectedTrackId: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onLoadFile: (trackId: string, file: File) => void;
}

const TRACK_HEIGHT = 120;
const TRACK_GAP = 8;
const RULER_HEIGHT = 32;
const PLAYHEAD_WIDTH = 2;

const MainTimeline: React.FC<MainTimelineProps> = ({
  tracks,
  selectedTrackId,
  currentTime,
  duration,
  isPlaying,
  onSeek,
  onLoadFile,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const isDragging = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeTrackIdRef = useRef<string | null>(null);

  const [pixelsPerSecond, setPixelsPerSecond] = useState(50);

  const totalWidth = Math.max(800, Math.ceil(Math.max(duration, 10) * pixelsPerSecond));

  const formatTime = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(ms).padStart(2, '0')}`;
  };

  const renderWaveforms = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const totalH = tracks.length * TRACK_HEIGHT + (tracks.length - 1) * TRACK_GAP;
    canvas.width = totalWidth * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width = `${totalWidth}px`;
    canvas.style.height = `${totalH}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, totalWidth, totalH);

    tracks.forEach((track, idx) => {
      const y = idx * (TRACK_HEIGHT + TRACK_GAP);
      const isSelected = track.id === selectedTrackId;

      ctx.fillStyle = isSelected ? '#e3f2fd' : '#fafafa';
      ctx.fillRect(0, y, totalWidth, TRACK_HEIGHT);

      ctx.strokeStyle = track.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(0, y + TRACK_HEIGHT);
      ctx.stroke();

      if (track.waveformData && track.waveformData.peaks.length > 0) {
        const { peaks, rms } = track.waveformData;
        const midY = y + TRACK_HEIGHT / 2;
        const audioDuration = track.audioBuffer?.duration || 0;
        const waveWidth = audioDuration * pixelsPerSecond;
        const barWidth = waveWidth / peaks.length;

        ctx.fillStyle = track.color + '55';
        for (let i = 0; i < rms.length; i++) {
          const x = 2 + i * barWidth;
          const rmsH = rms[i] * (TRACK_HEIGHT * 0.8);
          ctx.fillRect(x, midY - rmsH / 2, Math.max(1, barWidth - 0.5), rmsH);
        }

        ctx.fillStyle = track.color;
        for (let i = 0; i < peaks.length; i++) {
          const x = 2 + i * barWidth;
          const peakH = peaks[i] * (TRACK_HEIGHT * 0.85);
          ctx.fillRect(x, midY - peakH / 2, Math.max(1, barWidth - 0.5), peakH);
        }
      } else {
        ctx.fillStyle = '#999';
        ctx.font = '14px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = track.audioBuffer ? '' : '点击加载音频';
        if (!track.audioBuffer) {
          ctx.fillText(label, totalWidth / 2, y + TRACK_HEIGHT / 2);
        }
      }
    });
  }, [tracks, selectedTrackId, totalWidth, pixelsPerSecond]);

  useEffect(() => {
    renderWaveforms();
  }, [renderWaveforms]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = containerRef.current;
    if (!rect) return;

    isDragging.current = true;
    updatePlayhead(e);
    document.body.style.cursor = 'col-resize';

    const handleMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      updatePlayhead(ev as unknown as React.MouseEvent);
    };

    const handleUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const updatePlayhead = (e: MouseEvent | React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scrollLeft = container.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft;
    const time = Math.max(0, Math.min(duration || 0, x / pixelsPerSecond));
    onSeek(time);
  };

  const handleTrackClick = (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation();
    activeTrackIdRef.current = trackId;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeTrackIdRef.current) return;

    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'];
    const validExts = ['.mp3', '.wav', '.ogg'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      alert('仅支持 MP3、WAV、OGG 格式');
      e.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过 10MB');
      e.target.value = '';
      return;
    }

    onLoadFile(activeTrackIdRef.current, file);
    e.target.value = '';
  };

  const renderRuler = () => {
    const ticks: React.ReactNode[] = [];
    const totalSeconds = Math.max(Math.ceil(duration || 10), 10);

    for (let s = 0; s <= totalSeconds; s++) {
      const isMajor = s % 5 === 0;
      const x = s * pixelsPerSecond;
      const height = isMajor ? RULER_HEIGHT * 0.85 : RULER_HEIGHT * 0.4;
      const width = isMajor ? 2 : 1;
      const color = isMajor ? '#e0e0e0' : '#666';
      ticks.push(
        <div
          key={`tick-${s}`}
          style={{
            position: 'absolute',
            left: x,
            bottom: 0,
            width,
            height: `${height}px`,
            backgroundColor: color,
          }}
        />
      );
      if (isMajor) {
        ticks.push(
          <div
            key={`label-${s}`}
            style={{
              position: 'absolute',
              left: x + 4,
              top: 2,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'JetBrains Mono, monospace',
              color: '#e0e0e0',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            {formatTime(s)}
          </div>
        );
      }
    }

    return ticks;
  };

  const playheadX = currentTime * pixelsPerSecond;

  return (
    <div style={styles.container}>
      <div
        ref={containerRef}
        style={styles.scrollArea}
        onMouseDown={handleMouseDown}
      >
        <div
          style={{
            ...styles.ruler,
            width: totalWidth,
          }}
        >
          {renderRuler()}
        </div>

        <div style={{ position: 'relative', width: totalWidth }}>
          <canvas
            ref={canvasRef}
            style={{ display: 'block' }}
          />
          {tracks.map((track, idx) => {
            const y = idx * (TRACK_HEIGHT + TRACK_GAP);
            return (
              <div
                key={track.id}
                onClick={e => handleTrackClick(e, track.id)}
                style={{
                  position: 'absolute',
                top: y,
                left: 0,
                width: totalWidth,
                height: TRACK_HEIGHT,
                cursor: 'pointer',
              }}
              />
            );
          })}
          <div
            ref={playheadRef}
            style={{
              position: 'absolute',
              top: RULER_HEIGHT,
              left: playheadX,
              width: PLAYHEAD_WIDTH,
              height: tracks.length * (TRACK_HEIGHT + TRACK_GAP) - TRACK_GAP,
              backgroundColor: '#f44336',
              pointerEvents: 'none',
              zIndex: 10,
              boxShadow: '0 0 4px rgba(244, 67, 54, 0.5)',
            }}
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,.ogg,audio/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    height: '100%',
    background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  scrollArea: {
    flex: 1,
    overflowX: 'auto',
    overflowY: 'auto',
    cursor: 'col-resize',
    position: 'relative',
  },
  ruler: {
    height: RULER_HEIGHT,
    position: 'sticky',
    top: 0,
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
    borderBottom: '1px solid #333',
    zIndex: 5,
  },
};

export default MainTimeline;
