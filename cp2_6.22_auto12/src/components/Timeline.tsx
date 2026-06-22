import { DiaryEntry } from '../types';
import DiaryCard from './DiaryCard';
import './Timeline.css';

interface TimelineProps {
  entries: DiaryEntry[];
}

export default function Timeline({ entries }: TimelineProps) {
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="timeline-container">
      <h2 className="timeline-title">时间线</h2>
      {sortedEntries.length === 0 ? (
        <div className="timeline-empty">
          <div className="empty-icon">📝</div>
          <p>还没有日记，开始写第一篇吧</p>
        </div>
      ) : (
        <div className="timeline-cards">
          {sortedEntries.map((entry, index) => (
            <div
              key={entry.id}
              className="timeline-card-wrapper"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <DiaryCard entry={entry} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
