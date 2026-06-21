import React from 'react';
import type { GreenEvent } from '../types';

interface EventCardProps {
  event: GreenEvent;
  delay: number;
  onClick: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, delay, onClick }) => {
  const remaining = event.maxParticipants - event.participantIds.length;
  const isFull = remaining <= 0;

  const date = new Date(event.date);
  const day = date.getDate();

  return (
    <div
      className="event-card"
      onClick={onClick}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="event-date-tag">{day}日</div>
      <h3 className="event-card-title">{event.name}</h3>
      <div className="event-card-location">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        {event.location}
      </div>
      <p className="event-card-desc">{event.description}</p>
      <div className={`event-card-slots ${isFull ? 'full' : ''}`}>
        {isFull ? '名额已满' : `剩余 ${remaining} 个名额`}
      </div>
    </div>
  );
};

export default EventCard;
