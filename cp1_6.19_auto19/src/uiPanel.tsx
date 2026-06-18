import React, { useEffect, useState, useMemo } from 'react';
import { useSeismicStore } from './store';
import { EPICENTER_OPTIONS, MAX_TIME, AlertEvent } from './types';

const navBarStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 60,
  background: '#0a0e27',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
  zIndex: 1000,
  borderBottom: '1px solid rgba(255, 140, 0, 0.3)'
};

const titleStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '1.5rem',
  fontWeight: 700,
  fontFamily: "'Rajdhani', sans-serif",
  letterSpacing: '2px'
};

const resetButtonStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: '#ff4757',
  border: 'none',
  cursor: 'pointer',
  color: '#ffffff',
  fontSize: 18,
  transition: 'transform 0.3s ease, filter 0.3s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const sidePanelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 80,
  right: 20,
  width: 300,
  background: 'rgba(10, 14, 39, 0.9)',
  border: '1px solid rgba(255, 140, 0, 0.4)',
  borderRadius: 12,
  padding: 20,
  color: '#ffffff',
  fontFamily: "'Rajdhani', sans-serif",
  zIndex: 1000,
  backdropFilter: 'blur(10px)'
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 600,
  color: '#ff8c00',
  marginBottom: 12,
  borderBottom: '1px solid rgba(255, 140, 0, 0.3)',
  paddingBottom: 8
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  color: '#a0a0c0',
  marginBottom: 6
};

const sliderContainerStyle: React.CSSProperties = {
  marginTop: 16,
  marginBottom: 24
};

const timeDisplayStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.9rem',
  color: '#ff8c00',
  marginBottom: 8
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: 6,
  borderRadius: 3,
  background: '#1a1f3a',
  outline: 'none',
  WebkitAppearance: 'none',
  cursor: 'pointer'
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: '#1a1f3a',
  border: '1px solid rgba(255, 140, 0, 0.3)',
  borderRadius: 6,
  color: '#ffffff',
  fontSize: '0.9rem',
  fontFamily: "'Rajdhani', sans-serif",
  cursor: 'pointer',
  outline: 'none'
};

const alertListStyle: React.CSSProperties = {
  maxHeight: 280,
  overflowY: 'auto',
  marginTop: 8
};

const playButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  marginTop: 12,
  background: '#ff8c00',
  border: 'none',
  borderRadius: 6,
  color: '#ffffff',
  fontSize: '1rem',
  fontWeight: 600,
  fontFamily: "'Rajdhani', sans-serif",
  cursor: 'pointer',
  transition: 'background 0.2s ease'
};

interface AlertItemProps {
  alert: AlertEvent;
  isNew: boolean;
}

function AlertItem({ alert, isNew }: AlertItemProps) {
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setFadeIn(true));
  }, []);

  const style: React.CSSProperties = {
    padding: '10px 12px',
    marginBottom: 8,
    borderRadius: 6,
    background: isNew ? 'rgba(255, 140, 0, 0.25)' : 'rgba(255, 140, 0, 0.08)',
    border: isNew ? '1px solid rgba(255, 140, 0, 0.8)' : '1px solid rgba(255, 140, 0, 0.2)',
    fontSize: '0.85rem',
    opacity: fadeIn ? 1 : 0,
    transform: fadeIn ? 'translateX(0)' : 'translateX(20px)',
    transition: 'opacity 0.4s ease, transform 0.4s ease, background 0.5s ease, border 0.5s ease',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const waveBadgeStyle: React.CSSProperties = {
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: '0.75rem',
    fontWeight: 700,
    background: alert.waveType === 'P' ? 'rgba(0, 212, 255, 0.3)' : 'rgba(255, 140, 0, 0.4)',
    color: alert.waveType === 'P' ? '#00d4ff' : '#ff8c00'
  };

  return (
    <div style={style}>
      <div>
        <span style={{ fontWeight: 600 }}>传感器 #{alert.sensorId}</span>
        <span style={{ margin: '0 8px', opacity: 0.5 }}>|</span>
        <span style={waveBadgeStyle}>{alert.waveType}波</span>
      </div>
      <span style={{ color: '#a0a0c0' }}>{alert.arrivalTime.toFixed(2)}s</span>
    </div>
  );
}

