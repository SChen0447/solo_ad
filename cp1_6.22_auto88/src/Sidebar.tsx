import React, { useState, useEffect, useRef } from 'react';
import { Operation, formatRelativeTime } from './pixelOperations';
import { HistoryManager } from './historyManager';
import { User } from './CanvasBoard';

interface Props {
  historyManager: HistoryManager;
  users: User[];
  currentUserId: string;
  isReplaying: boolean;
  replayProgress: number;
  replayTotal: number;
  onSelectEntry: (opId: string) => void;
  onStartReplay: () => void;
  onStopReplay: () => void;
}

const Sidebar: React.FC<Props> = ({
  historyManager,
  users,
  currentUserId,
  isReplaying,
  replayProgress,
  replayTotal,
  onSelectEntry,
  onStartReplay,
  onStopReplay
}) => {
  const [, forceUpdate] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const unsub = historyManager.subscribe(() => forceUpdate(n => n + 1));
    return unsub;
  }, [historyManager]);

  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [historyManager.length, autoScroll]);

  const entries = historyManager.getAll();
  const progressPct = replayTotal > 0 ? (replayProgress / replayTotal) * 100 : 0;

  return (
    <div style={styles.container}>
      <div style={styles.userSection}>
        <div style={styles.sectionTitle}>
          <span style={styles.dot} /> 在线用户 <span style={styles.countBadge}>{users.length}</span>
        </div>
        <div style={styles.userList}>
          {users.map(u => (
            <div key={u.id} style={{
              ...styles.userItem,
              outline: u.id === currentUserId ? `2px solid ${u.color}50` : 'none'
            }}>
              <div style={{ ...styles.userColorDot, backgroundColor: u.color, boxShadow: `0 0 8px ${u.color}` }} />
              <span style={styles.userName}>{u.name}</span>
              {u.id === currentUserId && <span style={styles.selfLabel}>（我）</span>}
            </div>
          ))}
        </div>
      </div>

      <div style={styles.replaySection}>
        <div style={styles.sectionTitle}>
          <span style={{ ...styles.dot, backgroundColor: '#ff8800' }} /> 回放控制
        </div>
        <div style={styles.progressBar}>
          <div style={{
            ...styles.progressFill,
            width: `${progressPct}%`,
            boxShadow: isReplaying ? '0 0 12px #00ff88' : 'none'
          }} />
        </div>
        <div style={styles.progressText}>
          步骤: <span style={styles.progressHighlight}>{replayProgress}</span> / {replayTotal || entries.length}
        </div>
        <button
          onClick={isReplaying ? onStopReplay : onStartReplay}
          disabled={entries.length === 0 && !isReplaying}
          style={{
            ...styles.replayBtn,
            backgroundColor: isReplaying ? '#e53e3e' : '#00ff88',
            color: isReplaying ? '#ffffff' : '#0a0f1a',
            cursor: (entries.length === 0 && !isReplaying) ? 'not-allowed' : 'pointer',
            opacity: (entries.length === 0 && !isReplaying) ? 0.4 : 1
          }}
        >
          {isReplaying ? '⏹ 停止回放' : '▶ 开始回放'}
        </button>
      </div>

      <div style={styles.historySection}>
        <div style={styles.sectionTitle}>
          <span style={{ ...styles.dot, backgroundColor: '#00e5ff' }} /> 操作历史
          <span style={styles.countBadge}>{entries.length}</span>
        </div>
        <div
          ref={listRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
          }}
          style={styles.historyList}
        >
          {entries.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🎨</div>
              <div style={styles.emptyText}>开始在画布上绘图吧</div>
              <div style={styles.emptySub}>每一步操作都会出现在这里</div>
            </div>
          )}
          {entries.map((entry, idx) => {
            const op = entry.operation;
            return (
              <div
                key={op.id}
                onClick={() => onSelectEntry(op.id)}
                style={styles.historyItem}
              >
                <div style={styles.historyIdx}>{idx + 1}</div>
                <div style={{
                  ...styles.historyColor,
                  backgroundColor: op.color,
                  boxShadow: `0 0 6px ${op.color}80`
                }} />
                <div style={styles.historyInfo}>
                  <div style={styles.historyType}>
                    {op.type === 'draw' ? '绘制像素' : op.type}
                    <span style={styles.brushBadge}>{op.brushSize === 4 ? '粗笔刷' : '细笔刷'}</span>
                  </div>
                  <div style={styles.historyCoord}>
                    坐标 ({op.gridX}, {op.gridY})
                  </div>
                </div>
                <div style={styles.historyTime}>
                  {formatRelativeTime(op.timestamp)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '14px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    backgroundColor: '#151a26'
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#a0aec0',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 2px',
    marginBottom: '8px'
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#00ff88',
    boxShadow: '0 0 6px #00ff88',
    flexShrink: 0
  },
  countBadge: {
    marginLeft: 'auto',
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 8px',
    backgroundColor: '#2d3748',
    color: '#00ff88',
    borderRadius: '10px',
    border: '1px solid #00ff8830'
  },
  userSection: {
    flexShrink: 0
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    backgroundColor: '#1e2533',
    borderRadius: '8px',
    border: '1px solid #2d3748',
    transition: 'all 0.2s ease'
  },
  userColorDot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    flexShrink: 0,
    border: '2px solid #ffffff20'
  },
  userName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#e2e8f0'
  },
  selfLabel: {
    fontSize: '11px',
    color: '#00ff88',
    marginLeft: '4px'
  },
  replaySection: {
    flexShrink: 0,
    padding: '12px',
    backgroundColor: '#1e2533',
    borderRadius: '10px',
    border: '1px solid #2d3748'
  },
  progressBar: {
    height: '6px',
    backgroundColor: '#2d3748',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #00ff88, #00e5ff)',
    borderRadius: '4px',
    transition: 'width 0.3s ease'
  },
  progressText: {
    fontSize: '12px',
    color: '#a0aec0',
    marginBottom: '10px'
  },
  progressHighlight: {
    color: '#00ff88',
    fontWeight: 700,
    fontSize: '14px'
  },
  replayBtn: {
    width: '100%',
    padding: '10px 14px',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '13px',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    letterSpacing: '0.03em'
  },
  historySection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0
  },
  historyList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    paddingRight: '4px',
    scrollbarWidth: 'thin',
    scrollbarColor: '#4a5568 #1e2533'
  },
  emptyState: {
    padding: '32px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    color: '#4a5568',
    textAlign: 'center'
  },
  emptyIcon: {
    fontSize: '36px',
    marginBottom: '4px',
    opacity: 0.6
  },
  emptyText: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#718096'
  },
  emptySub: {
    fontSize: '12px',
    color: '#4a5568'
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    backgroundColor: '#1e2533',
    borderRadius: '8px',
    border: '1px solid #2d3748',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative'
  },
  historyIdx: {
    width: '22px',
    height: '22px',
    borderRadius: '6px',
    backgroundColor: '#2d3748',
    color: '#718096',
    fontSize: '11px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  historyColor: {
    width: '18px',
    height: '18px',
    borderRadius: '5px',
    flexShrink: 0,
    border: '2px solid #ffffff30'
  },
  historyInfo: {
    flex: 1,
    minWidth: 0
  },
  historyType: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  brushBadge: {
    fontSize: '10px',
    padding: '1px 6px',
    backgroundColor: '#2d3748',
    color: '#a0aec0',
    borderRadius: '4px',
    fontWeight: 500
  },
  historyCoord: {
    fontSize: '11px',
    color: '#718096',
    marginTop: '2px',
    fontFamily: 'ui-monospace, monospace'
  },
  historyTime: {
    fontSize: '11px',
    color: '#4a5568',
    flexShrink: 0,
    whiteSpace: 'nowrap'
  }
};

export default Sidebar;
