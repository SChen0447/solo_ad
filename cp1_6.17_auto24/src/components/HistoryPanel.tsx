import React from 'react';
import { HistoryRecord } from '../types';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryRecord[];
  onRollback: (historyId: string) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  isOpen,
  onClose,
  history,
  onRollback,
}) => {
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionLabel = (type: string): string => {
    const labels: Record<string, string> = {
      create: '创建节点',
      edit: '编辑节点',
      move: '移动节点',
      delete: '删除节点',
      connect: '创建连线',
      disconnect: '删除连线',
      rollback: '回退操作',
    };
    return labels[type] || type;
  };

  const getActionIcon = (type: string): string => {
    const icons: Record<string, string> = {
      create: '＋',
      edit: '✏️',
      move: '↔️',
      delete: '🗑️',
      connect: '🔗',
      disconnect: '✂️',
      rollback: '⏪',
    };
    return icons[type] || '•';
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    left: isOpen ? '0' : '-360px',
    top: '0',
    width: '320px',
    height: '100vh',
    backgroundColor: '#F8F9FA',
    boxShadow: '4px 0 20px rgba(0, 0, 0, 0.1)',
    transition: 'left 0.3s ease',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    boxSizing: 'border-box',
  };

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '15px',
    right: '15px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'background-color 0.2s, transform 0.1s',
  };

  const historyListStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    marginTop: '10px',
  };

  const historyItemStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    padding: '14px',
    marginBottom: '10px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.1s, box-shadow 0.2s',
    border: '1px solid #f0f0f0',
  };

  const historyHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
  };

  const iconStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: '#E8F4F8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    marginRight: '10px',
  };

  const actionTextStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    color: '#333333',
    flex: 1,
  };

  const timeStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#999999',
  };

  const userStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#666666',
    marginLeft: '42px',
  };

  const emptyStateStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#999999',
    fontSize: '14px',
  };

  const darkenColor = (color: string, percent: number): string => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max((num >> 16) - amt, 0);
    const G = Math.max(((num >> 8) & 0x00ff) - amt, 0);
    const B = Math.max((num & 0x0000ff) - amt, 0);
    return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
  };

  const rollbackButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px',
    fontSize: '12px',
    marginTop: '8px',
    backgroundColor: '#45B7D1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.1s',
  };

  return (
    <div style={panelStyle}>
      <button
        style={closeButtonStyle}
        onClick={onClose}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#F0F0F0';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#ffffff';
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.95)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        ×
      </button>

      <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#333333' }}>
        操作历史
      </h3>
      <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#999999' }}>
        点击记录可回退到该版本
      </p>

      <div style={historyListStyle}>
        {history.length === 0 ? (
          <div style={emptyStateStyle}>
          <p>暂无操作记录</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>
            开始编辑导图后，操作记录将显示在这里
          </p>
        </div>
        ) : (
          history.map((record) => (
            <div
              key={record.id}
              style={historyItemStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
              }}
            >
              <div style={historyHeaderStyle}>
                <div style={iconStyle}>{getActionIcon(record.type)}</div>
                <span style={actionTextStyle}>{getActionLabel(record.type)}</span>
                <span style={timeStyle}>{formatTime(record.timestamp)}</span>
              </div>
              <div style={userStyle}>操作人：{record.username}</div>
              {record.description && (
                <div style={{ ...userStyle, marginTop: '4px', fontSize: '12px' }}>
                  {record.description}
                </div>
              )}
              <button
                style={rollbackButtonStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('确定要回退到此版本吗？')) {
                    onRollback(record.id);
                  }
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = darkenColor('#45B7D1', 10);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#45B7D1';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                回退到此版本
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
