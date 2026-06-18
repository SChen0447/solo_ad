import { useState, useEffect } from 'react';
import { useStarStore } from '../store/starStore';
import { STAGE_INFO } from '../physics/starEvolution';

interface RegionInfo {
  id: string;
  name: string;
  nameCN: string;
  description: string;
  position: { top: string; left: string };
}

const STAR_REGIONS: RegionInfo[] = [
  {
    id: 'core',
    name: 'Core',
    nameCN: '核心',
    description: '恒星中心区域，温度和压力极高，正在进行核聚变反应，温度可达1500万K以上。',
    position: { top: '50%', left: '50%' }
  },
  {
    id: 'radiation',
    name: 'Radiation Zone',
    nameCN: '辐射区',
    description: '能量以辐射形式向外传递，光子需要经过多次散射才能穿过这一层。',
    position: { top: '35%', left: '30%' }
  },
  {
    id: 'convection',
    name: 'Convection Zone',
    nameCN: '对流区',
    description: '能量通过对流运动向外传递，热物质上升、冷物质下沉，形成可见的米粒组织。',
    position: { top: '65%', left: '70%' }
  }
];

export default function InfoOverlay() {
  const showInfoCard = useStarStore(state => state.showInfoCard);
  const currentInfoStage = useStarStore(state => state.currentInfoStage);
  const hideInfoCard = useStarStore(state => state.hideInfoCard);
  const physicsState = useStarStore(state => state.physicsState);
  const stage = useStarStore(state => state.stage);
  const mass = useStarStore(state => state.mass);

  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [showRegions, setShowRegions] = useState(false);

  useEffect(() => {
    if (showInfoCard && currentInfoStage) {
      const timer = setTimeout(() => {
        hideInfoCard();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showInfoCard, currentInfoStage, hideInfoCard]);

  const formatNumber = (num: number) => {
    if (num >= 1e6) return (num / 1e6).toFixed(2) + ' 百万';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + ' 千';
    return num.toFixed(0);
  };

  return (
    <>
      <div className="stage-badge">
        <span className="badge-icon">{STAGE_INFO[stage].icon}</span>
        <span className="badge-text">{STAGE_INFO[stage].nameCN}</span>
      </div>

      <button
        className="region-toggle-btn"
        onClick={() => setShowRegions(!showRegions)}
      >
        {showRegions ? '隐藏结构' : '显示结构'}
      </button>

      {showRegions && STAR_REGIONS.map((region) => (
        <div
          key={region.id}
          className="region-marker"
          style={{ top: region.position.top, left: region.position.left }}
          onMouseEnter={() => setHoveredRegion(region.id)}
          onMouseLeave={() => setHoveredRegion(null)}
        >
          <div className="marker-dot" />
          <div className="marker-line" />
          <span className="marker-label">{region.nameCN}</span>

          {hoveredRegion === region.id && (
            <div className="region-tooltip glass-panel">
              <h4>{region.nameCN}</h4>
              <p className="region-en-name">{region.name}</p>
              <p className="region-desc">{region.description}</p>
              {region.id === 'core' && (
                <div className="region-stat">
                  <span>温度：</span>
                  <span className="stat-highlight">约1500万 K</span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {showInfoCard && currentInfoStage && (
        <div className="info-card glass-panel" onClick={hideInfoCard}>
          <div className="info-card-header">
            <span className="info-card-icon">{STAGE_INFO[currentInfoStage].icon}</span>
            <div>
              <h3>{STAGE_INFO[currentInfoStage].nameCN}</h3>
              <p className="info-card-en">{STAGE_INFO[currentInfoStage].name}</p>
            </div>
          </div>
          <p className="info-card-desc">{STAGE_INFO[currentInfoStage].description}</p>
          <div className="info-card-stats">
            <div className="info-stat">
              <span className="info-stat-label">表面温度</span>
              <span className="info-stat-value">
                {formatNumber(physicsState.temperature)} K
              </span>
            </div>
            <div className="info-stat">
              <span className="info-stat-label">半径</span>
              <span className="info-stat-value">
                {physicsState.radius.toFixed(2)} R☉
              </span>
            </div>
            <div className="info-stat">
              <span className="info-stat-label">质量</span>
              <span className="info-stat-value">
                {mass.toFixed(1)} M☉
              </span>
            </div>
          </div>
          <p className="info-card-hint">点击任意位置关闭</p>
        </div>
      )}

      <div className="legend-panel glass-panel">
        <h4>图例说明</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ffcc66' }} />
            <span>主序星</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ff6633' }} />
            <span>红巨星</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#88ccff' }} />
            <span>白矮星</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ffffff' }} />
            <span>超新星</span>
          </div>
        </div>
      </div>
    </>
  );
}
