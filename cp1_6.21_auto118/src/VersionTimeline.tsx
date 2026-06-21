import React, { useRef, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { History } from 'lucide-react';

export interface VersionSnapshot {
  id: string;
  version: number;
  props: Record<string, any>;
  code: string;
  timestamp: Date;
}

interface VersionTimelineProps {
  snapshots: VersionSnapshot[];
  currentVersion: number;
  onVersionChange: (snapshot: VersionSnapshot) => void;
}

export const VersionTimeline: React.FC<VersionTimelineProps> = ({
  snapshots,
  currentVersion,
  onVersionChange,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const version = Number(e.target.value);
    const snapshot = snapshots.find(s => s.version === version);
    if (snapshot) {
      onVersionChange(snapshot);
    }
  }, [snapshots, onVersionChange]);

  const formatTime = (date: Date): string => {
    return format(date, 'MM/dd HH:mm');
  };

  const maxVersion = snapshots.length > 0 ? Math.max(...snapshots.map(s => s.version)) : 0;
  const minVersion = snapshots.length > 0 ? Math.min(...snapshots.map(s => s.version)) : 0;

  const currentSnapshot = snapshots.find(s => s.version === currentVersion);

  const getTrackBackground = (): string => {
    if (snapshots.length === 0) return '#333';
    const percent = ((currentVersion - minVersion) / (maxVersion - minVersion || 1)) * 100;
    return `linear-gradient(to right, #6c63ff 0%, #e040fb ${percent}%, #333 ${percent}%, #333 100%)`;
  };

  return (
    <div className="version-timeline">
      <div className="timeline-header">
        <div className="timeline-label">
          <History size={18} />
          <span>版本历史</span>
        </div>
        <div className="timeline-info">
          <span className="version-number">v{currentVersion}</span>
          {currentSnapshot && (
            <span className="version-time">{formatTime(currentSnapshot.timestamp)}</span>
          )}
        </div>
      </div>

      <div className="timeline-track-container" ref={trackRef}>
        <div 
          className="timeline-track"
          style={{ background: getTrackBackground() }}
        >
          {snapshots.map((snapshot) => {
            const percent = maxVersion > minVersion 
              ? ((snapshot.version - minVersion) / (maxVersion - minVersion)) * 100 
              : 50;
            const isActive = snapshot.version === currentVersion;
            
            return (
              <div
                key={snapshot.id}
                className={`version-dot ${isActive ? 'active' : ''}`}
                style={{ left: `${percent}%` }}
                title={`v${snapshot.version} - ${formatTime(snapshot.timestamp)}`}
              >
                <span className="version-dot-number">{snapshot.version}</span>
              </div>
            );
          })}
        </div>

        <input
          type="range"
          min={minVersion}
          max={maxVersion}
          value={currentVersion}
          onChange={handleSliderChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="timeline-slider"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        />
      </div>

      <div className="timeline-markers">
        {snapshots.length > 0 && (
          <>
            <span className="marker-start">v{minVersion}</span>
            <span className="marker-end">v{maxVersion}</span>
          </>
        )}
      </div>
    </div>
  );
};

export default VersionTimeline;
