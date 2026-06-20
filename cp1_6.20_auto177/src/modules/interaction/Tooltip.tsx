import React from 'react';
import { EarthquakeData } from '../data/DataLoader';
import './Tooltip.css';

interface TooltipProps {
  data: EarthquakeData | null;
  position: { x: number; y: number } | null;
}

export const Tooltip: React.FC<TooltipProps> = ({ data, position }) => {
  if (!data || !position) {
    return null;
  }

  return (
    <div
      className="earthquake-tooltip"
      style={{
        left: position.x + 15,
        top: position.y + 15
      }}
    >
      <div className="tooltip-row">
        <span className="tooltip-label">震级:</span>
        <span className="tooltip-value mag">{data.magnitude.toFixed(1)}</span>
      </div>
      <div className="tooltip-row">
        <span className="tooltip-label">深度:</span>
        <span className="tooltip-value depth">{(data.depth * 70).toFixed(1)} km</span>
      </div>
      <div className="tooltip-row">
        <span className="tooltip-label">时间:</span>
        <span className="tooltip-value">
          {new Date(data.timestamp).toLocaleDateString('zh-CN')}
        </span>
      </div>
    </div>
  );
};
