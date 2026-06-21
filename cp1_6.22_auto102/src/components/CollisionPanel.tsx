import React from 'react';
import { Conflict, GraphNode } from '../types';

interface CollisionPanelProps {
  conflicts: Conflict[];
  nodes: GraphNode[];
  selectedConflictId: string | null;
  collapsed: boolean;
  onConflictClick: (conflict: Conflict) => void;
  onToggleCollapse: () => void;
}

const CollisionPanel: React.FC<CollisionPanelProps> = ({
  conflicts,
  nodes,
  selectedConflictId,
  collapsed,
  onConflictClick,
  onToggleCollapse,
}) => {
  const getNodeTitle = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? node.title : '未知节点';
  };

  if (collapsed) {
    return (
      <div
        className="sidebar-right panel-slide"
        style={{
          width: 280,
          height: 60,
          backgroundColor: '#2d3748',
          borderLeft: '1px solid #4a5568',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          cursor: 'pointer',
          gap: 12,
        }}
        onClick={onToggleCollapse}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: '#e53e3e',
            animation: conflicts.length > 0 ? 'pulse-red 0.5s ease-in-out infinite' : 'none',
          }}
        />
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
          冲突检测 ({conflicts.length})
        </span>
        <div style={{ flex: 1 }} />
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className="sidebar-right panel-slide"
      style={{
        width: 280,
        backgroundColor: '#2d3748',
        borderLeft: '1px solid #4a5568',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #4a5568',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: '#e53e3e',
            animation: conflicts.length > 0 ? 'pulse-red 0.5s ease-in-out infinite' : 'none',
          }}
        />
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', flex: 1 }}>
          冲突检测
        </span>
        <span style={{ color: '#e53e3e', fontSize: 12, fontWeight: 'bold' }}>
          {conflicts.length}
        </span>
        <button
          onClick={onToggleCollapse}
          style={{
            background: 'none',
            border: 'none',
            color: '#a0aec0',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 8,
        }}
      >
        {conflicts.length === 0 ? (
          <div
            style={{
              color: '#718096',
              fontSize: 13,
              textAlign: 'center',
              padding: '40px 16px',
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            暂无冲突
            <br />
            <span style={{ fontSize: 11, color: '#4a5568' }}>
              当节点间存在语义冲突时将在此显示
            </span>
          </div>
        ) : (
          conflicts.map((conflict) => {
            const isSelected = selectedConflictId === conflict.linkId;
            return (
              <div
                key={conflict.id}
                onClick={() => onConflictClick(conflict)}
                style={{
                  height: 60,
                  padding: '8px 12px',
                  marginBottom: 6,
                  backgroundColor: isSelected ? '#4a5568' : '#1a202c',
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  borderLeft: `3px solid ${isSelected ? '#e53e3e' : 'transparent'}`,
                  transition: 'background-color 0.2s ease, border-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#2d3748';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#1a202c';
                  }
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#e53e3e',
                    flexShrink: 0,
                    animation: 'pulse-red 0.5s ease-in-out infinite',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginBottom: 4,
                    }}
                    title={`${getNodeTitle(conflict.sourceId)} ↔ ${getNodeTitle(conflict.targetId)}`}
                  >
                    {getNodeTitle(conflict.sourceId)} ↔ {getNodeTitle(conflict.targetId)}
                  </div>
                  <div
                    style={{
                      color: '#a0aec0',
                      fontSize: 10,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={conflict.description}
                  >
                    {conflict.description}
                  </div>
                </div>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#718096"
                  strokeWidth="2"
                  style={{ flexShrink: 0 }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #4a5568',
          fontSize: 10,
          color: '#718096',
          lineHeight: 1.5,
        }}
      >
        提示：点击冲突条目可定位对应连线
        <br />
        右键连线可删除关联
      </div>
    </div>
  );
};

export default CollisionPanel;
