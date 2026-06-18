import { useEffect, useState } from 'react';
import type { Conflict } from '@/types';

interface ConflictBadgeProps {
  conflict: Conflict;
  onClose?: () => void;
}

export function ConflictBadge({ conflict, onClose }: ConflictBadgeProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
  }, [conflict.id]);

  if (!visible) return null;

  const isOverlap = conflict.type === 'overlap';
  const bgColor = isOverlap ? 'rgba(233, 69, 96, 0.95)' : 'rgba(255, 193, 7, 0.95)';
  const borderColor = isOverlap ? '#e94560' : '#ffc107';

  return (
    <div
      className="conflict-badge"
      style={{
        position: 'relative',
        background: bgColor,
        borderRadius: '10px',
        padding: '12px 16px',
        marginBottom: '8px',
        border: `1px solid ${borderColor}`,
        boxShadow: `0 4px 20px ${isOverlap ? 'rgba(233, 69, 96, 0.3)' : 'rgba(255, 193, 7, 0.3)'}`,
        backdropFilter: 'blur(10px)',
        animation: 'badgeSlideIn 0.3s ease-out',
        maxWidth: '100%',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '12px',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '4px',
            fontSize: '13px',
            fontWeight: 600,
            color: isOverlap ? '#fff' : '#000',
          }}>
            <span>{isOverlap ? '⚠️ 时间冲突' : '⏰ 间隔过短'}</span>
          </div>
          <div style={{
            fontSize: '12px',
            color: isOverlap ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)',
            lineHeight: 1.5,
            marginBottom: '6px',
          }}>
            {conflict.message}
          </div>
          <div style={{
            fontSize: '11px',
            color: isOverlap ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)',
            padding: '6px 10px',
            background: isOverlap ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)',
            borderRadius: '6px',
            lineHeight: 1.4,
          }}>
            💡 {conflict.suggestion}
          </div>
        </div>
        {onClose && (
          <button
            onClick={() => {
              setVisible(false);
              onClose();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: isOverlap ? '#fff' : '#000',
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: 1,
              padding: '2px 6px',
              borderRadius: '4px',
              opacity: 0.7,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
