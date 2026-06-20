import React from 'react';
import type { TopologyType, RoutingSpeed, SelectedNodeInfo } from '../types';
import '../styles.css';

interface ControlPanelProps {
  topologyType: TopologyType;
  setTopologyType: (type: TopologyType) => void;
  nodeCount: number;
  setNodeCount: (count: number) => void;
  connectionProbability: number;
  setConnectionProbability: (prob: number) => void;
  routingSpeed: RoutingSpeed;
  setRoutingSpeed: (speed: RoutingSpeed) => void;
  isRoutingActive: boolean;
  onStartRouting: () => void;
  onStopRouting: () => void;
  selectedNodeInfo: SelectedNodeInfo | null;
}

const topologyOptions: { value: TopologyType; label: string }[] = [
  { value: 'ring', label: '环型拓扑' },
  { value: 'star', label: '星型拓扑' },
  { value: 'tree', label: '树型拓扑' },
  { value: 'mesh', label: '网格型拓扑' },
];

const speedOptions: { value: RoutingSpeed; label: string }[] = [
  { value: 'slow', label: '慢速' },
  { value: 'medium', label: '中速' },
  { value: 'fast', label: '快速' },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  topologyType,
  setTopologyType,
  nodeCount,
  setNodeCount,
  connectionProbability,
  setConnectionProbability,
  routingSpeed,
  setRoutingSpeed,
  isRoutingActive,
  onStartRouting,
  onStopRouting,
  selectedNodeInfo,
}) => {
  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h2 style={styles.title}>拓扑控制面板</h2>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>拓扑类型</label>
        <select
          value={topologyType}
          onChange={(e) => setTopologyType(e.target.value as TopologyType)}
          className="topo-select"
        >
          {topologyOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>
          节点数量: <span style={styles.value}>{nodeCount}</span>
        </label>
        <input
          type="range"
          min={8}
          max={20}
          value={nodeCount}
          onChange={(e) => setNodeCount(parseInt(e.target.value))}
          className="topo-slider"
        />
        <div style={styles.sliderLabels}>
          <span>8</span>
          <span>20</span>
        </div>
      </div>

      {topologyType === 'mesh' && (
        <div style={styles.section}>
          <label style={styles.label}>
            连接概率: <span style={styles.value}>{(connectionProbability * 100).toFixed(0)}%</span>
          </label>
          <input
            type="range"
            min={30}
            max={80}
            value={connectionProbability * 100}
            onChange={(e) => setConnectionProbability(parseInt(e.target.value) / 100)}
            className="topo-slider"
          />
          <div style={styles.sliderLabels}>
            <span>30%</span>
            <span>80%</span>
          </div>
        </div>
      )}

      <div style={styles.divider} />

      <div style={styles.section}>
        <label style={styles.label}>路由速度</label>
        <div style={styles.buttonGroup}>
          {speedOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRoutingSpeed(opt.value)}
              className={`topo-btn-speed ${routingSpeed === opt.value ? 'active' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <button
          onClick={isRoutingActive ? onStopRouting : onStartRouting}
          className={`topo-btn-action ${isRoutingActive ? 'stop' : ''}`}
        >
          {isRoutingActive ? '停止路由' : '开始路由'}
        </button>
        <p style={styles.hint}>点击选择起点和终点节点后开始路由</p>
      </div>

      {selectedNodeInfo && (
        <>
          <div style={styles.divider} />
          <div style={styles.section}>
            <h3 style={styles.subTitle}>节点信息</h3>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>ID:</span>
              <span style={styles.infoValue}>{selectedNodeInfo.id}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>坐标 X:</span>
              <span style={styles.infoValue}>{selectedNodeInfo.position.x.toFixed(2)}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>坐标 Y:</span>
              <span style={styles.infoValue}>{selectedNodeInfo.position.y.toFixed(2)}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>坐标 Z:</span>
              <span style={styles.infoValue}>{selectedNodeInfo.position.z.toFixed(2)}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>连接数:</span>
              <span style={styles.infoValue}>{selectedNodeInfo.connectionCount}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 280,
    height: '100%',
    background: 'rgba(20, 25, 40, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderLeft: '1px solid rgba(100, 150, 255, 0.2)',
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    overflowY: 'auto',
  },
  header: {
    marginBottom: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 600,
    margin: 0,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    color: '#aabbcc',
    fontSize: 13,
    fontWeight: 500,
  },
  value: {
    color: '#00ffff',
    fontWeight: 600,
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#667788',
    fontSize: 11,
  },
  buttonGroup: {
    display: 'flex',
    gap: 6,
  },
  hint: {
    color: '#667788',
    fontSize: 11,
    margin: 0,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    background: 'linear-gradient(to right, transparent, rgba(100, 150, 255, 0.3), transparent)',
    margin: '4px 0',
  },
  subTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
    margin: 0,
    marginBottom: 4,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    padding: '4px 0',
  },
  infoLabel: {
    color: '#8899aa',
  },
  infoValue: {
    color: '#00ffff',
    fontFamily: 'monospace',
  },
};

export default ControlPanel;
