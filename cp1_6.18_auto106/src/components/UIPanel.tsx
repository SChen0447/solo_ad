import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useStore } from '../App';
import { getCurrents } from '../data/oceanData';

const monthNames = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
];

export default function UIPanel() {
  const month = useStore((s) => s.month);
  const setMonth = useStore((s) => s.setMonth);
  const isPlaying = useStore((s) => s.isPlaying);
  const togglePlaying = useStore((s) => s.togglePlaying);
  const visibleCurrents = useStore((s) => s.visibleCurrents);
  const toggleCurrent = useStore((s) => s.toggleCurrent);
  const particleDetail = useStore((s) => s.particleDetail);
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const currents = useMemo(() => getCurrents(), []);

  const handleMonthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMonth(parseInt(e.target.value, 10));
    },
    [setMonth],
  );

  const glassPanel: React.CSSProperties = {
    background: 'rgba(4, 12, 36, 0.75)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(60, 140, 255, 0.2)',
    boxShadow: '0 0 20px rgba(60, 140, 255, 0.1), inset 0 0 20px rgba(60, 140, 255, 0.05)',
    borderRadius: '12px',
    color: '#c0d8f0',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '13px',
    lineHeight: 1.5,
  };

  const glowButton: React.CSSProperties = {
    background: 'rgba(40, 80, 160, 0.3)',
    border: '1px solid rgba(60, 140, 255, 0.4)',
    color: '#a0c8ff',
    borderRadius: '8px',
    padding: '6px 14px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    fontFamily: 'inherit',
    fontSize: '13px',
    outline: 'none',
  };

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const sidebarStyle: React.CSSProperties = isNarrow
    ? {
        position: 'fixed',
        top: 0,
        right: sidebarOpen ? 0 : '-320px',
        width: '300px',
        height: '100vh',
        ...glassPanel,
        borderRadius: '0',
        borderRight: 'none',
        padding: '20px',
        overflowY: 'auto',
        transition: 'right 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
        zIndex: 1000,
      }
    : {
        position: 'absolute',
        top: '16px',
        right: '16px',
        width: '280px',
        maxHeight: 'calc(100vh - 120px)',
        ...glassPanel,
        padding: '16px',
        overflowY: 'auto',
        zIndex: 100,
      };

  const timelineStyle: React.CSSProperties = isNarrow
    ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        ...glassPanel,
        borderRadius: '12px 12px 0 0',
        padding: '14px 20px',
        zIndex: 1000,
      }
    : {
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        right: '310px',
        ...glassPanel,
        padding: '14px 20px',
        zIndex: 100,
      };

  return (
    <>
      {isNarrow && (
        <button
          onClick={toggleSidebar}
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 1001,
            ...glassPanel,
            padding: '10px 14px',
            cursor: 'pointer',
            color: '#a0c8ff',
            fontSize: '16px',
            lineHeight: 1,
          }}
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
      )}

      <div style={sidebarStyle}>
        <h3
          style={{
            margin: '0 0 14px 0',
            fontSize: '15px',
            color: '#a0d8ff',
            textShadow: '0 0 10px rgba(60, 140, 255, 0.5)',
            borderBottom: '1px solid rgba(60, 140, 255, 0.2)',
            paddingBottom: '8px',
          }}
        >
          洋流筛选
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {currents.map((c) => (
            <label
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                background: visibleCurrents.includes(c.id)
                  ? 'rgba(60, 140, 255, 0.15)'
                  : 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.03)';
                e.currentTarget.style.background = 'rgba(60, 140, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = visibleCurrents.includes(c.id)
                  ? 'rgba(60, 140, 255, 0.15)'
                  : 'transparent';
              }}
            >
              <input
                type="checkbox"
                checked={visibleCurrents.includes(c.id)}
                onChange={() => toggleCurrent(c.id)}
                style={{
                  accentColor: '#4488ff',
                  width: '14px',
                  height: '14px',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '12px', color: '#8cc8ff' }}>{c.nameCN}</span>
              <span style={{ fontSize: '10px', color: '#5a8ab5', marginLeft: 'auto' }}>
                {c.id}
              </span>
            </label>
          ))}
        </div>

        {particleDetail && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(20, 60, 120, 0.3)',
              borderRadius: '8px',
              border: '1px solid rgba(60, 140, 255, 0.3)',
              animation: 'fadeIn 0.5s ease',
            }}
          >
            <h4
              style={{
                margin: '0 0 10px 0',
                fontSize: '13px',
                color: '#a0d8ff',
                textShadow: '0 0 8px rgba(60, 140, 255, 0.4)',
              }}
            >
              粒子详情
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: '11px' }}>
              <span style={{ color: '#6a9ac5' }}>纬度</span>
              <span style={{ color: '#c0d8f0' }}>{particleDetail.latitude.toFixed(2)}°</span>
              <span style={{ color: '#6a9ac5' }}>经度</span>
              <span style={{ color: '#c0d8f0' }}>{particleDetail.longitude.toFixed(2)}°</span>
              <span style={{ color: '#6a9ac5' }}>流速</span>
              <span style={{ color: '#c0d8f0' }}>{particleDetail.speed.toFixed(2)} m/s</span>
              <span style={{ color: '#6a9ac5' }}>温度</span>
              <span style={{ color: '#c0d8f0' }}>{particleDetail.temperature.toFixed(1)}°C</span>
              <span style={{ color: '#6a9ac5' }}>盐度</span>
              <span style={{ color: '#c0d8f0' }}>{particleDetail.salinity.toFixed(1)} PSU</span>
              <span style={{ color: '#6a9ac5' }}>洋流</span>
              <span style={{ color: '#c0d8f0' }}>{particleDetail.currentId}</span>
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: '14px',
            padding: '10px',
            background: 'rgba(20, 60, 120, 0.2)',
            borderRadius: '8px',
            border: '1px solid rgba(60, 140, 255, 0.15)',
          }}
        >
          <div style={{ fontSize: '11px', color: '#6a9ac5' }}>
            活跃洋流: {visibleCurrents.length} / {currents.length}
          </div>
          <div style={{ fontSize: '11px', color: '#6a9ac5', marginTop: '2px' }}>
            当前月份: {monthNames[month]}
          </div>
        </div>
      </div>

      <div style={timelineStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={togglePlaying}
            style={{
              ...glowButton,
              minWidth: '60px',
              fontWeight: 600,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.08)';
              e.currentTarget.style.background = 'rgba(60, 140, 255, 0.35)';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(60, 140, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = 'rgba(40, 80, 160, 0.3)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {isPlaying ? '⏸ 暂停' : '▶ 播放'}
          </button>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: '#6a9ac5',
                padding: '0 2px',
              }}
            >
              <span>{monthNames[0]}</span>
              <span style={{ color: '#a0d8ff', fontWeight: 600, fontSize: '11px' }}>
                {monthNames[month]}
              </span>
              <span>{monthNames[11]}</span>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="range"
                min={0}
                max={11}
                value={month}
                onChange={handleMonthChange}
                style={{
                  width: '100%',
                  height: '6px',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  background: `linear-gradient(to right, #1a4a8a, #2a8adf, #4ac8ff, #ff8844, #ff4444)`,
                  borderRadius: '3px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
              <style>{`
                input[type="range"]::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  width: 18px;
                  height: 18px;
                  border-radius: 50%;
                  background: radial-gradient(circle, #6ac8ff 0%, #4488ff 50%, #2a5aaa 100%);
                  box-shadow: 0 0 10px rgba(60, 140, 255, 0.6), 0 0 20px rgba(60, 140, 255, 0.3);
                  cursor: pointer;
                  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                input[type="range"]::-webkit-slider-thumb:hover {
                  transform: scale(1.3);
                  box-shadow: 0 0 15px rgba(60, 140, 255, 0.8), 0 0 30px rgba(60, 140, 255, 0.4);
                }
                input[type="range"]::-moz-range-thumb {
                  width: 18px;
                  height: 18px;
                  border-radius: 50%;
                  background: radial-gradient(circle, #6ac8ff 0%, #4488ff 50%, #2a5aaa 100%);
                  box-shadow: 0 0 10px rgba(60, 140, 255, 0.6);
                  cursor: pointer;
                  border: none;
                }
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(-4px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
