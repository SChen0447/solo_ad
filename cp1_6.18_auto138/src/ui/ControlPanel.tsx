import React, { useCallback } from 'react';
import { useAppStore } from '../store';
import { loadOceanCurrentData, findNearestCurrent } from '../data/CurrentDataLoader';

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 20,
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(10, 15, 40, 0.6)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: 10,
  padding: '14px 24px',
  display: 'flex',
  alignItems: 'center',
  gap: 20,
  zIndex: 100,
  border: '1px solid rgba(100, 150, 255, 0.15)',
};

const btnBase: React.CSSProperties = {
  background: 'rgba(60, 120, 255, 0.3)',
  border: '1px solid rgba(100, 150, 255, 0.3)',
  color: 'white',
  padding: '8px 18px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
  fontFamily: 'inherit',
  transition: 'all 0.2s ease',
  whiteSpace: 'nowrap',
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(180, 200, 255, 0.8)',
  fontSize: 12,
  display: 'block',
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  background: 'rgba(20, 30, 60, 0.6)',
  border: '1px solid rgba(100, 150, 255, 0.25)',
  color: 'white',
  padding: '6px 10px',
  borderRadius: 5,
  width: 80,
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  width: 90,
  cursor: 'pointer',
};

const sliderStyle: React.CSSProperties = {
  width: 100,
  accentColor: '#4488ff',
  cursor: 'pointer',
};

const infoPanelStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 20,
  right: 20,
  background: 'rgba(10, 15, 40, 0.6)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: 10,
  padding: '16px 22px',
  zIndex: 100,
  border: '1px solid rgba(100, 150, 255, 0.15)',
  minWidth: 220,
  color: 'white',
};

export default function ControlPanel() {
  const {
    isPlaying,
    speed,
    density,
    markerInfo,
    latInput,
    lngInput,
    togglePlaying,
    setSpeed,
    setDensity,
    setMarkerPosition,
    setMarkerInfo,
    setLatInput,
    setLngInput,
  } = useAppStore();

  const handleLocate = useCallback(() => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (isNaN(lat) || isNaN(lng)) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
    setMarkerPosition({ lat, lng });
    const currents = loadOceanCurrentData();
    const nearest = findNearestCurrent(lat, lng, currents);
    if (nearest) {
      setMarkerInfo({
        name: nearest.current.name,
        nameZh: nearest.current.nameZh,
        speed: nearest.current.speed,
        direction: nearest.current.direction,
        directionZh: nearest.current.directionZh,
      });
    }
  }, [latInput, lngInput, setMarkerPosition, setMarkerInfo]);

  return (
    <>
      <div style={panelStyle}>
        <div>
          <button
            style={btnBase}
            onClick={togglePlaying}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = 'rgba(60, 120, 255, 0.8)';
              (e.target as HTMLElement).style.transform = 'scale(1.05)';
              (e.target as HTMLElement).style.boxShadow = '0 2px 12px rgba(60, 120, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'rgba(60, 120, 255, 0.3)';
              (e.target as HTMLElement).style.transform = 'scale(1)';
              (e.target as HTMLElement).style.boxShadow = 'none';
            }}
          >
            {isPlaying ? '⏸ Pause' : '▶ Start'}
          </button>
        </div>

        <div>
          <span style={labelStyle}>Speed: {speed.toFixed(1)}x</span>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            style={sliderStyle}
          />
        </div>

        <div>
          <span style={labelStyle}>Density</span>
          <select
            value={density}
            onChange={(e) => setDensity(e.target.value as 'low' | 'medium' | 'high')}
            style={selectStyle}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div style={{ borderLeft: '1px solid rgba(100, 150, 255, 0.2)', paddingLeft: 16, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div>
            <span style={labelStyle}>Lat</span>
            <input
              type="text"
              value={latInput}
              onChange={(e) => setLatInput(e.target.value)}
              placeholder="0.00"
              style={inputStyle}
            />
          </div>
          <div>
            <span style={labelStyle}>Lng</span>
            <input
              type="text"
              value={lngInput}
              onChange={(e) => setLngInput(e.target.value)}
              placeholder="0.00"
              style={inputStyle}
            />
          </div>
          <button
            style={btnBase}
            onClick={handleLocate}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = 'rgba(60, 120, 255, 0.8)';
              (e.target as HTMLElement).style.transform = 'scale(1.05)';
              (e.target as HTMLElement).style.boxShadow = '0 2px 12px rgba(60, 120, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'rgba(60, 120, 255, 0.3)';
              (e.target as HTMLElement).style.transform = 'scale(1)';
              (e.target as HTMLElement).style.boxShadow = 'none';
            }}
          >
            Locate
          </button>
        </div>
      </div>

      {markerInfo && (
        <div style={infoPanelStyle}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'rgba(140, 200, 255, 1)' }}>
            📍 Nearest Current
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            {markerInfo.nameZh} ({markerInfo.name})
          </div>
          <div style={{ fontSize: 13, color: 'rgba(180, 200, 255, 0.8)', lineHeight: 1.6 }}>
            <div>Avg Speed: {markerInfo.speed.toFixed(1)} m/s</div>
            <div>Direction: {markerInfo.directionZh} ({markerInfo.direction})</div>
          </div>
        </div>
      )}
    </>
  );
}
