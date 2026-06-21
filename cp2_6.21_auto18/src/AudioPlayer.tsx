import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { Track } from './types';
import { formatTime } from './utils';

interface AudioPlayerProps {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  onAddTrack: (file: File) => Promise<string>;
  onSelectTrack: (trackId: string | null) => void;
  onTogglePlay: (playing?: boolean) => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  audioElementRef: React.MutableRefObject<HTMLAudioElement | null>;
  animationFrameRef: React.MutableRefObject<number | null>;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  currentTime,
  volume,
  onAddTrack,
  onSelectTrack,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  audioElementRef,
  animationFrameRef,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    audioElementRef.current = audioRef.current;
  }, [audioElementRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (Math.abs(audio.currentTime - currentTime) > 0.1) {
      audio.currentTime = currentTime;
    }
  }, [currentTime]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let lastTime = 0;
    const updateProgress = () => {
      const now = performance.now();
      if (now - lastTime >= 1000 / 60) {
        if (audio && !isNaN(audio.currentTime)) {
          onSeek(audio.currentTime);
        }
        lastTime = now;
      }
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, onSeek, animationFrameRef]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.includes('audio/mpeg') ||
        file.type.includes('audio/ogg') ||
        file.name.endsWith('.mp3') ||
        file.name.endsWith('.ogg')
      );

      for (const file of files) {
        const trackId = await onAddTrack(file);
        if (tracks.length === 0) {
          onSelectTrack(trackId);
        }
      }
    },
    [onAddTrack, tracks.length, onSelectTrack]
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        const trackId = await onAddTrack(file);
        if (tracks.length === 0) {
          onSelectTrack(trackId);
        }
      }
      e.target.value = '';
    },
    [onAddTrack, tracks.length, onSelectTrack]
  );

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!currentTrack || !progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const time = ratio * (currentTrack.duration || audioRef.current?.duration || 0);
      onSeek(Math.max(0, Math.min(time, currentTrack.duration || 0)));
    },
    [currentTrack, onSeek]
  );

  const handlePlayPause = useCallback(() => {
    if (!currentTrack) return;
    onTogglePlay(!isPlaying);
  }, [currentTrack, isPlaying, onTogglePlay]);

  const handleVolumeClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      onVolumeChange(Math.max(0, Math.min(1, ratio)));
    },
    [onVolumeChange]
  );

  const progressPercent = currentTrack?.duration
    ? (currentTime / currentTrack.duration) * 100
    : 0;

  return (
    <div style={styles.container}>
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        onEnded={() => onTogglePlay(false)}
        onLoadedMetadata={(e) => {
          if (currentTrack && !currentTrack.duration) {
            const audio = e.currentTarget;
          }
        }}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
        style={{
          ...styles.dropZone,
          borderStyle: isDragOver ? 'solid' : 'dashed',
          borderColor: isDragOver ? '#6C63FF' : 'var(--accent-purple)',
          backgroundColor: isDragOver ? 'rgba(108, 99, 255, 0.15)' : 'rgba(108, 99, 255, 0.08)',
        }}
      >
        <span style={styles.dropZoneText}>
          🎵 拖入 MP3/OGG 文件到此处，或点击选择文件
        </span>
        <input
          id="file-input"
          type="file"
          accept=".mp3,.ogg,audio/mpeg,audio/ogg"
          multiple
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
      </div>

      <div style={styles.playerControls}>
        <button
          onClick={handlePlayPause}
          disabled={!currentTrack}
          style={{
            ...styles.playButton,
            opacity: currentTrack ? 1 : 0.5,
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div style={styles.progressContainer}>
          <span style={styles.timeText}>{formatTime(currentTime)}</span>
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            style={styles.progressBar}
          >
            <div
              style={{
                ...styles.progressFill,
                width: `${progressPercent}%`,
              }}
            />
          </div>
          <span style={styles.timeText}>
            {formatTime(currentTrack?.duration || 0)}
          </span>
        </div>

        <div style={styles.volumeContainer}>
          <span style={styles.volumeIcon}>🔊</span>
          <div onClick={handleVolumeClick} style={styles.volumeBar}>
            <div style={{ ...styles.volumeFill, width: `${volume * 100}%` }} />
          </div>
        </div>

        <button
          onClick={() => setShowPlaylist(!showPlaylist)}
          style={styles.playlistBtn}
          title="播放列表"
        >
          📋
        </button>
      </div>

      {showPlaylist && tracks.length > 0 && (
        <div style={styles.playlist}>
          <div style={styles.playlistHeader}>
            <span style={styles.playlistTitle}>播放列表</span>
            <span style={styles.playlistCount}>{tracks.length} 首</span>
          </div>
          <div style={styles.playlistItems}>
            {tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => onSelectTrack(track.id)}
                style={{
                  ...styles.playlistItem,
                  backgroundColor:
                    currentTrack?.id === track.id
                      ? 'rgba(74, 144, 217, 0.2)'
                      : 'transparent',
                }}
              >
                <span style={styles.trackIcon}>🎵</span>
                <span style={styles.trackName}>{track.name}</span>
                {currentTrack?.id === track.id && isPlaying && (
                  <span style={styles.playingIndicator}>♪</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flexShrink: 0,
  },
  dropZone: {
    width: '80%',
    height: '80px',
    margin: '0 auto',
    borderRadius: '12px',
    border: '2px dashed var(--accent-purple)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    userSelect: 'none',
  },
  dropZoneText: {
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  playerControls: {
    height: '60px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    gap: '16px',
    backdropFilter: 'blur(12px)',
  },
  playButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-blue)',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.2s ease',
  },
  progressContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: 0,
  },
  progressBar: {
    flex: 1,
    height: '6px',
    backgroundColor: 'var(--progress-bg)',
    borderRadius: '3px',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #4A90D9, #A78BFA)',
    borderRadius: '3px',
    transition: 'width 0.05s linear',
  },
  timeText: {
    color: 'var(--text-secondary)',
    fontSize: '12px',
    fontFamily: 'monospace',
    minWidth: '40px',
    textAlign: 'center',
  },
  volumeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '120px',
    flexShrink: 0,
  },
  volumeIcon: {
    fontSize: '16px',
  },
  volumeBar: {
    flex: 1,
    height: '4px',
    backgroundColor: 'var(--progress-bg)',
    borderRadius: '2px',
    cursor: 'pointer',
    overflow: 'hidden',
  },
  volumeFill: {
    height: '100%',
    backgroundColor: 'var(--accent-lavender)',
    borderRadius: '2px',
  },
  playlistBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  playlist: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '8px',
    padding: '12px',
    maxHeight: '200px',
    overflowY: 'auto',
    backdropFilter: 'blur(12px)',
  },
  playlistHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--border-color)',
  },
  playlistTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  playlistCount: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  playlistItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  playlistItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  trackIcon: {
    fontSize: '14px',
  },
  trackName: {
    flex: 1,
    fontSize: '13px',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  playingIndicator: {
    color: 'var(--accent-blue)',
    fontSize: '14px',
    animation: 'pulse 1s infinite',
  },
};

export default AudioPlayer;
