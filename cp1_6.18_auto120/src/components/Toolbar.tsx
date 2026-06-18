import React from 'react';
import { useAcousticStore, ToolMode } from '../store';

interface ToolItem {
  mode: ToolMode;
  icon: string;
  label: string;
}

const tools: ToolItem[] = [
  { mode: 'wall', icon: '🧱', label: '绘制墙壁' },
  { mode: 'source', icon: '🔊', label: '放置声源' },
  { mode: 'select', icon: '👆', label: '选择工具' },
];

const Toolbar: React.FC = () => {
  const { toolMode, setToolMode, drawing, cancelDrawing } = useAcousticStore();

  const handleToolClick = (mode: ToolMode) => {
    if (drawing.isDrawing && mode !== 'wall') {
      cancelDrawing();
    }
    setToolMode(toolMode === mode ? 'none' : mode);
  };

  return (
    <div style={styles.toolbar}>
      <div style={styles.title}>工具</div>
      <div style={styles.toolList}>
        {tools.map((tool) => {
          const isActive = toolMode === tool.mode;
          return (
            <button
              key={tool.mode}
              style={{
                ...styles.toolBtn,
                ...(isActive ? styles.toolBtnActive : {}),
              }}
              onClick={() => handleToolClick(tool.mode)}
            >
              <span style={styles.toolIcon}>{tool.icon}</span>
              <span style={styles.toolLabel}>{tool.label}</span>
            </button>
          );
        })}
      </div>

      {toolMode === 'wall' && (
        <div style={styles.hint}>
          <div style={styles.hintText}>点击画布添加墙壁节点</div>
          <div style={styles.hintText}>双击完成闭合</div>
          <div style={styles.hintText}>右键取消绘制</div>
          {drawing.isDrawing && (
            <div style={styles.hintProgress}>
              已添加 {drawing.currentPoints.length} 个节点
            </div>
          )}
        </div>
      )}

      {toolMode === 'source' && (
        <div style={styles.hint}>
          <div style={styles.hintText}>点击画布放置声源</div>
          <div style={styles.hintText}>在左侧面板调整参数</div>
        </div>
      )}

      <div style={styles.legend}>
        <div style={styles.legendTitle}>反射路径图例</div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendLine, background: '#ffffff' }} />
          <span style={styles.legendLabel}>首次反射</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendLine, background: '#aaaaaa' }} />
          <span style={styles.legendLabel}>二次反射</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendLine, background: '#888888', opacity: 0.5 }} />
          <span style={styles.legendLabel}>三次+反射</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendLine, background: 'linear-gradient(90deg, #ff4400, #4400ff)', width: 20 }} />
          <span style={styles.legendLabel}>低频→高频</span>
        </div>
      </div>

      <div style={styles.heatmapLegend}>
        <div style={styles.legendTitle}>声压级热力图</div>
        <div
          style={{
            width: '100%',
            height: '12px',
            borderRadius: '6px',
            background: 'linear-gradient(90deg, #00ff00, #ffff00, #ff0000)',
          }}
        />
        <div style={styles.heatmapLabels}>
          <span style={styles.heatmapLabel}>低</span>
          <span style={styles.heatmapLabel}>高</span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    background: 'rgba(22, 33, 62, 0.7)',
    backdropFilter: 'blur(12px)',
    borderRadius: '16px',
    padding: '20px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    border: '1px solid rgba(0,188,212,0.15)',
    height: '100%',
    overflowY: 'auto',
  },
  title: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#00bcd4',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(0,188,212,0.2)',
  },
  toolList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  toolBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid rgba(0,188,212,0.2)',
    background: 'transparent',
    color: '#aaa',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.25s ease',
  },
  toolBtnActive: {
    background: 'rgba(0,188,212,0.12)',
    color: '#00e5ff',
    borderColor: '#00bcd4',
    transform: 'scale(1.05)',
    boxShadow: '0 0 12px rgba(0,188,212,0.2)',
  },
  toolIcon: {
    fontSize: '18px',
  },
  toolLabel: {
    fontSize: '12px',
  },
  hint: {
    background: 'rgba(0,188,212,0.05)',
    borderRadius: '8px',
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  hintText: {
    fontSize: '11px',
    color: '#888',
  },
  hintProgress: {
    fontSize: '11px',
    color: '#00bcd4',
    fontWeight: 600,
    marginTop: '4px',
  },
  legend: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '8px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  legendTitle: {
    fontSize: '11px',
    color: '#00bcd4',
    fontWeight: 600,
    marginBottom: '4px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  legendLine: {
    display: 'inline-block',
    width: '20px',
    height: '3px',
    borderRadius: '2px',
  },
  legendLabel: {
    fontSize: '10px',
    color: '#888',
  },
  heatmapLegend: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '8px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  heatmapLabels: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  heatmapLabel: {
    fontSize: '10px',
    color: '#888',
  },
};

export default Toolbar;
