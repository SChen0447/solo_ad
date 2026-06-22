import React, { useState, useEffect, useRef } from 'react';
import { eventBus, dataFetcher, type NodeData, type TrafficPacket } from '@data/fetch';

const formatTimestamp = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const regionOptions = [
  { value: '', label: '全部区域' },
  { value: 'asia', label: '亚洲' },
  { value: 'europe', label: '欧洲' },
  { value: 'america', label: '美洲' },
  { value: 'oceania', label: '大洋洲' },
  { value: 'africa', label: '非洲' },
];

const speedOptions = [
  { value: 0.5, label: '0.5x' },
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 4, label: '4x' },
];

interface ControlsProps {
  onSnapshotLoad?: (nodes: NodeData[], packets: TrafficPacket[]) => void;
}

export const Controls: React.FC<ControlsProps> = ({ onSnapshotLoad }) => {
  const [timeValue, setTimeValue] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [region, setRegion] = useState('');
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentTime, setCurrentTime] = useState(formatTimestamp(0));
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    eventBus.on('traffic:update', (data) => {
      if (!isDragging) {
        const ts = (data as { timestamp: number }).timestamp;
        const offset = Math.floor((Date.now() - ts) / 1000;
        setCurrentTime(formatTimestamp(Math.floor(Date.now() / 1000)));
      }
    });

    const updateTime = () => {
      if (!isDragging) {
        setCurrentTime(formatTimestamp(Math.floor(Date.now() / 1000)));
      }
    };
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [isDragging]);

  useEffect(() => {
    eventBus.emit('region:filter', region || null);
  }, [region]);

  useEffect(() => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    dragTimeoutRef.current = setTimeout(() => {
      eventBus.emit('search:query', search);
    }, 200);
    return () => {
      if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
    };
  }, [search]);

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    eventBus.emit('speed:change', newSpeed);
  };

  const handleTimelineStart = () => {
    setIsDragging(true);
    eventBus.emit('timeline:change', timeValue);
  };

  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setTimeValue(val);
    setCurrentTime(formatTimestamp(Math.floor(Date.now() / 1000) - val * 60));
  };

  const loadSnapshotsForTimeline = async (minutesAgo: number) => {
    const now = Math.floor(Date.now() / 1000);
    const targetTime = now - minutesAgo * 60;
    const from = targetTime - 60;
    const to = targetTime + 60;
    const snapshots = await dataFetcher.fetchSnapshots(from, to);
    if (snapshots.length > 0) {
      let closest = snapshots[0];
      let minDiff = Math.abs(snapshots[0].timestamp - targetTime);
      snapshots.forEach((s) => {
        const diff = Math.abs(s.timestamp - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closest = s;
        }
      });
      onSnapshotLoad?.(closest.nodes, closest.traffic);
    }
  };

  const handleTimelineEnd = async () => {
    setIsDragging(false);
    if (timeValue > 0) {
      await loadSnapshotsForTimeline(timeValue);
    }
    setTimeout(() => {
      eventBus.emit('timeline:release', null);
    }, 500);
    if (timeValue === 0) {
      eventBus.emit('timeline:release', null);
    }
  };

  const panelContent = (
    <div className="control-panel-inner" style={panelInnerStyle}>
      <div style={{ marginBottom: 20 }}>
        <div style={titleStyle}>控制面板</div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>区域筛选</div>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          style={selectStyle}
        >
          {regionOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>搜索节点</div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="输入城市名..."
          style={inputStyle}
        />
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>播放速度</div>
        <div style={speedButtonGroupStyle}>
          {speedOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSpeedChange(opt.value)}
              style={{
                ...speedButtonStyle,
                ...(speed === opt.value ? speedButtonActiveStyle : {}),
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ ...sectionStyle, marginTop: 'auto' }}>
        <div style={sectionTitleStyle}>时间轴</div>
        <div style={timelineStyle}>
          <input
            ref={sliderRef}
            type="range"
            min="0"
            max="60"
            step="1"
            value={timeValue}
            onMouseDown={handleTimelineStart}
            onTouchStart={handleTimelineStart}
            onChange={handleTimelineChange}
            onMouseUp={handleTimelineEnd}
            onTouchEnd={handleTimelineEnd}
            style={sliderStyle}
          />
          <div style={timeLabelStyle}>
            <span style={{ fontSize: 12, color: '#64748b' }}>60分钟前</span>
            <span style={{ fontSize: 17, fontFamily: 'monospace', color: '#94a3b8' }}>
              {isDragging ? currentTime : formatTimestamp(Math.floor(Date.now() / 1000))}
            </span>
            <span style={{ fontSize: 12, color: '#64748b' }}>实时</span>
          </div>
        </div>
      </div>

      {isMobile && (
        <button
          onClick={() => setIsPanelOpen(false)}
          style={{
            marginTop: 16,
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          关闭面板
        </button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button onClick={() => setIsPanelOpen(true)} style={mobileButtonStyle}>
          <div style={hamburgerLine} />
          <div style={hamburgerLine} />
          <div style={hamburgerLine} />
        </button>
        {isPanelOpen && (
          <div style={mobileOverlayStyle} onClick={() => setIsPanelOpen(false)}>
            <div onClick={(e) => e.stopPropagation()} style={mobilePanelStyle}>
              {panelContent}
            </div>
          </div>
        )}
      </>
    );
  }

  return <div style={panelStyle}>{panelContent}</div>;
};

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  right: 16,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 260,
  zIndex: 100,
  display: 'flex',
  flexDirection: 'column',
};

const panelInnerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 480,
  background: 'rgba(0, 0, 0, 0.4)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRadius: 16,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  padding: 20,
  color: '#fff',
};

const titleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: '#fff',
  textAlign: 'center',
  paddingBottom: 12,
  borderBottom: '1px solid rgba(255,255,255,0.1)',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 20,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#94a3b8',
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 8,
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 8,
  color: '#fff',
  fontSize: 14,
  outline: 'none',
};

const speedButtonGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
};

const speedButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '6px 8px',
  background: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 6,
  color: '#94a3b8',
  fontSize: 12,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const speedButtonActiveStyle: React.CSSProperties = {
  background: 'rgba(0, 170, 255, 0.2)',
  borderColor: '#00aaff',
  color: '#00aaff',
};

const timelineStyle: React.CSSProperties = {
  width: '100%',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: 20,
  WebkitAppearance: 'none',
  appearance: 'none',
  background: 'transparent',
  cursor: 'pointer',
};

const timeLabelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 8,
};

const mobileButtonStyle: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  width: 48,
  height: 48,
  background: 'rgba(0, 0, 0, 0.4)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 12,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 5,
  cursor: 'pointer',
  zIndex: 100,
};

const hamburgerLine: React.CSSProperties = {
  width: 24,
  height: 2,
  background: '#fff',
  borderRadius: 1,
};

const mobileOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  zIndex: 99,
  display: 'flex',
  justifyContent: 'flex-end',
};

const mobilePanelStyle: React.CSSProperties = {
  width: 280,
  height: '100%',
  background: 'rgba(0, 0, 0, 0.4)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
  padding: 20,
  overflowY: 'auto',
};
