import React, { useState, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { Screenshot } from '../types';

interface ScreenCaptureProps {
  screenshots: Screenshot[];
  onScreenshotsChange: (screenshots: Screenshot[]) => void;
  onDragStart: (screenshot: Screenshot) => void;
}

const ScreenCapture: React.FC<ScreenCaptureProps> = ({
  screenshots,
  onScreenshotsChange,
  onDragStart,
}) => {
  const [url, setUrl] = useState('https://example.com');
  const [iframeUrl, setIframeUrl] = useState('https://example.com');
  const [isCapturing, setIsCapturing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const handleNavigate = () => {
    if (url.trim()) {
      setIframeUrl(url.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNavigate();
    }
  };

  const captureScreen = useCallback(async () => {
    if (!iframeRef.current) return;

    setIsCapturing(true);
    try {
      const iframe = iframeRef.current;
      const canvas = await html2canvas(iframe.contentDocument?.body || document.body, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: window.devicePixelRatio,
        width: iframe.clientWidth,
        height: iframe.clientHeight,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const newScreenshot: Screenshot = {
        id: `screenshot-${Date.now()}`,
        dataUrl,
        timestamp: Date.now(),
        number: screenshots.length + 1,
        width: canvas.width,
        height: canvas.height,
      };

      const updatedScreenshots = [...screenshots, newScreenshot].slice(-6);
      updatedScreenshots.forEach((s, idx) => {
        s.number = idx + 1;
      });
      onScreenshotsChange(updatedScreenshots);
    } catch (error) {
      console.error('Capture failed:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [screenshots, onScreenshotsChange]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleDragStart = (e: React.DragEvent, screenshot: Screenshot) => {
    e.dataTransfer.setData('screenshot', JSON.stringify(screenshot));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart(screenshot);
  };

  const removeScreenshot = (id: string) => {
    const updated = screenshots.filter((s) => s.id !== id);
    updated.forEach((s, idx) => {
      s.number = idx + 1;
    });
    onScreenshotsChange(updated);
  };

  return (
    <div style={styles.container}>
      <style>{`
        .url-input:focus {
          border-color: #00d2ff !important;
          box-shadow: 0 0 0 2px rgba(0, 210, 255, 0.2) !important;
        }
        .navigate-btn:hover {
          box-shadow: 0 0 20px rgba(0, 210, 255, 0.5) !important;
          transform: translateY(-1px);
        }
        .capture-btn:hover:not(:disabled) {
          box-shadow: 0 0 20px rgba(181, 55, 242, 0.5) !important;
          transform: translateY(-1px);
        }
        .thumbnail-wrapper:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 210, 255, 0.3);
          border-color: rgba(0, 210, 255, 0.5) !important;
        }
        .thumbnail-wrapper:hover .remove-btn {
          opacity: 1 !important;
        }
        .remove-btn:hover {
          background: #ff4757 !important;
        }
        .track::-webkit-scrollbar {
          height: 6px;
        }
        .track::-webkit-scrollbar-track {
          background: #252640;
          border-radius: 3px;
        }
        .track::-webkit-scrollbar-thumb {
          background: #4a4b6c;
          border-radius: 3px;
        }
        .track::-webkit-scrollbar-thumb:hover {
          background: #5a5b7c;
        }
      `}</style>
      <div style={styles.browserSection}>
        <div style={styles.urlBar}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入URL..."
            style={styles.urlInput}
            className="url-input"
          />
          <button onClick={handleNavigate} style={styles.navigateBtn} className="navigate-btn">
            前往
          </button>
          <button
            onClick={captureScreen}
            disabled={isCapturing}
            style={{
              ...styles.captureBtn,
              ...(isCapturing ? styles.captureBtnDisabled : {}),
            }}
            className="capture-btn"
          >
            {isCapturing ? '截图中...' : '📸 截图'}
          </button>
        </div>
        <div style={styles.iframeWrapper}>
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            style={styles.iframe}
            title="browser"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      </div>

      <div style={styles.trackContainer}>
        <div style={styles.trackLabel}>
          <span>截图对比轨道</span>
          <span style={styles.trackCount}>{screenshots.length}/6</span>
        </div>
        <div ref={trackRef} style={styles.track} className="track">
          {screenshots.length === 0 ? (
            <div style={styles.emptyTrack}>
              <span>点击截图按钮开始捕获页面，拖拽截图到对比面板</span>
            </div>
          ) : (
            screenshots.map((screenshot) => (
              <div
                key={screenshot.id}
                draggable
                onDragStart={(e) => handleDragStart(e, screenshot)}
                style={styles.thumbnailWrapper}
                className="thumbnail-wrapper"
              >
                <div style={styles.thumbnailBadge}>#{screenshot.number}</div>
                <img
                  src={screenshot.dataUrl}
                  alt={`Screenshot ${screenshot.number}`}
                  style={styles.thumbnail}
                  draggable={false}
                />
                <div style={styles.thumbnailInfo}>
                  <span style={styles.thumbnailTime}>{formatTime(screenshot.timestamp)}</span>
                </div>
                <button
                  onClick={() => removeScreenshot(screenshot.id)}
                  style={styles.removeBtn}
                  className="remove-btn"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#1a1b2e',
  },
  browserSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  urlBar: {
    display: 'flex',
    gap: '8px',
    padding: '12px',
    background: '#252640',
    borderBottom: '1px solid #3a3b5c',
  },
  urlInput: {
    flex: 1,
    padding: '10px 16px',
    background: '#1a1b2e',
    border: '1px solid #3a3b5c',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  navigateBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #00d2ff, #3a7bd5)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  captureBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #b537f2, #7b2ff7)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  captureBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  iframeWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    background: '#fff',
  },
  trackContainer: {
    borderTop: '1px solid #3a3b5c',
    background: '#252640',
  },
  trackLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    color: '#8b8ca8',
    fontSize: '12px',
  },
  trackCount: {
    color: '#00d2ff',
    fontWeight: 600,
  },
  track: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px 20px',
    overflowX: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: '#4a4b6c #252640',
  },
  emptyTrack: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: '#5a5b7c',
    fontSize: '13px',
    border: '2px dashed #3a3b5c',
    borderRadius: '12px',
    margin: '0 auto',
    width: '100%',
  },
  thumbnailWrapper: {
    position: 'relative',
    flexShrink: 0,
    width: '160px',
    height: '120px',
    borderRadius: '10px',
    overflow: 'hidden',
    cursor: 'grab',
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.3s ease',
  },
  thumbnailBadge: {
    position: 'absolute',
    top: '6px',
    left: '6px',
    background: 'linear-gradient(135deg, #00d2ff, #3a7bd5)',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '6px',
    zIndex: 2,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    pointerEvents: 'none',
  },
  thumbnailInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '6px 10px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
  },
  thumbnailTime: {
    color: '#fff',
    fontSize: '11px',
    opacity: 0.9,
  },
  removeBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.6)',
    border: 'none',
    color: '#fff',
    fontSize: '16px',
    lineHeight: '20px',
    cursor: 'pointer',
    zIndex: 2,
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },
};

export default ScreenCapture;
