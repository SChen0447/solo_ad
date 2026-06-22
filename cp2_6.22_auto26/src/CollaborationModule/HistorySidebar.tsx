import React from 'react';
import { Plus, Trash2, Move, Clock } from 'lucide-react';
import { useWhiteboardStore } from '@/store';
import type { HistorySnapshot } from '@/types';

const actionIcons: Record<string, React.ReactNode> = {
  add: <Plus size={14} />,
  delete: <Trash2 size={14} />,
  move: <Move size={14} />,
  edit: <Move size={14} />,
};

const actionLabels: Record<string, string> = {
  add: '添加元素',
  delete: '删除元素',
  move: '移动元素',
  edit: '编辑元素',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toTimeString().slice(0, 8);
}

const HistorySidebar: React.FC = () => {
  const sidebarOpen = useWhiteboardStore(s => s.sidebarOpen);
  const historyState = useWhiteboardStore(s => s.historyState);

  const recentActions: HistorySnapshot[] = (() => {
    const all = [...historyState.past];
    return all.slice(-10).reverse();
  })();

  return (
    <div
      style={{
        ...styles.sidebar,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)',
      }}
    >
      <div style={styles.header}>
        <Clock size={16} />
        <span style={styles.headerTitle}>操作历史</span>
      </div>
      <div style={styles.list}>
        {recentActions.length === 0 && (
          <div style={styles.empty}>暂无操作记录</div>
        )}
        {recentActions.map((action, i) => (
          <div key={i} style={styles.item}>
            <div style={styles.iconWrap}>
              {actionIcons[action.actionType] || <Move size={14} />}
            </div>
            <div style={styles.itemContent}>
              <span style={styles.itemLabel}>
                {actionLabels[action.actionType] || '操作'}
              </span>
              <span style={styles.itemTime}>{formatTime(action.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 280,
    height: '100%',
    background: '#FFFFFF',
    borderLeft: '1px solid #E2E8F0',
    zIndex: 90,
    transition: 'transform 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '16px 20px',
    borderBottom: '1px solid #E2E8F0',
    color: '#334155',
    fontWeight: 600,
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 14,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  empty: {
    padding: '24px 20px',
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center' as const,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 20px',
    transition: 'background 0.15s ease',
    cursor: 'default',
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    background: '#F1F5F9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748B',
    flexShrink: 0,
  },
  itemContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
    minWidth: 0,
  },
  itemLabel: {
    fontSize: 13,
    color: '#334155',
    fontWeight: 500,
  },
  itemTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
};

export default HistorySidebar;
