import React from 'react';
import { motion } from 'framer-motion';
import { COMPONENT_METAS, ComponentType } from '../utils/layoutEngine';

interface ComponentPanelProps {
  onAddComponent: (type: ComponentType) => void;
  collapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
}

const ComponentPanel: React.FC<ComponentPanelProps> = ({ onAddComponent, collapsed, onToggle, isMobile }) => {
  const handleDragStart = (e: React.DragEvent, type: ComponentType) => {
    e.dataTransfer.setData('componentType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const panelStyle: React.CSSProperties = isMobile
    ? { width: '100%', background: '#f5f7fa', borderBottom: collapsed ? '1px solid #e5e7eb' : 'none' }
    : { width: 220, background: '#f5f7fa', borderRight: '1px solid #e5e7eb', flexShrink: 0, display: collapsed ? 'none' : 'flex' };

  return (
    <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          fontWeight: 600,
          fontSize: 14,
          color: '#374151',
        }}
      >
        <span>组件库</span>
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
          }}
        >
          <motion.span
            animate={{ rotate: collapsed ? 0 : 90 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'inline-block',
              fontSize: 12,
              color: '#6b7280',
            }}
          >
            ▶
          </motion.span>
        </button>
      </div>

      {!collapsed && (
        <div
          style={{
            padding: 12,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {COMPONENT_METAS.map((meta) => (
            <motion.div
              key={meta.type}
              draggable
              onDragStart={(e) => handleDragStart(e, meta.type)}
              onClick={() => onAddComponent(meta.type)}
              whileHover={{ scale: 1.05, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: '#ffffff',
                borderRadius: 8,
                padding: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: 'grab',
                userSelect: 'none',
                minHeight: 72,
              }}
            >
              <span style={{ fontSize: 24 }}>{meta.icon}</span>
              <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 500 }}>{meta.name}</span>
              <span style={{ fontSize: 10, color: '#9ca3af' }}>{meta.minWidth}×{meta.defaultHeight}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComponentPanel;
