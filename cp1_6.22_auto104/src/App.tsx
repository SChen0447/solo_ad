import React, { useState, useEffect, useCallback } from 'react';
import MapView from './components/MapView';
import CatInfoCard from './components/CatInfoCard';
import type { CatPoint, Feedback } from './types';

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

const STATUS_LABELS: Record<string, { text: string; color: string; bg: string }> = {
  healthy: { text: '健康', color: '#38a169', bg: '#c6f6d5' },
  injured: { text: '受伤', color: '#e53e3e', bg: '#fed7d7' },
  needsAdoption: { text: '待领养', color: '#d69e2e', bg: '#fefcbf' },
  spayed: { text: '已绝育', color: '#3182ce', bg: '#bee3f8' },
};

export default function App() {
  const [catPoints, setCatPoints] = useState<CatPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<CatPoint | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showNewCatTip, setShowNewCatTip] = useState(false);
  const [showRescueTip, setShowRescueTip] = useState(false);

  const fetchCatPoints = useCallback(async () => {
    try {
      const res = await fetch('/api/cat-points');
      if (res.ok) {
        const data = await res.json();
        const withFeedbacks: CatPoint[] = await Promise.all(
          data.map(async (p: CatPoint & { feedbackCount?: number }) => {
            try {
              const fbRes = await fetch(`/api/cat-points/${p.id}/feedbacks`);
              if (fbRes.ok) {
                const feedbacks: Feedback[] = await fbRes.json();
                return { ...p, feedbacks };
              }
            } catch {
            }
            return { ...p, feedbacks: [] };
          })
        );
        setCatPoints(withFeedbacks);
      }
    } catch {
      setCatPoints([]);
    }
  }, []);

  useEffect(() => {
    fetchCatPoints();
  }, [fetchCatPoints]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleSelectPoint = useCallback((point: CatPoint) => {
    setSelectedPoint(point);
    fetch(`/api/cat-points/${point.id}/read`, { method: 'PUT' }).catch(() => {});
  }, []);

  const handleFeedbackSubmitted = useCallback(() => {
    fetchCatPoints();
  }, [fetchCatPoints]);

  return (
    <div style={{ minHeight: '100vh', background: '#fef9f0' }}>
      <header
        style={{
          width: '100%',
          height: 60,
          background: 'linear-gradient(90deg, #f687b3, #ffd1a3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          boxShadow: '0 2px 12px rgba(246,135,179,0.3)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <button
          onClick={() => setShowNewCatTip(true)}
          onMouseLeave={() => setShowNewCatTip(false)}
          style={{
            width: 42,
            height: 42,
            borderRadius: 24,
            border: '3px solid #fff',
            background: '#fff',
            cursor: 'pointer',
            fontSize: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          🐱
          {showNewCatTip && (
            <span
              style={{
                position: 'absolute',
                bottom: -32,
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#5a3e2b',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 12,
                whiteSpace: 'nowrap',
              }}
            >
              我找到一只新猫
            </span>
          )}
        </button>

        <h1
          style={{
            color: '#fff',
            fontSize: 20,
            fontWeight: 800,
            textShadow: '0 1px 4px rgba(0,0,0,0.15)',
            letterSpacing: 2,
          }}
        >
          🐾 街角喵声
        </h1>

        <button
          onClick={() => setShowRescueTip(true)}
          onMouseLeave={() => setShowRescueTip(false)}
          style={{
            width: 42,
            height: 42,
            borderRadius: 24,
            border: '3px solid #fff',
            background: '#fff',
            cursor: 'pointer',
            fontSize: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          🏠
          {showRescueTip && (
            <span
              style={{
                position: 'absolute',
                bottom: -32,
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#5a3e2b',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: 8,
                fontSize: 12,
                whiteSpace: 'nowrap',
              }}
            >
              查看最近的救助动态
            </span>
          )}
        </button>
      </header>

      <main style={{ padding: isMobile ? 12 : 20 }}>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {catPoints.map((point) => (
              <div
                key={point.id}
                onClick={() => handleSelectPoint(point)}
                style={{
                  background: 'linear-gradient(135deg, #fef9f0, #fdebd0)',
                  borderRadius: 16,
                  padding: 16,
                  cursor: 'pointer',
                  border: point.hasNewUpdate ? '2px solid #e53e3e' : '2px solid #fed7aa',
                  boxShadow: point.hasNewUpdate
                    ? '0 2px 12px rgba(229,62,62,0.2)'
                    : '0 2px 8px rgba(0,0,0,0.06)',
                  transition: 'transform 150ms ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ fontSize: 16, color: '#5a3e2b', fontWeight: 700 }}>
                    🐾 {point.name}
                    {point.hasNewUpdate && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#e53e3e',
                          marginLeft: 6,
                          verticalAlign: 'middle',
                        }}
                      />
                    )}
                  </h3>
                  <span style={{ fontSize: 12, color: '#9b7e65' }}>
                    {point.catCount}只猫咪
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {point.images.slice(0, 3).map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`猫${i + 1}`}
                      loading="lazy"
                      style={{
                        width: 'calc(33.33% - 4px)',
                        aspectRatio: '1',
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '2px solid #fed7aa',
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#9b7e65' }}>
                  上次投喂: {formatTimeAgo(point.lastFedAt)}
                  {point.feedbacks.length > 0 && (
                    <span style={{ marginLeft: 8 }}>
                      | {point.feedbacks.length}条反馈
                    </span>
                  )}
                </div>
                {point.feedbacks.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {point.feedbacks.slice(0, 3).map((fb) => {
                      const sl = STATUS_LABELS[fb.status];
                      return (
                        <span
                          key={fb.id}
                          style={{
                            fontSize: 11,
                            padding: '1px 8px',
                            borderRadius: 10,
                            color: sl.color,
                            background: sl.bg,
                            fontWeight: 600,
                          }}
                        >
                          {sl.text}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <MapView catPoints={catPoints} onSelectPoint={handleSelectPoint} />
        )}
      </main>

      <CatInfoCard
        point={selectedPoint}
        onClose={() => setSelectedPoint(null)}
        onFeedbackSubmitted={handleFeedbackSubmitted}
      />
    </div>
  );
}
