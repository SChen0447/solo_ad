import React, { useState, useMemo } from 'react';
import {
  Plant,
  getPlantType,
  STAGE_NAMES,
  STAGE_ICONS,
  GROWTH_STAGES,
  EnvironmentParams,
  PlantGrowthHistory
} from '../utils/plantEngine';
import { PlantCard } from './PlantCard';

interface PlantDetailPanelProps {
  plant: Plant | null;
  env: EnvironmentParams;
  onClose: () => void;
  onRemove?: (plantId: string) => void;
}

function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.floor(ms / 1000)}秒`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}分${Math.floor((ms % 60000) / 1000)}秒`;
  return `${Math.floor(ms / 3600000)}时${Math.floor((ms % 3600000) / 60000)}分`;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

const HealthTrendChart: React.FC<{ data: number[] }> = ({ data }) => {
  const width = 200;
  const height = 60;
  const padding = 4;

  const points = useMemo(() => {
    if (data.length === 0) return '';
    const maxPoints = 60;
    const displayData = data.slice(-maxPoints);
    const step = displayData.length > 1 ? (width - padding * 2) / (displayData.length - 1) : 0;
    return displayData
      .map((v, i) => {
        const x = padding + i * step;
        const y = padding + ((100 - Math.max(0, Math.min(100, v))) / 100) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(' ');
  }, [data]);

  const areaPath = useMemo(() => {
    if (data.length === 0) return '';
    const maxPoints = 60;
    const displayData = data.slice(-maxPoints);
    const step = displayData.length > 1 ? (width - padding * 2) / (displayData.length - 1) : 0;
    const linePoints = displayData.map((v, i) => {
      const x = padding + i * step;
      const y = padding + ((100 - Math.max(0, Math.min(100, v))) / 100) * (height - padding * 2);
      return `${x},${y}`;
    });
    if (linePoints.length < 2) return '';
    const lastX = padding + (displayData.length - 1) * step;
    const bottomY = height - padding;
    return `M ${padding},${bottomY} L ${linePoints.join(' L ')} L ${lastX},${bottomY} Z`;
  }, [data]);

  const lastPoint = useMemo(() => {
    if (data.length === 0) return null;
    const maxPoints = 60;
    const displayData = data.slice(-maxPoints);
    const step = displayData.length > 1 ? (width - padding * 2) / (displayData.length - 1) : 0;
    const last = displayData[displayData.length - 1];
    return {
      x: padding + (displayData.length - 1) * step,
      y: padding + ((100 - Math.max(0, Math.min(100, last))) / 100) * (height - padding * 2)
    };
  }, [data]);

  return (
    <svg width={width} height={height} className="health-chart">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3" />
      {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}
      {points && (
        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {lastPoint && (
        <circle cx={lastPoint.x} cy={lastPoint.y} r="3.5" fill="#3b82f6" stroke="white" strokeWidth="2" />
      )}
    </svg>
  );
};

const HistoryTable: React.FC<{ history: PlantGrowthHistory[] }> = ({ history }) => {
  if (history.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">📋</span>
        <span className="empty-text">暂无记录</span>
      </div>
    );
  }

  return (
    <div className="history-table-wrapper">
      <table className="history-table">
        <thead>
          <tr>
            <th>阶段</th>
            <th>完成时间</th>
            <th>耗时</th>
            <th>平均健康度</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h, i) => (
            <tr key={i} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
              <td>
                <span className="hist-stage">
                  {STAGE_ICONS[h.stage]} {STAGE_NAMES[h.stage]}
                </span>
              </td>
              <td>{formatTime(h.timestamp)}</td>
              <td>{formatDuration(h.durationMs)}</td>
              <td>
                <span
                  className="hist-health"
                  style={{ color: h.avgHealth >= 60 ? '#10b981' : h.avgHealth >= 30 ? '#f59e0b' : '#ef4444' }}
                >
                  {h.avgHealth}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

type TabType = 'info' | 'history';

export const PlantDetailPanel: React.FC<PlantDetailPanelProps> = ({
  plant,
  env,
  onClose,
  onRemove
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('info');

  if (!plant) return null;

  const plantType = getPlantType(plant.typeId);
  const stageIndex = GROWTH_STAGES.indexOf(plant.stage);
  const progressPercent = Math.round(plant.growthProgress);
  const totalProgress = Math.round(stageIndex * 100 + plant.growthProgress);
  const totalMax = GROWTH_STAGES.length * 100 - 100;
  const overallPercent = Math.round((totalProgress / totalMax) * 100);

  const getEnvMatchInfo = () => {
    if (!plantType) return [];
    const { preferences } = plantType;
    return [
      {
        label: '光照',
        icon: '☀️',
        current: env.light,
        ideal: preferences.idealLight,
        tolerance: preferences.lightTolerance,
        unit: '%'
      },
      {
        label: '水分',
        icon: '💧',
        current: env.water,
        ideal: preferences.idealWater,
        tolerance: preferences.waterTolerance,
        unit: '%'
      },
      {
        label: '温度',
        icon: '🌡️',
        current: env.temperature,
        ideal: preferences.idealTemperature,
        tolerance: preferences.temperatureTolerance,
        unit: '°C'
      }
    ];
  };

  const envInfo = getEnvMatchInfo();

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <div className="detail-panel">
        <div className="panel-close" onClick={onClose}>
          ✕
        </div>

        <div className="detail-header">
          {plantType && (
            <PlantCard plant={plant} onClick={undefined} />
          )}
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            📊 详情
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📋 历史
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'info' && (
            <div className="info-section">
              <div className="info-block">
                <h4>生长进度</h4>
                <div className="overall-progress">
                  <div className="overall-header">
                    <span>总体进度</span>
                    <span className="overall-percent">{overallPercent}%</span>
                  </div>
                  <div className="overall-bar">
                    <div
                      className="overall-fill"
                      style={{
                        width: `${overallPercent}%`,
                        background: plant.isWithered ? '#94a3b8' : '#10b981'
                      }}
                    />
                  </div>
                </div>

                <div className="stage-progress-row">
                  <div className="stage-progress-info">
                    <span>{STAGE_NAMES[plant.stage]}</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="stage-progress-bar">
                    <div
                      className="stage-progress-fill"
                      style={{
                        width: `${progressPercent}%`,
                        background: plantType?.color || '#10b981'
                      }}
                    />
                  </div>
                </div>

                <div className="stages-visual">
                  {GROWTH_STAGES.map((s, i) => (
                    <div key={s} className={`stage-node ${i < stageIndex ? 'done' : ''} ${i === stageIndex ? 'active' : ''}`}>
                      <div className="stage-node-icon">{STAGE_ICONS[s]}</div>
                      <div className="stage-node-label">{STAGE_NAMES[s]}</div>
                      {i < GROWTH_STAGES.length - 1 && (
                        <div className={`stage-line ${i < stageIndex ? 'done' : ''}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="info-block">
                <h4>健康趋势 <span className="trend-hint">(最近60秒)</span></h4>
                <div className="chart-wrapper">
                  <HealthTrendChart data={plant.healthTrend} />
                  <div className="chart-y-axis">
                    <span>100</span>
                    <span>50</span>
                    <span>0</span>
                  </div>
                </div>
              </div>

              <div className="info-block">
                <h4>环境匹配</h4>
                <div className="env-match-list">
                  {envInfo.map((e) => {
                    const diff = Math.abs(e.current - e.ideal);
                    const matched = diff <= e.tolerance;
                    const matchPercent = Math.max(0, 100 - (diff - e.tolerance) * 2);
                    return (
                      <div key={e.label} className="env-match-item">
                        <div className="env-match-header">
                          <span className="env-match-icon">{e.icon}</span>
                          <span className="env-match-label">{e.label}</span>
                          <span className={`env-match-status ${matched ? 'good' : 'bad'}`}>
                            {matched ? '✓ 适宜' : '⚠ 偏差'}
                          </span>
                        </div>
                        <div className="env-match-detail">
                          <span className="env-current">当前: {e.current}{e.unit}</span>
                          <span className="env-ideal">理想: {e.ideal}±{e.tolerance}{e.unit}</span>
                        </div>
                        <div className="env-match-bar">
                          <div
                            className="env-match-fill"
                            style={{
                              width: `${matchPercent}%`,
                              background: matched ? '#10b981' : '#f59e0b'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="info-block">
                <h4>基础信息</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-key">种植时间</span>
                    <span className="info-value">{formatTime(plant.createdAt)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-key">当前阶段开始</span>
                    <span className="info-value">{formatTime(plant.stageStartedAt)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-key">已生长</span>
                    <span className="info-value">{formatDuration(Date.now() - plant.createdAt)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-key">状态</span>
                    <span className={`info-value status ${plant.isWithered ? 'withered' : plant.health < 30 ? 'danger' : 'healthy'}`}>
                      {plant.isWithered ? '已枯萎' : plant.health < 30 ? '危险' : '健康生长'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="history-section">
              <h4 style={{ marginTop: 0 }}>生长历史记录</h4>
              <HistoryTable history={plant.history} />
            </div>
          )}
        </div>

        {onRemove && (
          <div className="panel-footer">
            <button className="remove-btn" onClick={() => onRemove(plant.id)}>
              🗑️ 移除这株植物
            </button>
          </div>
        )}

        <style>{`
          .panel-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.35);
            z-index: 1001;
            animation: fade-overlay 0.3s ease;
          }
          @keyframes fade-overlay {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .detail-panel {
            position: fixed;
            top: 0;
            right: 0;
            width: 90%;
            max-width: 420px;
            height: 100vh;
            background: #f8fafc;
            box-shadow: -8px 0 30px rgba(0,0,0,0.12);
            z-index: 1002;
            display: flex;
            flex-direction: column;
            animation: slide-in 0.3s ease-out;
            overflow: hidden;
          }
          @keyframes slide-in {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          .panel-close {
            position: absolute;
            top: 12px;
            right: 12px;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 16px;
            color: #64748b;
            z-index: 10;
            transition: all 0.2s ease;
          }
          .panel-close:hover {
            background: #f1f5f9;
            color: #1e293b;
          }
          .detail-header {
            padding: 24px 20px 20px;
            display: flex;
            justify-content: center;
            background: linear-gradient(180deg, #ecfdf5, #f8fafc);
          }
          .tabs {
            display: flex;
            padding: 0 12px;
            border-bottom: 1px solid #e2e8f0;
            background: white;
          }
          .tab {
            flex: 1;
            padding: 12px;
            border: none;
            background: none;
            font-size: 14px;
            font-weight: 600;
            color: #64748b;
            cursor: pointer;
            border-bottom: 3px solid transparent;
            transition: all 0.2s ease;
            font-family: inherit;
          }
          .tab.active {
            color: #059669;
            border-bottom-color: #10b981;
          }
          .tab-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px 20px;
          }
          .info-section {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          .info-block h4 {
            margin: 0 0 12px 0;
            font-size: 14px;
            font-weight: 700;
            color: #065f46;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .trend-hint {
            font-size: 11px;
            font-weight: 400;
            color: #94a3b8;
          }
          .overall-progress { margin-bottom: 14px; }
          .overall-header {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin-bottom: 4px;
            color: #475569;
          }
          .overall-percent { font-weight: 700; color: #059669; }
          .overall-bar {
            width: 100%;
            height: 10px;
            background: #e2e8f0;
            border-radius: 5px;
            overflow: hidden;
          }
          .overall-fill {
            height: 100%;
            transition: width 0.3s ease;
            border-radius: 5px;
          }
          .stage-progress-row { margin-bottom: 14px; }
          .stage-progress-info {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin-bottom: 4px;
            color: #475569;
          }
          .stage-progress-bar {
            width: 100%;
            height: 6px;
            background: #e2e8f0;
            border-radius: 3px;
            overflow: hidden;
          }
          .stage-progress-fill {
            height: 100%;
            transition: width 0.3s ease;
          }
          .stages-visual {
            display: flex;
            justify-content: space-between;
            gap: 0;
            position: relative;
            padding: 0 4px;
          }
          .stage-node {
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            flex: 1;
            z-index: 2;
          }
          .stage-node-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            border: 2px solid #e2e8f0;
            transition: all 0.3s ease;
          }
          .stage-node.done .stage-node-icon {
            background: #d1fae5;
            border-color: #10b981;
          }
          .stage-node.active .stage-node-icon {
            background: #10b981;
            border-color: #059669;
            box-shadow: 0 0 0 4px rgba(16,185,129,0.2);
          }
          .stage-node-label {
            font-size: 10px;
            color: #64748b;
            margin-top: 4px;
            font-weight: 600;
          }
          .stage-line {
            position: absolute;
            top: 16px;
            left: calc(50% + 20px);
            right: calc(-50% + 20px);
            height: 2px;
            background: #e2e8f0;
            z-index: 1;
            transition: background 0.3s ease;
          }
          .stage-line.done { background: #10b981; }
          .chart-wrapper {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            background: white;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
          }
          .chart-y-axis {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 60px;
            font-size: 9px;
            color: #94a3b8;
          }
          .health-chart { display: block; }
          .env-match-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .env-match-item {
            padding: 10px 12px;
            background: white;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
          }
          .env-match-header {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 6px;
          }
          .env-match-icon { font-size: 14px; }
          .env-match-label {
            font-size: 13px;
            font-weight: 600;
            flex: 1;
            color: #334155;
          }
          .env-match-status {
            font-size: 11px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 10px;
          }
          .env-match-status.good { background: #d1fae5; color: #059669; }
          .env-match-status.bad { background: #fef3c7; color: #b45309; }
          .env-match-detail {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #64748b;
            margin-bottom: 6px;
          }
          .env-match-bar {
            width: 100%;
            height: 5px;
            background: #f1f5f9;
            border-radius: 3px;
            overflow: hidden;
          }
          .env-match-fill {
            height: 100%;
            border-radius: 3px;
            transition: width 0.3s ease;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .info-item {
            padding: 10px 12px;
            background: white;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
          }
          .info-key {
            display: block;
            font-size: 10px;
            color: #94a3b8;
            margin-bottom: 3px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-value {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: #334155;
          }
          .info-value.status { font-size: 13px; }
          .status.healthy { color: #059669; }
          .status.danger { color: #dc2626; }
          .status.withered { color: #64748b; }
          .history-section h4 { margin-bottom: 12px; }
          .history-table-wrapper {
            background: white;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
            overflow: hidden;
          }
          .history-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          .history-table th {
            background: #e2e8f0;
            font-size: 14px;
            font-weight: 700;
            padding: 10px 12px;
            text-align: left;
            color: #334155;
            border-bottom: 1px solid #cbd5e1;
          }
          .history-table td {
            padding: 10px 12px;
            color: #475569;
          }
          .row-even { background: #f8fafc; }
          .row-odd { background: #f1f5f9; }
          .hist-stage { font-weight: 600; color: #334155; }
          .hist-health { font-weight: 700; }
          .empty-state {
            padding: 40px 20px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
          }
          .empty-icon { font-size: 36px; opacity: 0.4; }
          .empty-text {
            color: #94a3b8;
            font-size: 14px;
          }
          .panel-footer {
            padding: 12px 20px 20px;
            border-top: 1px solid #e2e8f0;
            background: white;
          }
          .remove-btn {
            width: 100%;
            padding: 12px;
            background: #fee2e2;
            color: #dc2626;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: inherit;
          }
          .remove-btn:hover {
            background: #fecaca;
          }
          .remove-btn:active {
            transform: scale(0.95);
          }
          @media (max-width: 480px) {
            .detail-panel { max-width: 100%; width: 100%; }
          }
        `}</style>
      </div>
    </>
  );
};

export default PlantDetailPanel;
