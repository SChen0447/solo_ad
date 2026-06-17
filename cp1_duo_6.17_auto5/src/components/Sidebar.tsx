import React, { useState } from 'react';
import { useCanvasStore } from '../frontend/store';
import { PRESET_COLORS, NodeStyle } from '../frontend/types';

interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  onClose?: () => void;
}

type BounceButtonStyle = React.CSSProperties & {
  _transition?: string;
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, isMobile, onClose }) => {
  const { currentStyle, setCurrentStyle, zoom, setZoom } = useCanvasStore();
  const [bouncingButton, setBouncingButton] = useState<string | null>(null);

  const handleButtonPress = (buttonId: string) => {
    setBouncingButton(buttonId);
    setTimeout(() => setBouncingButton(null), 150);
  };

  const baseButtonStyle: BounceButtonStyle = {
    transition: 'transform 0.15s ease-out',
    cursor: 'pointer',
    outline: 'none',
  };

  const getBounceStyle = (buttonId: string): React.CSSProperties => {
    if (bouncingButton === buttonId) {
      return { transform: 'scale(0.92)' };
    }
    return { transform: 'scale(1)' };
  };

  const handleShapeSelect = (shape: NodeStyle['shape']) => {
    handleButtonPress(`shape-${shape}`);
    setCurrentStyle({ shape });
  };

  const handleColorSelect = (color: string) => {
    handleButtonPress(`color-${color}`);
    setCurrentStyle({ fillColor: color });
  };

  const handleArrowSelect = (arrowType: NodeStyle['arrowType']) => {
    handleButtonPress(`arrow-${arrowType}`);
    setCurrentStyle({ arrowType });
  };

  const handleZoomIn = () => {
    handleButtonPress('zoom-in');
    setZoom(Math.min(zoom + 0.2, 5));
  };

  const handleZoomOut = () => {
    handleButtonPress('zoom-out');
    setZoom(Math.max(zoom - 0.2, 0.5));
  };

  if (isMobile && !isOpen) {
    return null;
  }

  return (
    <div
      style={{
        width: isMobile ? 200 : 220,
        backgroundColor: '#fff',
        borderRight: isMobile ? 'none' : '1px solid #e0e0e0',
        padding: 16,
        overflowY: 'auto',
        position: isMobile ? 'absolute' : 'relative',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: isMobile ? 20 : 1,
        boxShadow: isMobile ? '2px 0 8px rgba(0, 0, 0, 0.1)' : 'none',
      }}
    >
      {isMobile && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#333',
            }}
          >
            工具栏
          </h3>
          <button
            onClick={onClose}
            style={{
              ...baseButtonStyle,
              ...getBounceStyle('close'),
              width: 28,
              height: 28,
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#f5f5f5',
              cursor: 'pointer',
              fontSize: 16,
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseDown={() => handleButtonPress('close')}
          >
            ×
          </button>
        </div>
      )}

      <h3
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#333',
          marginBottom: 12,
        }}
      >
        节点形状
      </h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => handleShapeSelect('rectangle')}
          style={{
            ...baseButtonStyle,
            ...getBounceStyle('shape-rectangle'),
            flex: 1,
            padding: '10px',
            borderRadius: 8,
            border: currentStyle.shape === 'rectangle' ? '2px solid #45B7D1' : '1px solid #ddd',
            backgroundColor: currentStyle.shape === 'rectangle' ? '#f0f7fa' : '#fff',
            cursor: 'pointer',
            fontSize: 24,
            color: currentStyle.shape === 'rectangle' ? '#45B7D1' : '#666',
          }}
          onMouseDown={() => handleButtonPress('shape-rectangle')}
        >
          ▢
        </button>
        <button
          onClick={() => handleShapeSelect('circle')}
          style={{
            ...baseButtonStyle,
            ...getBounceStyle('shape-circle'),
            flex: 1,
            padding: '10px',
            borderRadius: 8,
            border: currentStyle.shape === 'circle' ? '2px solid #45B7D1' : '1px solid #ddd',
            backgroundColor: currentStyle.shape === 'circle' ? '#f0f7fa' : '#fff',
            cursor: 'pointer',
            fontSize: 24,
            color: currentStyle.shape === 'circle' ? '#45B7D1' : '#666',
          }}
          onMouseDown={() => handleButtonPress('shape-circle')}
        >
          ●
        </button>
      </div>

      <h3
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#333',
          marginBottom: 12,
        }}
      >
        填充颜色
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          marginBottom: 24,
        }}
      >
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => handleColorSelect(color)}
            style={{
              ...baseButtonStyle,
              ...getBounceStyle(`color-${color}`),
              width: '100%',
              aspectRatio: '1' as const,
              borderRadius: 8,
              backgroundColor: color,
              border: currentStyle.fillColor === color ? '3px solid #333' : '2px solid transparent',
              cursor: 'pointer',
              boxShadow: currentStyle.fillColor === color ? '0 0 0 2px rgba(0,0,0,0.1)' : 'none',
            }}
            onMouseDown={() => handleButtonPress(`color-${color}`)}
          />
        ))}
      </div>

      <h3
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#333',
          marginBottom: 12,
        }}
      >
        连线箭头
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {[
          { value: 'none' as const, label: '无箭头', icon: '—' },
          { value: 'one-way' as const, label: '单向箭头', icon: '→' },
          { value: 'two-way' as const, label: '双向箭头', icon: '↔' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => handleArrowSelect(option.value)}
            style={{
              ...baseButtonStyle,
              ...getBounceStyle(`arrow-${option.value}`),
              padding: '10px 12px',
              borderRadius: 8,
              border: currentStyle.arrowType === option.value ? '2px solid #45B7D1' : '1px solid #ddd',
              backgroundColor: currentStyle.arrowType === option.value ? '#f0f7fa' : '#fff',
              cursor: 'pointer',
              fontSize: 13,
              color: '#333',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onMouseDown={() => handleButtonPress(`arrow-${option.value}`)}
          >
            <span style={{ fontSize: 18, width: 20, textAlign: 'center', color: currentStyle.arrowType === option.value ? '#45B7D1' : '#666' }}>
              {option.icon}
            </span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      <h3
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#333',
          marginBottom: 12,
        }}
      >
        画布缩放
      </h3>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          backgroundColor: '#f5f5f5',
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <button
          onClick={handleZoomOut}
          style={{
            ...baseButtonStyle,
            ...getBounceStyle('zoom-out'),
            width: 32,
            height: 32,
            borderRadius: 6,
            border: 'none',
            backgroundColor: '#fff',
            cursor: 'pointer',
            fontSize: 18,
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseDown={() => handleButtonPress('zoom-out')}
        >
          −
        </button>
        <span style={{ fontSize: 13, color: '#666', minWidth: 48, textAlign: 'center', fontWeight: 500 }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          style={{
            ...baseButtonStyle,
            ...getBounceStyle('zoom-in'),
            width: 32,
            height: 32,
            borderRadius: 6,
            border: 'none',
            backgroundColor: '#fff',
            cursor: 'pointer',
            fontSize: 18,
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseDown={() => handleButtonPress('zoom-in')}
        >
          +
        </button>
      </div>

      <div
        style={{
          padding: 12,
          backgroundColor: '#f9f9f9',
          borderRadius: 8,
          fontSize: 12,
          color: '#888',
          lineHeight: 1.6,
        }}
      >
        <p style={{ marginBottom: 8, fontWeight: 500, color: '#666' }}>操作提示</p>
        <p>• 双击画布创建节点</p>
        <p>• 拖拽移动节点</p>
        <p>• 右键节点创建连线</p>
        <p>• Delete 删除选中项</p>
        <p>• 滚轮缩放画布</p>
        <p>• 空白处拖拽平移</p>
      </div>
    </div>
  );
};
