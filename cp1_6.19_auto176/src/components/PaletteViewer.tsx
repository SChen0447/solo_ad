import React, { useRef, useEffect, useCallback } from 'react';
import { ParticleSystem } from '@/utils/particleSystem';

interface PaletteViewerProps {
  palette: string[];
  transitioning: boolean;
}

const PaletteViewer: React.FC<PaletteViewerProps> = ({ palette, transitioning }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const systemRef = useRef<ParticleSystem | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (!systemRef.current) {
      const ps = new ParticleSystem();
      ps.init(canvasRef.current);
      ps.start();
      systemRef.current = ps;
    }

    if (palette.length > 0) {
      systemRef.current.setColors(palette);
    }

    return () => {};
  }, [palette]);

  useEffect(() => {
    const handleResize = () => {
      if (systemRef.current) {
        systemRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (systemRef.current) {
        systemRef.current.destroy();
        systemRef.current = null;
      }
    };
  }, []);

  const getTextColor = useCallback((hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#1a1a2e' : '#f0f0f5';
  }, []);

  if (palette.length === 0) {
    return (
      <div className="palette-viewer glass">
        <canvas ref={canvasRef} className="palette-canvas" />
        <div className="palette-empty">选择一个关键词开始探索色彩</div>
      </div>
    );
  }

  return (
    <div className="palette-viewer glass" style={{ padding: 0 }}>
      <canvas ref={canvasRef} className="palette-canvas" />
      <div className="palette-strip">
        {palette.map((color, index) => (
          <div
            key={`${color}-${index}`}
            className={`color-block ${transitioning ? 'color-slide' : ''}`}
            style={{
              backgroundColor: color,
              animationDelay: transitioning ? `${index * 0.08}s` : undefined,
            }}
          >
            <span
              className="hex-value"
              style={{ color: getTextColor(color) }}
            >
              {color.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PaletteViewer;
