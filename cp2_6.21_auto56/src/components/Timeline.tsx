import { useState, useEffect } from 'react';
import type { Capsule } from '../api/timeline';

interface TimelineProps {
  capsules: Capsule[];
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

export default function Timeline({ capsules }: TimelineProps) {
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedCapsule) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedCapsule]);

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
            <div className="capsule-time">{formatTimestamp(capsule.timestamp)}</div>
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
    </div>
  );
}
