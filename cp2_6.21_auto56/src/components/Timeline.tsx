import { useState, useEffect, useRef } from 'react';
import type { Capsule } from '../api/timeline';

interface TimelineProps {
  capsules: Capsule[];
}

interface ShareState {
  capsule: Capsule;
  copied: boolean;
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDateForPoster(isoString: string): string {
  const date = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

function generateShareLink(id: string): string {
  return `/capsule/${id}`;
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function svgDataUrlToCanvas(dataUrl: string, width: number, height: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法获取Canvas上下文'));
        return;
      }
      ctx.fillStyle = '#1E1B4B';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function generatePoster(capsule: Capsule): Promise<string> {
  const posterWidth = 1080;
  const posterHeight = 1920;
  const cloudWidth = 960;
  const cloudHeight = 720;
  const cloudTop = 180;
  const cloudLeft = (posterWidth - cloudWidth) / 2;

  const cloudCanvas = await svgDataUrlToCanvas(capsule.imageDataUrl, cloudWidth, cloudHeight);

  const canvas = document.createElement('canvas');
  canvas.width = posterWidth;
  canvas.height = posterHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法获取Canvas上下文');

  const bgGradient = ctx.createLinearGradient(0, 0, 0, posterHeight);
  bgGradient.addColorStop(0, '#1E1B4B');
  bgGradient.addColorStop(0.5, '#312E81');
  bgGradient.addColorStop(1, '#0F172A');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, posterWidth, posterHeight);

  for (let i = 0; i < 500; i++) {
    const nx = Math.floor(Math.random() * posterWidth);
    const ny = Math.floor(Math.random() * posterHeight);
    const opacity = Math.random() * 0.06;
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.fillRect(nx, ny, 1, 1);
  }

  ctx.save();
  ctx.shadowColor = 'rgba(99, 102, 241, 0.4)';
  ctx.shadowBlur = 32;
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
  ctx.lineWidth = 3;
  const radius = 24;
  ctx.beginPath();
  ctx.moveTo(cloudLeft + radius, cloudTop);
  ctx.lineTo(cloudLeft + cloudWidth - radius, cloudTop);
  ctx.quadraticCurveTo(cloudLeft + cloudWidth, cloudTop, cloudLeft + cloudWidth, cloudTop + radius);
  ctx.lineTo(cloudLeft + cloudWidth, cloudTop + cloudHeight - radius);
  ctx.quadraticCurveTo(cloudLeft + cloudWidth, cloudTop + cloudHeight, cloudLeft + cloudWidth - radius, cloudTop + cloudHeight);
  ctx.lineTo(cloudLeft + radius, cloudTop + cloudHeight);
  ctx.quadraticCurveTo(cloudLeft, cloudTop + cloudHeight, cloudLeft, cloudTop + cloudHeight - radius);
  ctx.lineTo(cloudLeft, cloudTop + radius);
  ctx.quadraticCurveTo(cloudLeft, cloudTop, cloudLeft + radius, cloudTop);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cloudLeft + radius, cloudTop);
  ctx.lineTo(cloudLeft + cloudWidth - radius, cloudTop);
  ctx.quadraticCurveTo(cloudLeft + cloudWidth, cloudTop, cloudLeft + cloudWidth, cloudTop + radius);
  ctx.lineTo(cloudLeft + cloudWidth, cloudTop + cloudHeight - radius);
  ctx.quadraticCurveTo(cloudLeft + cloudWidth, cloudTop + cloudHeight, cloudLeft + cloudWidth - radius, cloudTop + cloudHeight);
  ctx.lineTo(cloudLeft + radius, cloudTop + cloudHeight);
  ctx.quadraticCurveTo(cloudLeft, cloudTop + cloudHeight, cloudLeft, cloudTop + cloudHeight - radius);
  ctx.lineTo(cloudLeft, cloudTop + radius);
  ctx.quadraticCurveTo(cloudLeft, cloudTop, cloudLeft + radius, cloudTop);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(cloudCanvas, cloudLeft, cloudTop, cloudWidth, cloudHeight);
  ctx.restore();

  const textY = cloudTop + cloudHeight + 120;

  ctx.fillStyle = '#F1F5F9';
  ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('时间胶囊', posterWidth / 2, textY);

  const infoY = textY + 80;
  ctx.fillStyle = '#94A3B8';
  ctx.font = '32px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(`用户：${capsule.nickname || '匿名用户'}`, posterWidth / 2, infoY);
  ctx.fillText(`时间：${formatDateForPoster(capsule.timestamp)}`, posterWidth / 2, infoY + 56);

  const tagsY = infoY + 130;
  if (capsule.tags.length > 0) {
    ctx.fillStyle = '#818CF8';
    ctx.font = '28px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
    const tagText = capsule.tags.map(t => `#${t}`).join('  ');
    ctx.fillText(tagText, posterWidth / 2, tagsY);
  }

  const footerY = posterHeight - 120;

  const footerGradient = ctx.createLinearGradient(0, 0, posterWidth, 0);
  footerGradient.addColorStop(0, '#6366F1');
  footerGradient.addColorStop(1, '#A855F7');
  ctx.fillStyle = footerGradient;
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('✦ 来自词云时间胶囊 ✦', posterWidth / 2, footerY);

  ctx.fillStyle = '#64748B';
  ctx.font = '24px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('记录此刻的心情，未来的你会感谢现在的自己', posterWidth / 2, footerY + 56);

  return canvas.toDataURL('image/png');
}

export default function Timeline({ capsules }: TimelineProps) {
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);
  const [shareState, setShareState] = useState<ShareState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [shareClosing, setShareClosing] = useState(false);
  const copyTimerRef = useRef<number | null>(null);
  const sharePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedCapsule || shareVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedCapsule, shareVisible]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleShareClick = (e: React.MouseEvent, capsule: Capsule) => {
    e.stopPropagation();
    if (shareClosing) return;
    setShareState({ capsule, copied: false });
    setShareClosing(false);
    requestAnimationFrame(() => {
      setShareVisible(true);
    });
  };

  const handleCloseShare = () => {
    if (copyTimerRef.current) {
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
    setShareClosing(true);
  };

  const handleShareAnimationEnd = () => {
    if (shareClosing) {
      setShareVisible(false);
      setShareClosing(false);
      setShareState(null);
    }
  };

  const handleCopyLink = async () => {
    if (!shareState) return;
    const link = generateShareLink(shareState.capsule.id);
    try {
      await navigator.clipboard.writeText(link);
      setShareState(prev => prev ? { ...prev, copied: true } : null);
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setShareState(prev => prev ? { ...prev, copied: false } : null);
      }, 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleDownloadImage = async () => {
    if (!shareState) return;
    try {
      const canvas = await svgDataUrlToCanvas(shareState.capsule.imageDataUrl, 640, 480);
      const dataUrl = canvas.toDataURL('image/png');
      const filename = `wordcloud_${shareState.capsule.id.slice(0, 8)}.png`;
      downloadDataUrl(dataUrl, filename);
    } catch (err) {
      console.error('下载图片失败:', err);
    }
  };

  const handleGeneratePoster = async () => {
    if (!shareState) return;
    try {
      const dataUrl = await generatePoster(shareState.capsule);
      const filename = `poster_${shareState.capsule.id.slice(0, 8)}.png`;
      downloadDataUrl(dataUrl, filename);
    } catch (err) {
      console.error('生成海报失败:', err);
    }
  };

  if (capsules.length === 0) {
    return (
      <div className="timeline-section">
        <h2 className="timeline-title">时间胶囊</h2>
        <div className="empty-timeline">
          <div className="empty-timeline-icon">⏳</div>
          <div className="empty-timeline-text">还没有时间胶囊，生成第一个词云开始记录吧！</div>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-section">
      <h2 className="timeline-title">时间胶囊</h2>

      <div className="waterfall">
        {capsules.map((capsule, index) => (
          <div
            key={capsule.id}
            className="capsule-card"
            style={{
              animationDelay: mounted ? `${index * 0.05}s` : '0s',
            }}
            onClick={() => setSelectedCapsule(capsule)}
          >
            <div className="capsule-thumb">
              <img src={capsule.imageDataUrl} alt="词云预览" />
            </div>
            <div className="capsule-text">{truncateText(capsule.text, 100)}</div>
            {capsule.tags.length > 0 && (
              <div className="capsule-tags">
                {capsule.tags.map(tag => (
                  <span key={tag} className="capsule-tag">{tag}</span>
                ))}
              </div>
            )}
            <div className="capsule-footer">
              <div className="capsule-time">{formatTimestamp(capsule.timestamp)}</div>
              <button
                className="share-btn"
                onClick={(e) => handleShareClick(e, capsule)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedCapsule && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedCapsule(null)}
        >
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-wrapper">
              <button
                className="modal-close"
                onClick={() => setSelectedCapsule(null)}
              >
                ×
              </button>

              <img
                className="modal-image"
                src={selectedCapsule.imageDataUrl}
                alt="词云大图"
              />

              <div className="modal-full-text">{selectedCapsule.text}</div>

              {selectedCapsule.tags.length > 0 && (
                <div className="modal-tags">
                  {selectedCapsule.tags.map(tag => (
                    <span key={tag} className="capsule-tag">{tag}</span>
                  ))}
                </div>
              )}

              <div className="modal-time">
                记录于 {formatTimestamp(selectedCapsule.timestamp)}
              </div>
            </div>
          </div>
        </div>
      )}

      {shareVisible && shareState && (
        <div
          className={`share-overlay ${shareClosing ? 'closing' : ''}`}
          onClick={handleCloseShare}
        >
          <div
            ref={sharePanelRef}
            className="share-panel"
            onClick={e => e.stopPropagation()}
            onAnimationEnd={handleShareAnimationEnd}
          >
            <div className="share-header">
              <h3 className="share-title">分享胶囊</h3>
              <button
                className="share-close"
                onClick={handleCloseShare}
              >
                ×
              </button>
            </div>

            <div className="share-options">
              <button
                className={`share-option ${shareState.copied ? 'copied' : ''}`}
                onClick={handleCopyLink}
              >
                <div className="share-option-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                </div>
                <span className="share-option-text">
                  {shareState.copied ? '已复制' : '复制链接'}
                </span>
              </button>

              <button
                className="share-option"
                onClick={handleDownloadImage}
              >
                <div className="share-option-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </div>
                <span className="share-option-text">下载图片</span>
              </button>

              <button
                className="share-option"
                onClick={handleGeneratePoster}
              >
                <div className="share-option-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <span className="share-option-text">生成海报</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
