import React from 'react';
import { Move, AIRecommendation, BLACK, WHITE, toCoord } from './types';

interface ControlsProps {
  moves: Move[];
  blackCaptures: number;
  whiteCaptures: number;
  aiEnabled: boolean;
  aiRecommendations: AIRecommendation[];
  viewMoveIndex: number;
  onUndo: () => void;
  onClear: () => void;
  onToggleAI: () => void;
  onJumpToMove: (index: number) => void;
}

const AI_LABEL_COLORS = ['#FFD700', '#FF8C00', '#90EE90'];

const Controls: React.FC<ControlsProps> = ({
  moves,
  blackCaptures,
  whiteCaptures,
  aiEnabled,
  aiRecommendations,
  viewMoveIndex,
  onUndo,
  onClear,
  onToggleAI,
  onJumpToMove,
}) => {
  const handleClear = () => {
    if (window.confirm('确定要清除整局棋吗？此操作不可撤销。')) {
      onClear();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>提子统计</div>
        <div style={styles.statsRow}>
          <span style={styles.blackDot}>●</span> 黑提 {blackCaptures} 颗
          <span style={{ marginLeft: 12 }} />
          <span style={styles.whiteDot}>○</span> 白提 {whiteCaptures} 颗
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>AI 推荐</div>
        <label style={styles.switchRow}>
          <span>AI推荐模式</span>
          <div
            style={{
              ...styles.switch,
              backgroundColor: aiEnabled ? '#4CAF50' : '#888',
            }}
            onClick={onToggleAI}
          >
            <div
              style={{
                ...styles.switchKnob,
                transform: aiEnabled ? 'translateX(20px)' : 'translateX(0)',
              }}
            />
          </div>
        </label>
        {aiEnabled && aiRecommendations.length > 0 && (
          <div style={styles.recList}>
            {aiRecommendations.map((rec, i) => (
              <div key={`${rec.x}-${rec.y}`} style={styles.recItem}>
                <span
                  style={{
                    ...styles.recDot,
                    backgroundColor: AI_LABEL_COLORS[i],
                  }}
                />
                第{i + 1}名: {toCoord(rec.x, rec.y)} — 评分 {rec.score}
              </div>
            ))}
          </div>
        )}
        {aiEnabled && aiRecommendations.length === 0 && (
          <div style={styles.noRec}>暂无推荐</div>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>操作</div>
        <div style={styles.buttonRow}>
          <button style={styles.button} onClick={onUndo}>
            ↩ 悔棋
          </button>
          <button style={{ ...styles.button, backgroundColor: '#B71C1C' }} onClick={handleClear}>
            ✕ 清除棋局
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          棋谱记录 ({moves.length} 手)
        </div>
        <div style={styles.moveList}>
          {moves.length === 0 && (
            <div style={styles.emptyMove}>尚未落子</div>
          )}
          {moves.map((m, i) => {
            const isCurrent = i === viewMoveIndex;
            const colorLabel = m.color === BLACK ? '黑' : '白';
            return (
              <div
                key={i}
                style={{
                  ...styles.moveCard,
                  ...(isCurrent ? styles.moveCardActive : {}),
                }}
                onClick={() => onJumpToMove(i)}
              >
                {isCurrent && <div style={styles.activeIndicator} />}
                <span style={styles.moveIndex}>第{i + 1}手</span>
                <span style={styles.moveColorLabel}>{colorLabel}</span>
                <span style={styles.moveCoord}>{toCoord(m.x, m.y)}</span>
                {m.captures > 0 && (
                  <span style={styles.moveCapture}>提{m.captures}子</span>
                )}
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
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    height: '100%',
    overflow: 'hidden',
  },
  section: {
    background: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 10,
    padding: '10px 12px',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#F5DEB3',
    marginBottom: 6,
    letterSpacing: 1,
  },
  statsRow: {
    fontSize: 13,
    color: '#F5DEB3',
    display: 'flex',
    alignItems: 'center',
  },
  blackDot: {
    color: '#222',
    fontSize: 16,
    marginRight: 4,
    textShadow: '0 0 2px rgba(255,255,255,0.5)',
  },
  whiteDot: {
    color: '#EEE',
    fontSize: 16,
    marginRight: 4,
    textShadow: '0 0 2px rgba(0,0,0,0.5)',
  },
  switchRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 13,
    color: '#F5DEB3',
    cursor: 'pointer',
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    position: 'relative',
    transition: 'background-color 0.2s',
    cursor: 'pointer',
  },
  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    backgroundColor: '#FFF',
    position: 'absolute',
    top: 2,
    left: 2,
    transition: 'transform 0.2s',
  },
  recList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginTop: 6,
  },
  recItem: {
    fontSize: 12,
    color: '#F5DEB3',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  noRec: {
    fontSize: 12,
    color: 'rgba(245,222,179,0.5)',
    marginTop: 4,
  },
  buttonRow: {
    display: 'flex',
    gap: 8,
  },
  button: {
    flex: 1,
    padding: '8px 0',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#5D4037',
    color: '#F5DEB3',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s, background-color 0.2s',
  },
  moveList: {
    maxHeight: 260,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    paddingRight: 4,
  },
  emptyMove: {
    fontSize: 12,
    color: 'rgba(245,222,179,0.4)',
    textAlign: 'center' as const,
    padding: 8,
  },
  moveCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 8px 5px 10px',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.2s',
    position: 'relative' as const,
    fontSize: 12,
    color: '#F5DEB3',
  },
  moveCardActive: {
    backgroundColor: 'rgba(33,150,243,0.25)',
  },
  activeIndicator: {
    position: 'absolute' as const,
    left: 0,
    top: 2,
    bottom: 2,
    width: 3,
    borderRadius: 2,
    backgroundColor: '#2196F3',
  },
  moveIndex: {
    fontWeight: 600,
    minWidth: 48,
  },
  moveColorLabel: {
    fontWeight: 600,
    minWidth: 20,
  },
  moveCoord: {
    fontWeight: 500,
    flex: 1,
  },
  moveCapture: {
    fontSize: 11,
    color: '#FF8A65',
    fontWeight: 500,
  },
};

export default Controls;
