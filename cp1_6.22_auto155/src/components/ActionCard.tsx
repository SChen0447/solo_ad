import React, { useState } from 'react';
import { Action } from '../types';

interface ActionCardProps {
  action: Action;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, action: Action) => void;
  compact?: boolean;
}

const ActionCard: React.FC<ActionCardProps> = ({ action, draggable = false, onDragStart, compact = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < count ? '#f59e0b' : '#cbd5e1' }}>
        ★
      </span>
    ));
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(e, action);
    }
  };

  if (compact) {
    return (
      <div
        draggable={draggable}
        onDragStart={handleDragStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(8px)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          cursor: draggable ? 'grab' : 'pointer',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '14px' }}>{action.name}</span>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{action.muscle} · {action.duration}秒</span>
        </div>
        <div style={{ display: 'flex', gap: '2px' }}>
          {renderStars(action.difficulty)}
        </div>
      </div>
    );
  }

  return (
    <div
      draggable={draggable}
      onDragStart={handleDragStart}
      onClick={() => setIsExpanded(!isExpanded)}
      style={{
        width: '280px',
        minHeight: '180px',
        borderRadius: '12px',
        background: '#f1f5f9',
        padding: '16px',
        cursor: draggable ? 'grab' : 'pointer',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)';
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
          {action.name}
        </h3>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '12px',
            background: '#3b82f6',
            color: 'white',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          {action.muscle}
        </span>
      </div>

      <div
        style={{
          width: '100%',
          height: '80px',
          background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          fontSize: '14px',
        }}
      >
        🎬 GIF演示
      </div>

      <div
        style={{
          overflow: 'hidden',
          height: isExpanded ? '100px' : '0px',
          transition: 'height 0.3s ease-out',
        }}
      >
        <div
          style={{
            background: '#e2e8f0',
            borderRadius: '8px',
            padding: '12px',
            marginTop: '0px',
          }}
        >
          <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 8px 0', lineHeight: 1.5 }}>
            {action.description}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '2px', fontSize: '14px' }}>
              {renderStars(action.difficulty)}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {action.sets}组 · {action.duration}秒
            </div>
          </div>
        </div>
      </div>

      {!isExpanded && (
        <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: 'auto' }}>
          点击展开详情
        </div>
      )}
    </div>
  );
};

export default ActionCard;