function Tooltip() {
  const sensor = useSeismicStore(state => state.selectedSensor);
  const hoverPos = useSeismicStore(state => state.hoverPosition);

  if (!sensor || !hoverPos) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(hoverPos.x + 10, window.innerWidth - 220),
    top: hoverPos.y + 10,
    background: 'rgba(20, 20, 40, 0.95)',
    color: '#ffffff',
    padding: 16,
    borderRadius: 8,
    fontSize: '0.85rem',
    fontFamily: "'Rajdhani', sans-serif",
    zIndex: 2000,
    minWidth: 200,
    border: '1px solid rgba(255, 140, 0, 0.5)',
    backdropFilter: 'blur(5px)'
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 6
  };

  const labelColor = '#a0a0c0';
  const valueColor = '#ffffff';

  return (
    <div style={style}>
      <div style={{ ...rowStyle, marginBottom: 10, borderBottom: '1px solid rgba(255,140,0,0.3)', paddingBottom: 8 }}>
        <span style={{ color: '#ff8c00', fontWeight: 700 }}>传感器 #{sensor.id}</span>
      </div>
      <div style={rowStyle}>
        <span style={{ color: labelColor }}>纬度:</span>
        <span style={{ color: valueColor }}>{sensor.lat.toFixed(4)}°</span>
      </div>
      <div style={rowStyle}>
        <span style={{ color: labelColor }}>经度:</span>
        <span style={{ color: valueColor }}>{sensor.lon.toFixed(4)}°</span>
      </div>
      <div style={rowStyle}>
        <span style={{ color: labelColor }}>P波到达:</span>
        <span style={{ color: '#00d4ff' }}>{sensor.pWaveArrivalTime.toFixed(3)}s</span>
      </div>
      <div style={rowStyle}>
        <span style={{ color: labelColor }}>S波到达:</span>
        <span style={{ color: '#ff8c00' }}>{sensor.sWaveArrivalTime.toFixed(3)}s</span>
      </div>
      <div style={rowStyle}>
        <span style={{ color: labelColor }}>峰值振幅:</span>
        <span style={{ color: valueColor }}>{(sensor.peakAmplitude * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}

export function UIPanel() {
  const time = useSeismicStore(state => state.time);
  const setTime = useSeismicStore(state => state.setTime);
  const epicenterId = useSeismicStore(state => state.epicenterId);
  const setEpicenter = useSeismicStore(state => state.setEpicenter);
  const alerts = useSeismicStore(state => state.alerts);
  const isPlaying = useSeismicStore(state => state.isPlaying);
  const togglePlaying = useSeismicStore(state => state.togglePlaying);
  const reset = useSeismicStore(state => state.reset);
  const [isHovered, setIsHovered] = useState(false);

  const currentTime = Date.now();
  const recentAlerts = useMemo(() => {
    return alerts
      .filter(a => currentTime - a.timestamp < 10000)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [alerts, currentTime]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render every 100ms to update alert timestamps
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTime(parseFloat(e.target.value));
  };

  const handleEpicenterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEpicenter(e.target.value);
  };

  const resetButtonHoverStyle: React.CSSProperties = {
    ...resetButtonStyle,
    transform: isHovered ? 'rotate(15deg)' : 'rotate(0deg)',
    filter: isHovered ? 'brightness(1.3)' : 'brightness(1)'
  };

  const sliderProgress = (time / MAX_TIME) * 100;

  return (
    <>
      <nav style={navBarStyle}>
        <h1 style={titleStyle}>地震波预警</h1>
        <button
          style={resetButtonHoverStyle}
          onClick={reset}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          title="重置"
        >
          ↺
        </button>
      </nav>

      <div style={sidePanelStyle}>
        <div>
          <div style={sectionTitleStyle}>模拟控制</div>
          <div style={sliderContainerStyle}>
            <div style={timeDisplayStyle}>
              <span>时间进度</span>
              <span>{time.toFixed(2)}s / {MAX_TIME}s</span>
            </div>
            <input
              type="range"
              min="0"
              max={MAX_TIME}
              step="0.01"
              value={time}
              onChange={handleSliderChange}
              style={{
                ...sliderStyle,
                background: `linear-gradient(to right, #ff8c00 ${sliderProgress}%, #1a1f3a ${sliderProgress}%)`
              }}
            />
          </div>
          <button
            style={{
              ...playButtonStyle,
              background: isPlaying ? '#1a1f3a' : '#ff8c00',
              border: isPlaying ? '1px solid #ff8c00' : 'none'
            }}
            onClick={togglePlaying}
          >
            {isPlaying ? '⏸ 暂停' : '▶ 播放'}
          </button>
        </div>

        <div style={{ marginTop: 24 }}>
          <div style={sectionTitleStyle}>震源位置</div>
          <label style={labelStyle}>选择预设震源</label>
          <select value={epicenterId} onChange={handleEpicenterChange} style={selectStyle}>
            {EPICENTER_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 24 }}>
          <div style={sectionTitleStyle}>
            预警事件列表
            <span style={{ float: 'right', fontSize: '0.8rem', color: '#a0a0c0' }}>
              最近 {recentAlerts.length} 条
            </span>
          </div>
          <div style={alertListStyle}>
            {recentAlerts.length === 0 ? (
              <div style={{ color: '#666', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
                暂无预警事件
              </div>
            ) : (
              recentAlerts.map(alert => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  isNew={currentTime - alert.timestamp < 3000}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <Tooltip />
    </>
  );
}
