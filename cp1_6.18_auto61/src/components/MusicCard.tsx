import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { MusicTrack, Mood } from '../services/apiService';

interface MusicCardProps {
  track: MusicTrack;
  selected: boolean;
  onSelect: (track: MusicTrack) => void;
}

const moodGradients: Record<Mood, { from: string; to: string }> = {
  轻松: { from: '#84fab0', to: '#8fd3f4' },
  激昂: { from: '#f093fb', to: '#f5576c' },
  悬疑: { from: '#4facfe', to: '#00f2fe' },
  忧郁: { from: '#667eea', to: '#764ba2' },
  温暖: { from: '#ffecd2', to: '#fcb69f' },
  科技: { from: '#0ba360', to: '#3cba92' },
};

const MusicCard: React.FC<MusicCardProps> = ({ track, selected, onSelect }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gradient = moodGradients[track.mood];

  const drawIdleWave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const barCount = 32;
    const barWidth = w / barCount - 2;
    for (let i = 0; i < barCount; i++) {
      const barHeight = 4 + Math.sin(i * 0.5) * 3 + 3;
      const x = i * (barWidth + 2);
      const y = (h - barHeight) / 2;
      ctx.fillStyle = `rgba(255,255,255,0.4)`;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }, []);

  const drawPlayingWave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const barCount = 32;
    const barWidth = w / barCount - 2;
    const t = Date.now() / 200;
    for (let i = 0; i < barCount; i++) {
      const amplitude = h * 0.35;
      const barHeight = Math.abs(Math.sin(i * 0.25 + t) * amplitude) + 4;
      const x = i * (barWidth + 2);
      const y = (h - barHeight) / 2;
      const alpha = 0.5 + 0.5 * Math.sin(i * 0.3 + t);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }, []);

  const animate = useCallback(() => {
    drawPlayingWave();
    animationRef.current = requestAnimationFrame(animate);
  }, [drawPlayingWave]);

  useEffect(() => {
    drawIdleWave();
  }, [drawIdleWave]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (error) setError(null);
    if (!audioRef.current) {
      setIsLoading(true);
      const audio = new Audio(track.previewUrl);
      audio.crossOrigin = 'anonymous';
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
        setIsLoading(false);
      });
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
        setProgress((audio.currentTime / audio.duration) * 100 || 0);
      });
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        drawIdleWave();
      });
      audio.addEventListener('error', () => {
        setIsLoading(false);
        setError('音频加载失败');
        setIsPlaying(false);
      });
      audioRef.current = audio;
    }

    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      drawIdleWave();
    } else {
      try {
        setShowRipple(true);
        setTimeout(() => setShowRipple(false), 600);
        await audio.play();
        setIsPlaying(true);
        animate();
      } catch {
        setError('播放失败');
      }
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current || !duration) return;
    e.stopPropagation();
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * duration;
  };

  const formatTime = (s: number): string => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div
      onClick={() => onSelect(track)}
      className="music-card"
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '16px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: 'translateY(0)',
        border: selected ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent',
        background: `linear-gradient(135deg, ${gradient.from}cc, ${gradient.to}cc)`,
        boxShadow: selected
          ? `0 8px 24px rgba(100,200,255,0.3), 0 0 0 1px rgba(255,255,255,0.2)`
          : '0 4px 12px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 32px rgba(100,200,255,0.3), 0 0 0 1px rgba(255,255,255,0.15)`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = selected
          ? `0 8px 24px rgba(100,200,255,0.3), 0 0 0 1px rgba(255,255,255,0.2)`
          : '0 4px 12px rgba(0,0,0,0.3)';
      }}
    >
      {showRipple && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '10px',
            height: '10px',
            marginLeft: '-5px',
            marginTop: '-5px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
            animation: 'ripple-expand 0.6s ease-out forwards',
            pointerEvents: 'none',
          }}
        />
      )}
      <style>{`
        @keyframes ripple-expand {
          0% { transform: scale(0); opacity: 0.8; }
          100% { transform: scale(40); opacity: 0; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <button
          onClick={togglePlay}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255,255,255,0.85)',
            color: '#1a1a2e',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          {isLoading ? (
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }} fill="currentColor">
              <path d="M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-8-8V2z" />
            </svg>
          ) : isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {track.title}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(26,26,46,0.6)', marginTop: '2px' }}>
            {track.mood} · {formatTime(currentTime) || '--:--'}/{duration ? formatTime(duration) : track.duration}
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={260}
        height={36}
        style={{ width: '100%', height: '36px', borderRadius: '6px', marginBottom: '10px', display: 'block' }}
      />

      <div
        ref={progressRef}
        onClick={handleProgressClick}
        style={{
          position: 'relative',
          height: '4px',
          background: 'rgba(255,255,255,0.25)',
          borderRadius: '2px',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: `${progress}%`,
            background: '#fff',
            borderRadius: '2px',
            transition: 'width 0.15s ease-out',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${progress}%`,
            width: '14px',
            height: '14px',
            background: '#fff',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            transition: 'left 0.15s ease-out',
          }}
        />
      </div>

      {error && (
        <div style={{ fontSize: '11px', color: '#8b0000', marginTop: '8px', textAlign: 'center' }}>
          {error}
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default MusicCard;
