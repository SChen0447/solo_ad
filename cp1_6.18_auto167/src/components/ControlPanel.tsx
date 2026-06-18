import { useRef, useState } from 'react';
import { useTimelineStore } from '@/core/store';
import { getMoodColor } from '@/core/stats';
import type { StatsResult } from '@/types';

function StatsModal({ stats }: { stats: StatsResult }) {
  const toggleStats = useTimelineStore((s) => s.toggleStats);
  const maxEvent = Math.max(1, ...stats.eventFrequency.map((p) => p.count));

  const moodPoints = stats.moodTrend.map((p, i, arr) => {
    const x = (i / Math.max(1, arr.length - 1)) * 100;
    const y = p.mood !== null ? 100 - ((p.mood - 1) / 9) * 100 : null;
    return { x, y, mood: p.mood, date: p.date };
  });

  const linePath = moodPoints
    .filter((p) => p.y !== null)
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const areaPath = (() => {
    const valid = moodPoints.filter((p) => p.y !== null);
    if (valid.length < 2) return '';
    const first = valid[0];
    const last = valid[valid.length - 1];
    const line = valid.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return `${line} L ${last.x} 100 L ${first.x} 100 Z`;
  })();

  return (
    <div
      onClick={toggleStats}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(26, 35, 50, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.1)',
          padding: 28,
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: '#e0e6ed', fontWeight: 700 }}>📊 数据统计</h2>
          <button
            onClick={toggleStats}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#e0e6ed',
              width: 36,
              height: 36,
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
              e.currentTarget.style.borderColor = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>平均心情</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: getMoodColor(stats.moodAverage ? Math.round(stats.moodAverage) : null) }}>
              {stats.moodAverage !== null ? stats.moodAverage.toFixed(1) : '--'}
            </div>
          </div>
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>连续记录</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#f59e0b' }}>{stats.streak} 天</div>
          </div>
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>总条目</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#60a5fa' }}>{stats.totalEntries}</div>
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#e0e6ed', fontWeight: 600 }}>📈 近30天心情趋势</h3>
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 12,
              padding: 16,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 180 }}>
              {[1, 3, 5, 7, 9].map((v) => (
                <line
                  key={v}
                  x1="0"
                  x2="100"
                  y1={100 - ((v - 1) / 9) * 100}
                  y2={100 - ((v - 1) / 9) * 100}
                  stroke="rgba(148,163,184,0.1)"
                  strokeWidth="0.3"
                />
              ))}
              {areaPath && <path d={areaPath} fill="url(#moodGradient)" opacity="0.3" />}
              {linePath && (
                <path d={linePath} fill="none" stroke="url(#lineGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              )}
              {moodPoints
                .filter((p) => p.y !== null)
                .map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y as number}
                    r="1.5"
                    fill={getMoodColor(p.mood)}
                  />
                ))}
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
                <linearGradient id="moodGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#64748b' }}>
              <span>30天前</span>
              <span>今天</span>
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#e0e6ed', fontWeight: 600 }}>📅 事件频率分布</h3>
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 12,
              padding: 16,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 140 }}>
              {stats.eventFrequency.map((p, i) => {
                const h = (p.count / maxEvent) * 100;
                return (
                  <div
                    key={i}
                    title={`${p.date}: ${p.count} 条`}
                    style={{
                      flex: 1,
                      background: `linear-gradient(to top, rgba(96, 165, 250, 0.8), rgba(96, 165, 250, 0.3))`,
                      borderRadius: '3px 3px 0 0',
                      minWidth: 3,
                      height: `${Math.max(h, 2)}%`,
                      transition: 'all 0.25s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to top, rgba(96, 165, 250, 1), rgba(96, 165, 250, 0.5))';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(to top, rgba(96, 165, 250, 0.8), rgba(96, 165, 250, 0.3))';
                    }}
                  />
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#64748b' }}>
              <span>30天前</span>
              <span>今天</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ControlPanel() {
  const toggleStats = useTimelineStore((s) => s.toggleStats);
  const showStats = useTimelineStore((s) => s.showStats);
  const getStats = useTimelineStore((s) => s.getStats);
  const exportData = useTimelineStore((s) => s.exportData);
  const showExportAnimation = useTimelineStore((s) => s.showExportAnimation);
  const setShowExportAnimation = useTimelineStore((s) => s.setShowExportAnimation);

  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const [animPos, setAnimPos] = useState<{ x: number; y: number } | null>(null);

  const handleJumpToToday = () => {
    const store = useTimelineStore.getState() as unknown as { jumpToToday?: () => void };
    store.jumpToToday?.();
  };

  const handleExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-trail-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    if (exportBtnRef.current) {
      const rect = exportBtnRef.current.getBoundingClientRect();
      setAnimPos({ x: rect.left + rect.width / 2, y: rect.top });
      setShowExportAnimation(true);
      setTimeout(() => {
        setShowExportAnimation(false);
        setAnimPos(null);
      }, 400);
    }
  };

  const stats = showStats ? getStats() : null;

  const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#e0e6ed',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.25s ease',
    whiteSpace: 'nowrap',
  };

  return (
    <>
      <div
        className="control-panel glass"
        style={{
          position: 'fixed',
          left: 20,
          bottom: 20,
          padding: 12,
          borderRadius: 16,
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <button
          onClick={handleJumpToToday}
          style={btnStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(96, 165, 250, 0.25)';
            e.currentTarget.style.borderColor = '#60a5fa';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
          }}
        >
          <span>📍</span> 回到今天
        </button>
        <button
          onClick={toggleStats}
          style={btnStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(245, 158, 11, 0.25)';
            e.currentTarget.style.borderColor = '#f59e0b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
          }}
        >
          <span>📊</span> 统计面板
        </button>
        <button
          ref={exportBtnRef}
          onClick={handleExport}
          style={btnStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)';
            e.currentTarget.style.borderColor = '#10b981';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
          }}
        >
          <span>💾</span> 导出数据
        </button>
      </div>

      {showExportAnimation && animPos && (
        <div
          style={{
            position: 'fixed',
            left: animPos.x,
            top: animPos.y,
            fontSize: 32,
            pointerEvents: 'none',
            zIndex: 400,
            animation: 'exportFly 0.4s ease-out forwards',
          }}
        >
          📄
        </div>
      )}

      {showStats && stats && <StatsModal stats={stats} />}
    </>
  );
}
