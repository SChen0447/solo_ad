import { useEffect, useRef } from 'react';
import type { LogEntry, LogEventType } from './types';

interface TimelineLogProps {
  logs: LogEntry[];
}

const EVENT_ICONS: Record<LogEventType, string> = {
  feed: '🍪',
  play: '⚽',
  clean: '🧺',
  decay: '⏳',
  adopt: '💖',
  status: '💬',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function TimelineLog({ logs }: TimelineLogProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(logs.length);

  useEffect(() => {
    if (logs.length > prevCountRef.current && listRef.current) {
      listRef.current.scrollTop = 0;
    }
    prevCountRef.current = logs.length;
  }, [logs.length]);

  return (
    <aside className="timeline-section">
      <div className="timeline-title">🐾 宠物日志</div>
      {logs.length === 0 ? (
        <div className="empty-timeline">暂无日志记录...</div>
      ) : (
        <div className="timeline-list" ref={listRef}>
          {logs.map((log) => (
            <div key={log.id} className="timeline-item">
              <div className={`timeline-icon ${log.eventType}`}>
                {EVENT_ICONS[log.eventType]}
              </div>
              <div className="timeline-content">
                <div className="timeline-message">{log.message}</div>
                <div className="timeline-time">{formatTime(log.timestamp)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
