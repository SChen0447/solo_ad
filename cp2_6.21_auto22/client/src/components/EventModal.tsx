import React from 'react';
import type { GreenEvent } from '../types';

interface EventModalProps {
  event: GreenEvent;
  onClose: () => void;
  onRegister: () => void;
  isRegistered: boolean;
  currentUserId: string;
}

const EventModal: React.FC<EventModalProps> = ({ event, onClose, onRegister, isRegistered }) => {
  const remaining = event.maxParticipants - event.participantIds.length;
  const isFull = remaining <= 0;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 className="modal-title">{event.name}</h2>
        <div className="modal-info">
          <div className="modal-info-row">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span>{formatDate(event.date)}</span>
          </div>
          <div className="modal-info-row">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{event.location}</span>
          </div>
          <div className="modal-info-row">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>
              {isFull ? '名额已满' : `剩余 ${remaining} / ${event.maxParticipants} 个名额`}
            </span>
          </div>
        </div>
        <p className="modal-description">{event.description}</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>关闭</button>
          <button
            className="btn"
            onClick={onRegister}
            disabled={isFull || isRegistered}
          >
            {isRegistered ? '已报名' : isFull ? '名额已满' : '立即报名'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventModal;
