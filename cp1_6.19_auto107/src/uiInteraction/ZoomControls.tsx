import React from 'react';
import '../styles/ZoomControls.css';

interface ZoomControlsProps {
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  onZoomChange: (zoom: number) => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  minZoom = 0.01,
  maxZoom = 2,
  onZoomChange,
}) => {
  const handleZoomIn = () => {
    const newZoom = Math.min(maxZoom, zoom + 0.1);
    onZoomChange(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(minZoom, zoom - 0.1);
    onZoomChange(newZoom);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    onZoomChange(value);
  };

  const handleReset = () => {
    onZoomChange(0.1);
  };

  const sliderPercentage = ((zoom - minZoom) / (maxZoom - minZoom)) * 100;

  return (
    <div className="zoom-controls">
      <div className="zoom-controls-buttons">
        <button
          className="zoom-btn zoom-out-btn"
          onClick={handleZoomOut}
          disabled={zoom <= minZoom}
          aria-label="缩小"
          title="缩小"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="currentColor"
              d="M19 13H5v-2h14v2z"
            />
          </svg>
        </button>
        <button
          className="zoom-btn zoom-reset-btn"
          onClick={handleReset}
          aria-label="重置缩放"
          title="重置缩放"
        >
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
            />
          </svg>
        </button>
        <button
          className="zoom-btn zoom-in-btn"
          onClick={handleZoomIn}
          disabled={zoom >= maxZoom}
          aria-label="放大"
          title="放大"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="currentColor"
              d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
            />
          </svg>
        </button>
      </div>

      <div className="zoom-slider-container">
        <input
          type="range"
          className="zoom-slider"
          min={minZoom}
          max={maxZoom}
          step={0.01}
          value={zoom}
          onChange={handleSliderChange}
          aria-label="缩放滑块"
          style={{
            background: `linear-gradient(to right, #8b4513 0%, #8b4513 ${sliderPercentage}%, #d4a574 ${sliderPercentage}%, #d4a574 100%)`,
          }}
        />
        <div className="zoom-labels">
          <span className="zoom-label">{Math.round(minZoom * 100)}%</span>
          <span className="zoom-label">{Math.round(maxZoom * 100)}%</span>
        </div>
      </div>
    </div>
  );
};

export default ZoomControls;
