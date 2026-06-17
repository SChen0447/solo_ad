import React, { useState } from 'react';
import type { Star, StarGenerationParams, PlanetOrbit } from './types';

interface ControlPanelProps {
  params: StarGenerationParams;
  onParamsChange: (params: StarGenerationParams) => void;
  onGenerate: () => void;
  onGalacticView: () => void;
  onResetView: () => void;
  onStartConnection: () => void;
  isGenerating: boolean;
  isConnecting: boolean;
  selectedStar: Star | null;
  onAddPlanet: (orbit: Omit<PlanetOrbit, 'id'>) => void;
  planets: PlanetOrbit[];
  onRemovePlanet: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface InfoPanelProps {
  star: Star | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const planetColors = [
  '#4FC3F7',
  '#81C784',
  '#FFB74D',
  '#F06292',
  '#BA68C8',
  '#4DD0E1',
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  params,
  onParamsChange,
  onGenerate,
  onGalacticView,
  onResetView,
  onStartConnection,
  isGenerating,
  isConnecting,
  selectedStar,
  onAddPlanet,
  planets,
  onRemovePlanet,
  collapsed,
  onToggleCollapse,
}) => {
  const [planetRadius, setPlanetRadius] = useState(1);
  const [planetSpeed, setPlanetSpeed] = useState(1);
  const [semiMajorAxis, setSemiMajorAxis] = useState(15);
  const [eccentricity, setEccentricity] = useState(0.1);
  const [inclination, setInclination] = useState(0);
  const [planetColor, setPlanetColor] = useState(planetColors[0]);

  const handleAddPlanet = () => {
    if (!selectedStar) return;
    onAddPlanet({
      centerStarId: selectedStar.id,
      semiMajorAxis,
      eccentricity,
      inclination: inclination * Math.PI / 180,
      speed: planetSpeed,
      planetRadius,
      planetColor,
    });
  };

  const starPlanets = planets.filter(p => p.centerStarId === selectedStar?.id);

  return (
    <>
      <button className="panel-toggle" onClick={onToggleCollapse}>
        {collapsed ? '☰' : '✕'}
      </button>
      <div className={`control-panel ${collapsed ? 'collapsed' : ''}`}>
        <div className="panel-section">
          <h2 className="panel-title">星图参数</h2>
          
          <div className="form-group">
            <label className="form-label">
              星体数量
              <span className="slider-value">{params.count}</span>
            </label>
            <input
              type="range"
              className="form-slider"
              min="100"
              max="1000"
              step="50"
              value={params.count}
              onChange={(e) => onParamsChange({ ...params, count: Number(e.target.value) })}
              disabled={isGenerating}
            />
          </div>

          <div className="form-group">
            <label className="form-label">分布范围</label>
            <select
              className="form-select"
              value={params.distribution}
              onChange={(e) => onParamsChange({ ...params, distribution: e.target.value as 'sphere' | 'disk' })}
              disabled={isGenerating}
            >
              <option value="sphere">球形分布</option>
              <option value="disk">圆盘状分布</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">随机种子</label>
            <input
              type="number"
              className="form-input"
              value={params.seed}
              onChange={(e) => onParamsChange({ ...params, seed: Number(e.target.value) })}
              disabled={isGenerating}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? '生成中...' : '✨ 生成星图'}
          </button>
        </div>

        <div className="panel-section">
          <h2 className="panel-title">视角控制</h2>
          <button className="btn" onClick={onGalacticView}>
            🌌 银河俯视
          </button>
          <button className="btn btn-secondary" onClick={onResetView}>
            🔄 重置视角
          </button>
        </div>

        <div className="panel-section">
          <h2 className="panel-title">星座编辑</h2>
          <button
            className={`btn ${isConnecting ? 'btn-primary' : ''}`}
            onClick={onStartConnection}
            disabled={!selectedStar && !isConnecting}
          >
            {isConnecting ? '🔗 连线中... 点击第二颗星' : '✏️ 开始连线'}
          </button>
          <p className="help-text" style={{ marginTop: '12px' }}>
            <strong>提示：</strong>
            <br />- 点击第一颗星后点击"开始连线"
            <br />- 再点击第二颗星完成连线
            <br />- 右键点击连线可删除
            <br />- 右键空白处取消连线
          </p>
        </div>

        {selectedStar && (
          <div className="panel-section">
            <h2 className="panel-title">行星轨道</h2>
            <div className="planet-form">
              <h4>为选中星体添加行星</h4>
              
              <div className="form-group">
                <label className="form-label">
                  行星半径 <span className="slider-value">{planetRadius.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  className="form-slider"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={planetRadius}
                  onChange={(e) => setPlanetRadius(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  运动速度 <span className="slider-value">{planetSpeed.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  className="form-slider"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={planetSpeed}
                  onChange={(e) => setPlanetSpeed(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  轨道半径 <span className="slider-value">{semiMajorAxis}</span>
                </label>
                <input
                  type="range"
                  className="form-slider"
                  min="8"
                  max="30"
                  step="1"
                  value={semiMajorAxis}
                  onChange={(e) => setSemiMajorAxis(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  偏心率 <span className="slider-value">{eccentricity.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  className="form-slider"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={eccentricity}
                  onChange={(e) => setEccentricity(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  轨道倾角 <span className="slider-value">{inclination}°</span>
                </label>
                <input
                  type="range"
                  className="form-slider"
                  min="0"
                  max="90"
                  step="5"
                  value={inclination}
                  onChange={(e) => setInclination(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">行星颜色</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {planetColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setPlanetColor(color)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: color,
                        border: planetColor === color ? '2px solid #FFD54F' : '2px solid transparent',
                        cursor: 'pointer',
                        boxShadow: planetColor === color ? `0 0 10px ${color}` : 'none',
                        transition: 'all 0.2s',
                      }}
                    />
                  ))}
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleAddPlanet}>
                🪐 添加行星
              </button>

              {starPlanets.length > 0 && (
                <div className="planet-list">
                  {starPlanets.map((planet, index) => (
                    <div key={planet.id} className="planet-item">
                      <span className="planet-name">
                        <span
                          className="color-indicator"
                          style={{ background: planet.planetColor, color: planet.planetColor }}
                        />
                        行星 {index + 1}
                      </span>
                      <button
                        className="remove-btn"
                        onClick={() => onRemovePlanet(planet.id)}
                        title="删除行星"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="panel-section">
          <p className="help-text">
            <strong>操作说明：</strong>
            <br />• 鼠标左键拖拽：旋转视角
            <br />• 鼠标滚轮：缩放
            <br />• 右键拖拽：平移
            <br />• 点击星体：查看详情
          </p>
        </div>
      </div>
    </>
  );
};

export const InfoPanel: React.FC<InfoPanelProps> = ({ star, collapsed, onToggleCollapse }) => {
  const spectralNames: Record<string, string> = {
    O: 'O型 - 蓝超巨星',
    B: 'B型 - 蓝巨星',
    A: 'A型 - 白星',
    F: 'F型 - 黄白星',
    G: 'G型 - 黄星',
    K: 'K型 - 橙星',
    M: 'M型 - 红矮星',
  };

  return (
    <>
      <button className="info-toggle" onClick={onToggleCollapse}>
        {collapsed ? 'ℹ' : '✕'}
      </button>
      <div className={`info-panel ${collapsed ? 'collapsed' : ''}`}>
        {star ? (
          <>
            <h3 className="info-title">
              <span
                className="color-indicator"
                style={{
                  background: `rgb(${star.color.r * 255}, ${star.color.g * 255}, ${star.color.b * 255})`,
                  color: `rgb(${star.color.r * 255}, ${star.color.g * 255}, ${star.color.b * 255})`,
                }}
              />
              星体信息
            </h3>
            <div className="info-item">
              <span className="info-label">X 坐标</span>
              <span className="info-value">{star.position.x.toFixed(2)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Y 坐标</span>
              <span className="info-value">{star.position.y.toFixed(2)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Z 坐标</span>
              <span className="info-value">{star.position.z.toFixed(2)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">亮度等级</span>
              <span className="info-value">{(star.brightness * 100).toFixed(0)}%</span>
            </div>
            <div className="info-item">
              <span className="info-label">光谱类型</span>
              <span className={`info-value spectral-${star.spectralType}`}>
                {spectralNames[star.spectralType]}
              </span>
            </div>
          </>
        ) : (
          <div className="empty-info">
            点击星图中的星体查看详细信息
          </div>
        )}
      </div>
    </>
  );
};

export const LoadingOverlay: React.FC<{ visible: boolean }> = ({ visible }) => {
  if (!visible) return null;
  return (
    <div className="loading-overlay">
      <div className="loading-spinner" />
      <div className="loading-text">正在生成星图...</div>
    </div>
  );
};

export const StatsBar: React.FC<{ starCount: number; fps: number; lineCount: number; planetCount: number }> = ({
  starCount,
  fps,
  lineCount,
  planetCount,
}) => {
  return (
    <div className="stats-bar">
      <div className="stats-item">
        ⭐ <span className="stats-value">{starCount}</span> 星体
      </div>
      <div className="stats-item">
        📈 <span className="stats-value">{fps}</span> FPS
      </div>
      <div className="stats-item">
        🔗 <span className="stats-value">{lineCount}</span> 连线
      </div>
      <div className="stats-item">
        🪐 <span className="stats-value">{planetCount}</span> 行星
      </div>
    </div>
  );
};
