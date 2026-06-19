import React from 'react';
import { Info } from 'lucide-react';

export const LegendPanel: React.FC = () => {
  return (
    <div className="legend-panel">
      <div className="legend-header">
        <Info size={14} />
        <span>图例</span>
      </div>

      <div className="legend-item">
        <span className="legend-label">风速</span>
        <div className="wind-color-bar">
          <span className="wind-color-label low">低</span>
          <div className="wind-gradient" />
          <span className="wind-color-label high">高</span>
        </div>
      </div>

      <div className="legend-item">
        <div className="legend-swatch shadow-swatch" />
        <span className="legend-text">阴影区域</span>
      </div>

      <div className="legend-item">
        <div className="legend-swatch building-swatch" />
        <span className="legend-text">建筑体块</span>
      </div>

      <div className="legend-item">
        <div className="legend-swatch selected-swatch" />
        <span className="legend-text">选中建筑</span>
      </div>

      <div className="legend-item">
        <div className="legend-swatch section-swatch" />
        <span className="legend-text">剖面切割面</span>
      </div>
    </div>
  );
};

export default LegendPanel;
