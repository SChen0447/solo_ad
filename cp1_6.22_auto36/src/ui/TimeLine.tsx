import { useMemo, useRef } from 'react';
import { BUILDINGS, TIMELINE_EVENTS, yearToPercent, percentToYear, getBuildingById } from '../data/historicalBuildings';
import type { BuildingStyle, TimelineEvent } from '../data/historicalBuildings';

interface TimeLineProps {
  activeBuilding: BuildingStyle | null;
  onTimeClick: (year: number, event?: TimelineEvent) => void;
  onEventSelect?: (event: TimelineEvent) => void;
}

const YEAR_TICKS = [
  { year: -500, label: '前500' },
  { year: 0, label: '0' },
  { year: 500, label: '500' },
  { year: 1000, label: '1000' },
  { year: 1500, label: '1500' },
  { year: 2000, label: '2000' },
];

export default function TimeLine({ activeBuilding, onTimeClick, onEventSelect }: TimeLineProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const activeBld = useMemo(() => {
    if (!activeBuilding) return null;
    return getBuildingById(activeBuilding);
  }, [activeBuilding]);

  const buildingMarkers = BUILDINGS.map((b) => {
    const mid = (b.startYear + b.endYear) / 2;
    return { ...b, markerYear: mid };
  });

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const year = percentToYear(pct * 100);
    onTimeClick(year);
  };

  return (
    <div className="timeline-container glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', letterSpacing: '0.8px' }}>
          历史时间轴
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
          公元前500 — 公元2024
        </span>
      </div>

      <div className="timeline-track" ref={trackRef}>
        <div className="timeline-line" />

        <div className="timeline-ticks">
          {YEAR_TICKS.map((t) => (
            <div key={t.year} className="timeline-tick" style={{ left: `${yearToPercent(t.year)}%`, position: 'absolute' }}>
              <div className="tick-line" />
              <div className="tick-label">{t.label}</div>
            </div>
          ))}
        </div>

        <div className="timeline-click-area" onClick={handleTrackClick} />

        <div className="timeline-markers">
          {buildingMarkers.map((b) => {
            const isActive = activeBuilding === b.id;
            return (
              <div
                key={`bld-${b.id}`}
                className="timeline-marker"
                style={{
                  left: `${yearToPercent(b.markerYear)}%`,
                  color: b.primaryColor,
                  opacity: isActive ? 1 : 0.4,
                  zIndex: isActive ? 5 : 2,
                  top: '10px',
                }}
                title={`${b.name} (${b.period})`}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <div
                  className="marker-diamond"
                  style={{
                    width: isActive ? '22px' : '14px',
                    height: isActive ? '22px' : '14px',
                    background: `${b.primaryColor}55`,
                  }}
                />
              </div>
            );
          })}

          {TIMELINE_EVENTS.map((evt) => {
            const b = getBuildingById(evt.buildingStyle);
            return (
              <div
                key={`evt-${evt.id}`}
                className="timeline-marker"
                style={{
                  left: `${yearToPercent(evt.year)}%`,
                  top: '26px',
                  color: b?.primaryColor || '#fff',
                  fontSize: '14px',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={`${evt.title} (${evt.year < 0 ? `前${-evt.year}` : evt.year})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventSelect?.(evt);
                }}
              >
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: b?.primaryColor,
                  border: '1.5px solid rgba(255,255,255,0.8)',
                  boxShadow: `0 0 8px ${b?.primaryColor}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.5)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
                }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
