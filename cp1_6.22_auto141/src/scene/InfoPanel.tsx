import { X } from 'lucide-react';
import type { CelestialBody } from '../types';

interface InfoPanelProps {
  body: CelestialBody | null;
  onClose: () => void;
}

export default function InfoPanel({ body, onClose }: InfoPanelProps) {
  if (!body) return null;

  return (
    <div className="info-panel-overlay" onClick={onClose}>
      <div className="info-panel" onClick={(e) => e.stopPropagation()}>
        <button className="info-panel-close" onClick={onClose} aria-label="关闭">
          <X size={18} />
        </button>
        <div className="info-panel-header">
          <div
            className="info-panel-color-indicator"
            style={{ backgroundColor: body.baseColor }}
          />
          <h2 className="info-panel-title">{body.name}</h2>
        </div>
        <div className="info-panel-content">
          <div className="info-row">
            <span className="info-label">类型</span>
            <span className="info-value">{body.type}</span>
          </div>
          <div className="info-row">
            <span className="info-label">距离</span>
            <span className="info-value">{body.distance}</span>
          </div>
          <div className="info-row">
            <span className="info-label">大小</span>
            <span className="info-value">{body.size}</span>
          </div>
          <div className="info-description">{body.description}</div>
        </div>
      </div>
    </div>
  );
}
