import React from 'react';
import { motion } from 'framer-motion';
import { LayoutSnapshot } from '../utils/layoutEngine';

interface PropertyPanelProps {
  snapshots: LayoutSnapshot[];
  maxSnapshots: number;
  onSaveSnapshot: () => void;
  onDeleteSnapshot: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
};

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  snapshots,
  maxSnapshots,
  onSaveSnapshot,
  onDeleteSnapshot,
  collapsed,
  onToggle,
  isMobile,
}) => {
  const panelStyle: React.CSSProperties = isMobile
    ? { width: '100%', background: '#f5f7fa', borderTop: collapsed ? '1px solid #e5e7eb' : 'none' }
    : { width: 240, background: '#f5f7fa', borderLeft: '1px solid #e5e7eb', flexShrink: 0 };

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
        <span>快照管理</span>
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
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', flex: 1 }}>
          <button
            onClick={onSaveSnapshot}
            disabled={snapshots.length >= maxSnapshots}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: snapshots.length >= maxSnapshots ? '#d1d5db' : '#4a90d9',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: snapshots.length >= maxSnapshots ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 500,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              if (snapshots.length < maxSnapshots) {
                e.currentTarget.style.background = '#3a7bc8';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = snapshots.length >= maxSnapshots ? '#d1d5db' : '#4a90d9';
            }}
          >
            保存快照 ({snapshots.length}/{maxSnapshots})
          </button>

          <div style={{ fontSize: 12, color: '#6b7280', marginTop: -4 }}>
            {snapshots.length >= maxSnapshots
              ? '已达到最大快照数量，请删除后再保存'
              : '保存当前布局和容器尺寸为快照'}
          </div>

          <div style={{ height: 1, background: '#e5e7eb', margin: '4px 0' }} />

          <div style={{ fontWeight: 500, fontSize: 13, color: '#374151' }}>
            已保存快照 ({snapshots.length})
          </div>

          {snapshots.length === 0 ? (
            <div style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', padding: 20 }}>
              暂无快照，点击上方按钮保存
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {snapshots.map((snapshot, index) => (
                <div
                  key={snapshot.id}
                  style={{
                    background: '#fff',
                    borderRadius: 6,
                    padding: 10,
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1f2937' }}>
                      快照 #{index + 1}
                    </span>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>
                      {formatTime(snapshot.timestamp)} · {snapshot.containerWidth}px · {snapshot.components.length}个组件
                    </span>
                  </div>
                  <button
                    onClick={() => onDeleteSnapshot(snapshot.id)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background: '#fef2f2',
                      color: '#ef4444',
                      border: '1px solid #fecaca',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fee2e2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fef2f2';
                    }}
                    title="删除快照"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PropertyPanel;
