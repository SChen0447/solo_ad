import React, { useRef, useState, useEffect } from 'react';
import { formatTime } from '../utils/replayEngine';

interface ReplayControlsProps {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  speed: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  onStartReplay: () => void;
  onStopReplay: () => void;
  disabled?: boolean;
  hasAnnotations: boolean;
}

const SPEEDS = [0.5, 1, 2, 4];

const ReplayControls: React.FC<ReplayControlsProps> = ({
  isPlaying,
  currentTime,
  totalDuration,
  speed,
  onPlayPause,
  onSeek,
  onSpeedChange,
  onStartReplay,
  onStopReplay,
  disabled = false,
  hasAnnotations,
}) => {
  const progressRef = useRef<HTMLDivElement>(null);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isReplayMode, setIsReplayMode] = useState(false);

  const handleProgressClick = (e: React.MouseEvent) => {
    if (!progressRef.current || totalDuration === 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    onSeek(percentage * totalDuration);
  };

  const handleStartReplay = () => {
    setIsReplayMode(true);
    onStartReplay();
  };

  const handleStopReplay = () => {
    setIsReplayMode(false);
    onStopReplay();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = shareLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    try {
      const response = await fetch(`/api/sessions/${window.location.pathname.split('/').pop()}/replay`);
      const data = await response.json();
      setShareLink(`${window.location.origin}${data.shareLink}`);
      setShowShareModal(true);
    } catch {
      alert('生成分享链接失败');
    }
  };

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  if (!isReplayMode) {
    return (
      <div style={styles.replayButtonContainer}>
        <button
          style={styles.replayButton}
          onClick={handleStartReplay}
          disabled={disabled || !hasAnnotations}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span>回放批注</span>
        </button>
        {hasAnnotations && (
          <button style={styles.shareButton} onClick={handleShare} disabled={disabled}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <span>分享</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div style={styles.container}>
        <button style={styles.stopButton} onClick={handleStopReplay} title="退出回放">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <button
          style={styles.playPauseButton}
          onClick={onPlayPause}
          disabled={totalDuration === 0}
        >
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        <span style={styles.timeText}>{formatTime(currentTime)}</span>

        <div
          ref={progressRef}
          style={styles.progressContainer}
          onClick={handleProgressClick}
        >
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
          <div
            style={{
              ...styles.progressThumb,
              left: `calc(${progress}% - 8px)`,
            }}
          />
        </div>

        <span style={styles.timeText}>{formatTime(totalDuration)}</span>

        <div style={styles.speedContainer}>
          <button
            style={styles.speedButton}
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
          >
            {speed}x
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showSpeedMenu && (
            <div style={styles.speedMenu}>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  style={{
                    ...styles.speedMenuItem,
                    ...(speed === s ? styles.speedMenuItemActive : {}),
                  }}
                  onClick={() => {
                    onSpeedChange(s);
                    setShowSpeedMenu(false);
                  }}
                >
                  {s}x
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showShareModal && (
        <div style={styles.modalOverlay} onClick={() => setShowShareModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>分享回放</h3>
            <p style={styles.modalDesc}>复制链接分享给其他人查看批注回放过程</p>
            <div style={styles.linkContainer}>
              <input style={styles.linkInput} value={shareLink} readOnly />
              <button style={styles.copyButton} onClick={handleCopyLink}>
                {copied ? '已复制' : '复制'}
              </button>
            </div>
            <button style={styles.closeButton} onClick={() => setShowShareModal(false)}>
              关闭
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '12px 24px',
    backgroundColor: 'var(--card-background)',
    borderRadius: 'var(--border-radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    backdropFilter: 'blur(10px)',
    zIndex: 100,
    minWidth: 600,
  },
  replayButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 12,
    zIndex: 100,
  },
  replayButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 24px',
    background: 'var(--primary-gradient)',
    color: 'white',
    borderRadius: 'var(--border-radius-lg)',
    fontSize: 14,
    fontWeight: 600,
    boxShadow: 'var(--shadow-lg)',
  },
  shareButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 20px',
    backgroundColor: 'var(--card-background)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--border-radius-lg)',
    fontSize: 14,
    fontWeight: 500,
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border-color)',
  },
  stopButton: {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--border-radius)',
  },
  playPauseButton: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--primary-gradient)',
    color: 'white',
    borderRadius: '50%',
    boxShadow: '0 0 20px rgba(108, 99, 255, 0.4)',
  },
  timeText: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    fontFamily: 'monospace',
    minWidth: 65,
    textAlign: 'center',
  },
  progressContainer: {
    flex: 1,
    position: 'relative',
    height: 24,
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'var(--border-color)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'var(--primary-gradient)',
    borderRadius: 3,
    transition: 'width 0.1s linear',
  },
  progressThumb: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 16,
    height: 16,
    backgroundColor: 'var(--primary-color)',
    borderRadius: '50%',
    boxShadow: '0 0 10px rgba(108, 99, 255, 0.6)',
    transition: 'left 0.1s linear',
  },
  speedContainer: {
    position: 'relative',
  },
  speedButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 12px',
    backgroundColor: 'var(--background)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--border-radius)',
    fontSize: 13,
    fontWeight: 500,
    border: '1px solid var(--border-color)',
  },
  speedMenu: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: 8,
    backgroundColor: 'var(--card-background)',
    borderRadius: 'var(--border-radius)',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
    minWidth: 80,
  },
  speedMenuItem: {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    textAlign: 'left',
    fontSize: 13,
  },
  speedMenuItemActive: {
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
    color: 'var(--primary-color)',
    fontWeight: 600,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease-out',
  },
  modal: {
    backgroundColor: 'var(--card-background)',
    borderRadius: 'var(--border-radius-lg)',
    padding: 32,
    maxWidth: 500,
    width: '90%',
    animation: 'fadeIn 0.3s ease-out',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: '0 0 8px 0',
  },
  modalDesc: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    margin: '0 0 24px 0',
  },
  linkContainer: {
    display: 'flex',
    gap: 12,
    marginBottom: 24,
  },
  linkInput: {
    flex: 1,
    padding: '10px 14px',
    backgroundColor: 'var(--background)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius)',
    color: 'var(--text-primary)',
    fontSize: 13,
  },
  copyButton: {
    padding: '10px 20px',
    background: 'var(--primary-gradient)',
    color: 'white',
    borderRadius: 'var(--border-radius)',
    fontSize: 13,
    fontWeight: 500,
  },
  closeButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: 'var(--border-color)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--border-radius)',
    fontSize: 14,
    fontWeight: 500,
  },
};

export default ReplayControls;
