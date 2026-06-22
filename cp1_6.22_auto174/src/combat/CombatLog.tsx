import React, { useState, useEffect, useRef } from 'react';
import { CombatEvent, CombatEventType } from '../game/GameLoop';

interface CombatLogProps {
  events: CombatEvent[];
}

const getEventColor = (type: CombatEventType): string => {
  switch (type) {
    case 'hit':
      return '#22c55e';
    case 'hurt':
      return '#ef4444';
    case 'kill':
      return '#fbbf24';
    default:
      return '#e2e8f0';
  }
};

export const CombatLog: React.FC<CombatLogProps> = ({ events }) => {
  const [displayEvents, setDisplayEvents] = useState<CombatEvent[]>([]);
  const [animatingId, setAnimatingId] = useState<number | null>(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    if (events.length > prevLengthRef.current) {
      const newEvents = events.slice(0, events.length - prevLengthRef.current);
      if (newEvents.length > 0) {
        setAnimatingId(newEvents[0].id);
        setTimeout(() => setAnimatingId(null), 200);
      }
    }
    prevLengthRef.current = events.length;
    setDisplayEvents([...events]);
  }, [events]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerText}>BATTLE LOG</span>
      </div>
      <div style={styles.logContainer}>
        {displayEvents.map((event, index) => (
          <div
            key={event.id}
            style={{
              ...styles.logEntry,
              opacity: animatingId === event.id ? 0 : 1,
              transform: animatingId === event.id ? 'translateY(-10px)' : 'translateY(0)',
              transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
              animationDelay: `${index * 10}ms`
            }}
          >
            <div
              style={{
                ...styles.eventIndicator,
                backgroundColor: getEventColor(event.type)
              }}
            />
            <div style={styles.eventContent}>
              <span style={styles.eventText}>{event.message}</span>
            </div>
          </div>
        ))}
        {displayEvents.length === 0 && (
          <div style={styles.emptyLog}>
            <span style={styles.emptyText}>No events yet...</span>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 200,
    height: 360,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 5,
    pointerEvents: 'none'
  },
  header: {
    padding: '8px 12px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  headerText: {
    fontFamily: 'monospace',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: '1px'
  },
  logContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
    display: 'flex',
    flexDirection: 'column-reverse'
  },
  logEntry: {
    display: 'flex',
    alignItems: 'stretch',
    padding: '4px 8px',
    marginBottom: '2px',
    minHeight: '24px'
  },
  eventIndicator: {
    width: '3px',
    borderRadius: 2,
    marginRight: '8px',
    flexShrink: 0
  },
  eventContent: {
    flex: 1,
    display: 'flex',
    alignItems: 'center'
  },
  eventText: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#e2e8f0',
    lineHeight: 1.3,
    wordBreak: 'break-word'
  },
  emptyLog: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px'
  },
  emptyText: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#64748b',
    fontStyle: 'italic'
  }
};
