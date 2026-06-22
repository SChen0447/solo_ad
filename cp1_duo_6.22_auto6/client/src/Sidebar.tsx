import React, { useState } from 'react';
import type { GroupResult, Snapshot } from './App';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  groupResult: GroupResult | null;
  onGroupSelected: () => void;
  selectedCount: number;
  snapshots: Snapshot[];
  onSnapshotReplay: (state: Snapshot['state']) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  open,
  onToggle,
  groupResult,
  onGroupSelected,
  selectedCount,
  snapshots,
  onSnapshotReplay,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  const toggleGroup = (idx: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const sidebarStyle: React.CSSProperties = {
    width: open ? 300 : 48,
    height: '100%',
    background: 'rgba(12, 18, 32, 0.92)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderLeft: '1px solid rgba(0, 229, 255, 0.12)',
    transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    flexShrink: 0,
  };

  const toggleBtnStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: '1px solid rgba(0, 229, 255, 0.25)',
    background: 'rgba(0, 229, 255, 0.08)',
    color: '#00e5ff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    transition: 'all 0.2s',
    margin: '8px auto 0',
  };

  const headerStyle: React.CSSProperties = {
    padding: '16px',
    borderBottom: '1px solid rgba(0, 229, 255, 0.08)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 600,
    color: '#00e5ff',
    marginBottom: 4,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#5a7088',
  };

  const groupBtnStyle: React.CSSProperties = {
    padding: '10px 16px',
    margin: '12px 16px',
    width: 'calc(100% - 32px)',
    borderRadius: 10,
    border: `1px solid ${selectedCount >= 2 ? 'rgba(0, 229, 255, 0.4)' : 'rgba(0, 229, 255, 0.15)'}`,
    background: selectedCount >= 2 ? 'rgba(0, 229, 255, 0.12)' : 'rgba(0, 229, 255, 0.04)',
    color: selectedCount >= 2 ? '#00e5ff' : '#445566',
    cursor: selectedCount >= 2 ? 'pointer' : 'not-allowed',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.25s',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: open ? '0' : '0',
    opacity: open ? 1 : 0,
    transition: 'opacity 0.25s',
    pointerEvents: open ? 'auto' : 'none',
  };

  return (
    <div style={sidebarStyle}>
      <div style={toggleBtnStyle} onClick={onToggle}>
        {open ? '▸' : '◂'}
      </div>

      <div style={contentStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>智能助手</div>
          <div style={subtitleStyle}>选中便签后点击聚合按钮进行分组</div>
        </div>

        <button
          style={groupBtnStyle}
          onClick={onGroupSelected}
          disabled={selectedCount < 2}
        >
          ✦ 聚合分析{selectedCount > 0 ? ` (${selectedCount}个已选)` : ''}
        </button>

        {groupResult && groupResult.groups.length > 0 && (
          <div style={{ padding: '0 12px 12px' }}>
            <div
              style={{
                fontSize: 11,
                color: '#5a7088',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              分组结果
            </div>
            {groupResult.groups.map((group, idx) => {
              const isExpanded = expandedGroups.has(idx);
              return (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(0, 229, 255, 0.04)',
                    border: '1px solid rgba(0, 229, 255, 0.1)',
                    borderRadius: 10,
                    marginBottom: 8,
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <div
                    onClick={() => toggleGroup(idx)}
                    style={{
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        'rgba(0, 229, 255, 0.06)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, color: '#c0d8e8', fontWeight: 500 }}>
                        {group.theme}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: '#4a6070',
                          marginTop: 2,
                          display: 'flex',
                          gap: 4,
                          flexWrap: 'wrap',
                        }}
                      >
                        {group.keywords.slice(0, 4).map((kw, ki) => (
                          <span
                            key={ki}
                            style={{
                              background: 'rgba(0, 229, 255, 0.1)',
                              border: '1px solid rgba(0, 229, 255, 0.15)',
                              borderRadius: 4,
                              padding: '1px 5px',
                              color: '#00e5ff',
                            }}
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span
                      style={{
                        color: '#00e5ff',
                        fontSize: 10,
                        transition: 'transform 0.3s',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        display: 'inline-block',
                      }}
                    >
                      ▸
                    </span>
                  </div>

                  <div
                    style={{
                      maxHeight: isExpanded ? 400 : 0,
                      overflow: 'hidden',
                      transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <div style={{ padding: '0 12px 12px' }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#8899aa',
                          lineHeight: 1.6,
                          marginBottom: 8,
                          padding: '8px 10px',
                          background: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: 8,
                          border: '1px solid rgba(0, 229, 255, 0.06)',
                        }}
                      >
                        {group.summary}
                      </div>

                      <div style={{ fontSize: 11, color: '#5a7088', marginBottom: 4 }}>
                        待办事项
                      </div>
                      {group.todos.map((todo, ti) => (
                        <div
                          key={ti}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 6,
                            padding: '5px 8px',
                            marginBottom: 4,
                            background: 'rgba(0, 229, 255, 0.03)',
                            borderRadius: 6,
                            border: '1px solid rgba(0, 229, 255, 0.06)',
                          }}
                        >
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: 3,
                              border: '1px solid rgba(0, 229, 255, 0.3)',
                              flexShrink: 0,
                              marginTop: 1,
                            }}
                          />
                          <span style={{ fontSize: 11, color: '#99aabb', lineHeight: 1.5 }}>
                            {todo}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {snapshots.length > 0 && (
          <div style={{ padding: '0 12px 12px' }}>
            <div
              style={{
                fontSize: 11,
                color: '#5a7088',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              快照历史
            </div>
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                onClick={() => onSnapshotReplay(snap.state)}
                style={{
                  padding: '6px 10px',
                  marginBottom: 4,
                  background: 'rgba(0, 229, 255, 0.03)',
                  border: '1px solid rgba(0, 229, 255, 0.06)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s',
                  fontSize: 11,
                  color: '#667788',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'rgba(0, 229, 255, 0.08)';
                  el.style.borderColor = 'rgba(0, 229, 255, 0.2)';
                  el.style.color = '#00e5ff';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'rgba(0, 229, 255, 0.03)';
                  el.style.borderColor = 'rgba(0, 229, 255, 0.06)';
                  el.style.color = '#667788';
                }}
              >
                <span>{formatTime(snap.timestamp)}</span>
                <span>
                  {snap.state.notes.length} 便签 · {snap.state.connections.length} 连线
                </span>
              </div>
            ))}
          </div>
        )}

        {(!groupResult || groupResult.groups.length === 0) && snapshots.length === 0 && (
          <div
            style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: '#334455',
              fontSize: 12,
              lineHeight: 1.8,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>✦</div>
            <div>在画布上双击添加便签</div>
            <div>Shift+点击选中多个便签</div>
            <div>然后点击聚合按钮</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
