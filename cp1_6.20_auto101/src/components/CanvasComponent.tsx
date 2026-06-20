import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ComponentType, getComponentMeta } from '../utils/layoutEngine';

interface CanvasComponentProps {
  type: ComponentType;
  width: number;
  height: number;
  onRemove: () => void;
}

const renderComponentContent = (type: ComponentType, _width: number, _height: number) => {
  const commonStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    color: '#4b5563',
    gap: 6,
    padding: '0 8px',
  };

  switch (type) {
    case 'button':
      return (
        <div style={commonStyle}>
          <span style={{
            background: '#4a90d9',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}>
            按钮
          </span>
        </div>
      );
    case 'input':
      return (
        <div style={{ ...commonStyle, padding: 8 }}>
          <div style={{
            width: '100%',
            border: '1px solid #d1d5db',
            borderRadius: 4,
            padding: '6px 10px',
            background: '#fff',
            color: '#9ca3af',
            fontSize: 12,
          }}>
            输入占位文本...
          </div>
        </div>
      );
    case 'card':
      return (
        <div style={{ ...commonStyle, flexDirection: 'column', padding: 10, alignItems: 'flex-start' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 4,
            background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
            marginBottom: 8,
          }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>卡片标题</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>卡片描述文本内容</div>
        </div>
      );
    case 'image':
      return (
        <div style={{ ...commonStyle, padding: 0 }}>
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 50%, #d1d5db 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 3,
          }}>
            <span style={{ fontSize: 24 }}>🖼️</span>
          </div>
        </div>
      );
    case 'alert':
      return (
        <div style={{ ...commonStyle, padding: '0 12px' }}>
          <div style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: '#fef3c7',
            borderRadius: 4,
            border: '1px solid #fcd34d',
          }}>
            <span>⚠️</span>
            <span style={{ fontSize: 12, color: '#92400e', flex: 1 }}>这是一条警告提示信息</span>
          </div>
        </div>
      );
    case 'navbar':
      return (
        <div style={{ ...commonStyle, padding: '0 12px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>Logo</span>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#4b5563' }}>
            <span>首页</span>
            <span>产品</span>
            <span>关于</span>
          </div>
        </div>
      );
    default:
      return null;
  }
};

const CanvasComponent: React.FC<CanvasComponentProps> = ({ type, width, height, onRemove }) => {
  const meta = getComponentMeta(type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        width,
        height,
        border: '1px solid #ddd',
        borderRadius: 4,
        background: 'rgba(248,249,250,0.8)',
        overflow: 'hidden',
      }}
    >
      {renderComponentContent(type, width, height)}

      <div
        style={{
          position: 'absolute',
          bottom: 2,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 10,
          color: '#6b7280',
          background: 'rgba(255,255,255,0.9)',
          padding: '1px 6px',
          borderRadius: 3,
        }}
      >
        {Math.round(width)}px
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        style={{
          position: 'absolute',
          top: 2,
          right: 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#ef4444',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          lineHeight: 1,
          opacity: 0.8,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
      >
        ×
      </button>

      <div
        style={{
          position: 'absolute',
          top: 2,
          left: 2,
          fontSize: 10,
          color: '#9ca3af',
          background: 'rgba(255,255,255,0.7)',
          padding: '1px 4px',
          borderRadius: 2,
        }}
      >
        {meta.name}
      </div>
    </motion.div>
  );
};

export default CanvasComponent;
