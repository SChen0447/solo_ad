import { BASE_PLANETS, PlanetData } from '../utils/orbitPhysics';
import './ControlPanel.css';

interface ControlPanelProps {
  selectedPlanet: string;
  onSelectPlanet: (planet: string) => void;
  planetData: PlanetData | null;
  massMultiplier: number;
  radiusMultiplier: number;
  onMassChange: (value: number) => void;
  onRadiusChange: (value: number) => void;
  isPaused: boolean;
  currentAngle: number;
}

const planetKeys = ['mercury', 'venus', 'earth', 'mars'];

const ControlPanel = ({
  selectedPlanet,
  onSelectPlanet,
  planetData,
  massMultiplier,
  radiusMultiplier,
  onMassChange,
  onRadiusChange,
  isPaused,
  currentAngle
}: ControlPanelProps) => {
  const selectedConfig = BASE_PLANETS[selectedPlanet];
  const progress = ((currentAngle % (Math.PI * 2)) / (Math.PI * 2)) * 100;

  return (
    <div className="control-panel">
      <div className="planet-list">
        <h3 className="panel-title">行星选择</h3>
        <div className="planet-items">
          {planetKeys.map((key) => {
            const config = BASE_PLANETS[key];
            const isSelected = selectedPlanet === key;
            return (
              <div
                key={key}
                className={`planet-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectPlanet(key)}
              >
                <div
                  className="planet-thumbnail"
                  style={{ backgroundColor: config.color }}
                />
                <span className="planet-name">{config.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="data-panel">
        <h3 className="panel-title">轨道数据</h3>
        {planetData && (
          <div className="data-items">
            <div className="data-item">
              <div className="data-label">距太阳距离</div>
              <div className="data-value-row">
                <span
                  className="data-value"
                  style={{ color: selectedConfig.color }}
                >
                  {planetData.orbitRadius.toFixed(3)}
                </span>
                <span className="data-unit">AU</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(planetData.orbitRadius / (BASE_PLANETS.mars.orbitRadius * 2)) * 100}%`,
                      backgroundColor: selectedConfig.color
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="data-item">
              <div className="data-label">公转周期</div>
              <div className="data-value-row">
                <span
                  className="data-value"
                  style={{ color: selectedConfig.color }}
                >
                  {planetData.orbitalPeriod.toFixed(3)}
                </span>
                <span className="data-unit">地球年</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill arc-progress"
                    style={{
                      background: `conic-gradient(${selectedConfig.color} ${progress}%, transparent ${progress}%)`
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="data-item">
              <div className="data-label">公转速度</div>
              <div className="data-value-row">
                <span
                  className="data-value"
                  style={{ color: selectedConfig.color }}
                >
                  {planetData.orbitalVelocity.toFixed(2)}
                </span>
                <span className="data-unit">km/s</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(planetData.orbitalVelocity / 50) * 100}%`,
                      backgroundColor: selectedConfig.color
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        <div className={`status-badge ${isPaused ? 'paused' : 'running'}`}>
          {isPaused ? '已暂停' : '运行中'}
        </div>
      </div>

      <div className="control-section">
        <h3 className="panel-title">参数调节</h3>
        <div className="slider-group">
          <div className="slider-item">
            <div className="slider-label">
              <span>质量调节</span>
              <span className="slider-value" style={{ color: selectedConfig.color }}>
                {massMultiplier.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              value={massMultiplier}
              onChange={(e) => onMassChange(parseFloat(e.target.value))}
              className="slider"
              style={{ '--slider-color': selectedConfig.color } as React.CSSProperties}
            />
            <div className="slider-info">
              <span>当前质量: {(planetData?.mass || 0).toFixed(3)} 地球质量</span>
            </div>
          </div>

          <div className="slider-item">
            <div className="slider-label">
              <span>轨道半径调节</span>
              <span className="slider-value" style={{ color: selectedConfig.color }}>
                {radiusMultiplier.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={radiusMultiplier}
              onChange={(e) => onRadiusChange(parseFloat(e.target.value))}
              className="slider"
              style={{ '--slider-color': selectedConfig.color } as React.CSSProperties}
            />
            <div className="slider-info">
              <span>当前轨道: {(planetData?.orbitRadius || 0).toFixed(3)} AU</span>
            </div>
          </div>
        </div>

        <div className="hint-text">
          按空格键暂停/恢复运动
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
