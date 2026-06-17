import React, { useMemo } from 'react';
import { Formation, PlacedUnit, COLORS } from './types';
import { FORMATIONS } from './data';
import { hexToPixel, getHexCorners } from './hexGrid';

interface DeploymentPanelProps {
  selectedFormationId: string | null;
  onSelectFormation: (id: string) => void;
  placedUnits: PlacedUnit[];
  onUndo: () => void;
  canUndo: boolean;
  isMobile: boolean;
  isPanelOpen: boolean;
  onTogglePanel: () => void;
}

const FormationThumbnail: React.FC<{ formation: Formation; isSelected: boolean; onClick: () => void }> = ({ formation, isSelected, onClick }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const size = 12;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bounds = { minQ: Infinity, maxQ: -Infinity, minR: Infinity, maxR: -Infinity };
    formation.thumbnailPattern.forEach(hex => {
      bounds.minQ = Math.min(bounds.minQ, hex.q);
      bounds.maxQ = Math.max(bounds.maxQ, hex.q);
      bounds.minR = Math.min(bounds.minR, hex.r);
      bounds.maxR = Math.max(bounds.maxR, hex.r);
    });

    const centerQ = (bounds.minQ + bounds.maxQ) / 2;
    const centerR = (bounds.minR + bounds.maxR) / 2;
    const offsetX = canvas.width / 2 - centerQ * size * 1.5;
    const offsetY = canvas.height / 2 - centerR * size * Math.sqrt(3);

    formation.thumbnailPattern.forEach(hex => {
      const { x, y } = hexToPixel(hex, size);
      const corners = getHexCorners(x + offsetX, y + offsetY, size * 0.9);

      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      corners.forEach((corner, i) => {
        if (i > 0) ctx.lineTo(corner.x, corner.y);
      });
      ctx.closePath();
      ctx.fillStyle = isSelected ? COLORS.GRID_SELECTED : COLORS.GRID_FILL;
      ctx.fill();
      ctx.strokeStyle = COLORS.GRID_STROKE;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }, [formation, isSelected]);

  return (
    <canvas
      ref={canvasRef}
      width={100}
      height={80}
      className="formation-thumbnail"
    />
  );
};

const DeploymentPanel: React.FC<DeploymentPanelProps> = ({
  selectedFormationId,
  onSelectFormation,
  placedUnits,
  onUndo,
  canUndo,
  isMobile,
  isPanelOpen,
  onTogglePanel
}) => {
  const unitStats = useMemo(() => {
    const stats = { cavalry: 0, infantry: 0, archer: 0 };
    placedUnits.forEach(unit => {
      stats[unit.unit.type]++;
    });
    return stats;
  }, [placedUnits]);

  const panelContent = (
    <div className="panel-content">
      <h2 className="panel-title">阵型部署</h2>
      <h3 className="section-title">选择阵型</h3>
      <div className="formation-list">
        {FORMATIONS.map(formation => (
          <div
            key={formation.id}
            className={`formation-card ${selectedFormationId === formation.id ? 'selected' : ''}`}
            onClick={() => onSelectFormation(formation.id)}
          >
            <FormationThumbnail
              formation={formation}
              isSelected={selectedFormationId === formation.id}
            />
            <div className="formation-info">
              <div className="formation-name">{formation.name}</div>
              <div className="formation-desc">{formation.description}</div>
            </div>
          </div>
        ))}
      </div>

      <h3 className="section-title">已部署单位</h3>
      <div className="unit-stats">
        <div className="stat-item">
          <span className="stat-dot" style={{ backgroundColor: COLORS.CAVALRY }}></span>
          <span className="stat-label">骑兵</span>
          <span className="stat-count">{unitStats.cavalry}</span>
        </div>
        <div className="stat-item">
          <span className="stat-dot" style={{ backgroundColor: COLORS.INFANTRY }}></span>
          <span className="stat-label">步兵</span>
          <span className="stat-count">{unitStats.infantry}</span>
        </div>
        <div className="stat-item">
          <span className="stat-dot" style={{ backgroundColor: COLORS.ARCHER }}></span>
          <span className="stat-label">弓兵</span>
          <span className="stat-count">{unitStats.archer}</span>
        </div>
        <div className="stat-item total">
          <span className="stat-label">总计</span>
          <span className="stat-count">{placedUnits.length}</span>
        </div>
      </div>

      <button
        className="undo-button"
        onClick={onUndo}
        disabled={!canUndo}
      >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          撤销最后一步
        </button>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button className="mobile-toggle" onClick={onTogglePanel}>
        {isPanelOpen ? '收起面板' : '展开面板'}
        </button>
        <div className={`mobile-panel ${isPanelOpen ? 'open' : ''}`}>
          {panelContent}
        </div>
      </>
    );
  }

  return (
    <aside className="deployment-panel">
      {panelContent}
    </aside>
  );
};

export default DeploymentPanel;
