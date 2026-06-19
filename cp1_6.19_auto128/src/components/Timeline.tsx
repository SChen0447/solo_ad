import React, { useMemo } from 'react';
import type { LocationWithJournal, Photo } from '../types';

interface TimelineProps {
  locations: LocationWithJournal[];
  onCardClick: (loc: LocationWithJournal) => void;
  onViewJournal: (loc: LocationWithJournal) => void;
}

const Timeline: React.FC<TimelineProps> = ({ locations, onCardClick }) => {
  const sortedLocs = useMemo(() => {
    return [...locations].sort(
      (a, b) => new Date(b.arrivalDate).getTime() - new Date(a.arrivalDate).getTime()
    );
  }, [locations]);

  if (sortedLocs.length === 0) {
    return (
      <div className="timeline-container">
        <div className="timeline-header">⏱ 旅行时间线</div>
        <div style={{ padding: 40, textAlign: 'center', color: '#7f8c8d', fontSize: 14 }}>
          点击地图上的任意位置<br />开始记录你的旅行吧 ✈️
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-container">
      <div className="timeline-header">⏱ 旅行时间线</div>
      <div className="timeline">
        {sortedLocs.map((loc) => {
          const firstPhoto: Photo | undefined = loc.journal?.photos?.[0];
          return (
            <div
              key={loc.id}
              className="timeline-item"
            >
              <div className="timeline-dot" />
              <div className="timeline-date">{loc.arrivalDate}</div>
              <div
                className="timeline-card"
                onClick={() => onCardClick(loc)}
              >
                {firstPhoto?.url ? (
                  <img
                    src={firstPhoto.url}
                    alt={firstPhoto.title || loc.city}
                    className="timeline-card-img"
                    loading="lazy"
                  />
                ) : (
                  <div className="timeline-card-img-placeholder">
                    {loc.city.charAt(0)}
                  </div>
                )}
                <div className="timeline-card-body">
                  <div className="timeline-card-city">
                    {loc.city}
                    {loc.journal?.mood && (
                      <span style={{ marginLeft: 6 }}>{loc.journal.mood}</span>
                    )}
                  </div>
                  <div className="timeline-card-country">
                    {loc.country} · {loc.daysStayed} 天
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;
