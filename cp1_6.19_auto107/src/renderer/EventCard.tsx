import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HistoricalEvent } from '../dataManager/types';
import { getEventById } from '../dataManager/mockData';
import '../styles/EventCard.css';

interface EventCardProps {
  event: HistoricalEvent | null;
  onClose: () => void;
  onNavigateToEvent: (eventId: string) => void;
}

interface Position {
  x: number;
  y: number;
}

const EventCard: React.FC<EventCardProps> = ({ event, onClose, onNavigateToEvent }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (event) {
      setIsExpanded(false);
      if (!isMobile) {
        const centerX = window.innerWidth / 2 - 250;
        const centerY = window.innerHeight / 2 - 200;
        setPosition({ x: centerX, y: centerY });
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsExpanded(true);
        });
      });
    } else {
      setIsExpanded(false);
    }
  }, [event, isMobile]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleRelatedEventClick = (eventId: string) => {
    const relatedEvent = getEventById(eventId);
    if (relatedEvent) {
      onNavigateToEvent(eventId);
    }
  };

  if (!event) return null;

  const relatedEvents = event.relatedEventIds
    .map(id => getEventById(id))
    .filter(e => e !== undefined) as HistoricalEvent[];

  const cardStyle: React.CSSProperties = isMobile
    ? {}
    : {
        left: position.x,
        top: position.y,
        transform: isExpanded ? 'scale(1)' : 'scale(0.95)',
        opacity: isExpanded ? 1 : 0,
      };

  return (
    <div
      className={`event-card-overlay ${isMobile ? 'mobile' : ''}`}
      onClick={isMobile ? onClose : undefined}
    >
      <div
        ref={cardRef}
        className={`event-card ${isMobile ? 'mobile' : ''} ${isDragging ? 'dragging' : ''}`}
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          ref={headerRef}
          className="event-card-header"
          onMouseDown={handleMouseDown}
        >
          <div className="event-card-date">{event.date}</div>
          <div className="event-card-category">{event.category}</div>
          <button
            className="event-card-close"
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div
          className="event-card-body"
          style={{
            transform: isExpanded ? 'translateY(0)' : 'translateY(20px)',
            opacity: isExpanded ? 1 : 0,
          }}
        >
          <h2 className="event-card-title">{event.title}</h2>

          {event.imageUrl && (
            <div className="event-card-image">
              <img src={event.imageUrl} alt={event.title} />
            </div>
          )}

          <div
            className="event-card-description"
            dangerouslySetInnerHTML={{ __html: event.description }}
          />

          {relatedEvents.length > 0 && (
            <div className="event-card-related">
              <h3>关联事件</h3>
              <ul>
                {relatedEvents.map((related) => (
                  <li
                    key={related.id}
                    className="related-event-item"
                    onClick={() => handleRelatedEventClick(related.id)}
                  >
                    <span className="related-event-date">{related.date}</span>
                    <span className="related-event-title">{related.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;
