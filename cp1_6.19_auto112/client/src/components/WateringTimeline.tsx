import { memo } from 'react';
import { Log } from '../types';

interface WateringTimelineProps {
  logs: Log[];
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) {
    const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `${diffMins} 分钟前`;
  }
  if (diffHours < 24) {
    return `${diffHours} 小时前`;
  }
  if (diffDays < 7) {
    return `${diffDays} 天前`;
  }
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function WateringTimelineInner({ logs }: WateringTimelineProps) {
  if (logs.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: 'var(--text-muted)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
        <p>暂无浇水或施肥记录</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 32 }}>
      <div style={{
        position: 'absolute',
        left: 14,
        top: 8,
        bottom: 8,
        width: 2,
        background: 'linear-gradient(180deg, var(--primary-green-light), #C8E6C9)',
        borderRadius: 2,
      }} />
      {logs.map((log, index) => (
        <div
          key={log.id}
          className="slide-in"
          style={{
            position: 'relative',
            marginBottom: 20,
            animationDelay: `${index * 50}ms`,
          }}
        >
          <div style={{
            position: 'absolute',
            left: -32,
            top: 4,
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: log.type === 'water' ? 'var(--primary-green)' : '#FF9800',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}>
            <i className={`fas ${log.type === 'water' ? 'fa-tint' : 'fa-seedling'}`} />
          </div>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius)',
            padding: 14,
            boxShadow: 'var(--shadow-soft)',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-green)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-card)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{
                fontWeight: 600,
                fontSize: 14,
                color: log.type === 'water' ? 'var(--primary-green-dark)' : '#E65100',
              }}>
                {log.type === 'water' ? '💧 浇水' : '🌾 施肥'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {formatTime(log.timestamp)}
              </span>
            </div>
            {log.note && (
              <p style={{ fontSize: 13, color: 'var(--text-dark)', margin: 0, lineHeight: 1.5 }}>
                {log.note}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export const WateringTimeline = memo(WateringTimelineInner);
export default WateringTimeline;
