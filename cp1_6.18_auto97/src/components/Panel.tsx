import React, { useState } from 'react';
import type { Statistics, AnomalyRecord, AnomalyAlgorithm } from '../types';

interface PanelProps {
  statistics: Statistics | null;
  anomalyRecords: AnomalyRecord[];
  algorithm: AnomalyAlgorithm;
  zThreshold: number;
  iqrThreshold: number;
  onAlgorithmChange: (alg: AnomalyAlgorithm) => void;
  onZThresholdChange: (v: number) => void;
  onIqrThresholdChange: (v: number) => void;
  onRemoveAnomaly: (index: number) => void;
  onExport: () => void;
  onReset: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

const Panel: React.FC<PanelProps> = ({
  statistics, anomalyRecords, algorithm, zThreshold, iqrThreshold,
  onAlgorithmChange, onZThresholdChange, onIqrThresholdChange,
  onRemoveAnomaly, onExport, onReset, isOpen, onToggle
}) => {
  const [zBubble, setZBubble] = useState(false);
  const [iqrBubble, setIqrBubble] = useState(false);

  const totalAnomalies = anomalyRecords.length;
  const ratio = statistics?.totalCount
    ? ((totalAnomalies / statistics.totalCount) * 100).toFixed(2)
    : '0.00';

  const card = (label: string, value: string, highlight?: boolean) => (
    <div className={`stat-card ${highlight ? 'stat-card-accent' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );

  return (
    <>
      <button className="panel-handle" onClick={onToggle} title={isOpen ? '折叠面板' : '展开面板'}>
        <span className="panel-handle-bar" />
      </button>
      <div className={`panel ${isOpen ? 'panel-open' : 'panel-closed'}`}>
        <div className="panel-scroll">
          <div className="panel-section">
            <div className="section-title">统计摘要</div>
            {statistics ? (
              <div className="stat-grid">
                {card('均值', statistics.mean.toFixed(3))}
                {card('标准差', statistics.stdDev.toFixed(3))}
                {card('Q1', statistics.q1.toFixed(3))}
                {card('Q3', statistics.q3.toFixed(3))}
                {card('最小值', statistics.min.toFixed(3))}
                {card('最大值', statistics.max.toFixed(3))}
                {card('样本总数', statistics.totalCount.toString())}
                {card('异常点数', totalAnomalies.toString(), true)}
                {card('异常占比', `${ratio}%`, true)}
              </div>
            ) : (
              <div className="panel-empty">暂无统计数据</div>
            )}
          </div>

          <div className="panel-section">
            <div className="section-title">异常检测</div>
            <div className="algorithm-row">
              <button
                className={`algo-btn ${algorithm === 'zscore' ? 'algo-btn-active' : ''}`}
                onClick={() => onAlgorithmChange('zscore')}
              >Z-Score</button>
              <button
                className={`algo-btn ${algorithm === 'iqr' ? 'algo-btn-active' : ''}`}
                onClick={() => onAlgorithmChange('iqr')}
              >IQR</button>
            </div>

            <div className="slider-row">
              <label className="slider-label">
                {algorithm === 'zscore' ? `Z 阈值: ${zThreshold.toFixed(1)}` : `IQR 倍数: ${iqrThreshold.toFixed(1)}`}
              </label>
              {algorithm === 'zscore' ? (
                <div className="slider-wrap"
                  onMouseEnter={() => setZBubble(true)}
                  onMouseLeave={() => setZBubble(false)}
                >
                  {zBubble && <span className="slider-bubble">{zThreshold.toFixed(1)}</span>}
                  <input
                    type="range" min={1} max={6} step={0.1}
                    value={zThreshold}
                    onChange={e => onZThresholdChange(parseFloat(e.target.value))}
                    className="slider"
                  />
                </div>
              ) : (
                <div className="slider-wrap"
                  onMouseEnter={() => setIqrBubble(true)}
                  onMouseLeave={() => setIqrBubble(false)}
                >
                  {iqrBubble && <span className="slider-bubble">{iqrThreshold.toFixed(1)}</span>}
                  <input
                    type="range" min={0.5} max={4} step={0.1}
                    value={iqrThreshold}
                    onChange={e => onIqrThresholdChange(parseFloat(e.target.value))}
                    className="slider"
                  />
                </div>
              )}
            </div>

            <div className="action-row">
              <button className="primary-btn" onClick={onExport}>导出 CSV</button>
              <button className="secondary-btn" onClick={onReset}>重置标记</button>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-title">
              异常记录
              <span className="count-badge">{totalAnomalies}</span>
            </div>
            {anomalyRecords.length > 0 ? (
              <div className="table-wrap">
                <table className="anomaly-table">
                  <thead>
                    <tr>
                      <th>行索引</th>
                      <th>值</th>
                      <th>偏差</th>
                      <th>来源</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomalyRecords.map(r => (
                      <tr key={r.index}>
                        <td>{r.rowIndex}</td>
                        <td className="mono">{r.value.toFixed(3)}</td>
                        <td className="mono">
                          <span className={r.deviation >= 3 ? 'deviation-high' : ''}>
                            {r.deviation.toFixed(2)}×
                          </span>
                        </td>
                        <td>
                          <span className={`tag ${r.source === 'manual' ? 'tag-manual' : 'tag-auto'}`}>
                            {r.source === 'manual' ? '手动' : '自动'}
                          </span>
                        </td>
                        <td>
                          <button className="del-btn" onClick={() => onRemoveAnomaly(r.index)} title="移除标记">
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="panel-empty">暂无异常记录<br /><small>框选图表区域或启用自动检测</small></div>
            )}
          </div>

          <div className="panel-section legend-section">
            <div className="section-title">图例</div>
            <div className="legend-row">
              <span className="dot dot-normal" />
              <span>正常数据点</span>
              <span className="dot dot-auto" />
              <span>自动检测</span>
              <span className="dot dot-manual" />
              <span>手动标注</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Panel;
