import React from 'react';
import { useGameStore, CollisionBodyType } from '../engine/GameStore';

interface ToolItem {
  type: CollisionBodyType;
  label: string;
  color: string;
  icon: string;
}

const TOOLS: ToolItem[] = [
  { type: 'ground', label: '地面', color: '#4CAF50', icon: '▬' },
  { type: 'wall', label: '墙壁', color: '#2196F3', icon: '▮' },
  { type: 'slope', label: '斜坡', color: '#FF9800', icon: '△' },
  { type: 'movingPlatform', label: '移动平台', color: '#9C27B0', icon: '↔' },
  { type: 'bouncePad', label: '弹射板', color: '#F44336', icon: '⬆' },
];

export const Toolbar: React.FC = () => {
  const setDragState = useGameStore((s) => s.setDragState);

  const handleDragStart = (e: React.DragEvent, type: CollisionBodyType) => {
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';
    setDragState({
      isDragging: true,
      bodyType: type,
      previewX: 800,
      previewY: 450,
    });
  };

  const handleDragEnd = () => {
    setDragState({
      isDragging: false,
      bodyType: null,
    });
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '56px',
        right: '12px',
        width: '220px',
        marginTop: '170px',
        background: 'rgba(26,26,46,0.95)',
        borderRadius: '8px',
        padding: '12px',
        border: '1px solid rgba(255,255,255,0.1)',
        zIndex: 90,
      }}
    >
      <div style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>
        碰撞体工具
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {TOOLS.map((tool) => (
          <div
            key={tool.type}
            draggable
            onDragStart={(e) => handleDragStart(e, tool.type)}
            onDragEnd={handleDragEnd}
            onClick={() => {
              setDragState({
                isDragging: true,
                bodyType: tool.type,
                previewX: 800,
                previewY: 450,
              });
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              cursor: 'grab',
              transition: 'background 0.2s, border-color 0.2s',
              userSelect: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.borderColor = tool.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: tool.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                color: '#fff',
                fontWeight: 'bold',
                flexShrink: 0,
              }}
            >
              {tool.icon}
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: '12px', fontWeight: 500 }}>{tool.label}</div>
              <div style={{ color: '#888', fontSize: '10px' }}>
                {tool.type === 'ground' && '静态矩形'}
                {tool.type === 'wall' && '垂直矩形'}
                {tool.type === 'slope' && '30°/45° 三角形'}
                {tool.type === 'movingPlatform' && '水平来回移动'}
                {tool.type === 'bouncePad' && '接触弹射'}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: '10px',
          padding: '8px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '6px',
          color: '#888',
          fontSize: '10px',
          lineHeight: '1.5',
        }}
      >
        点击工具后点击画布放置，或直接拖拽到画布上
      </div>
    </div>
  );
};
