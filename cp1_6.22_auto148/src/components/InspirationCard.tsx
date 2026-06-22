import React, { useState } from 'react';
import { Note } from '../types';

interface InspirationCardProps {
  note: Note;
  onClick: (note: Note) => void;
  style?: React.CSSProperties;
}

export const InspirationCard: React.FC<InspirationCardProps> = ({ note, onClick, style }) => {
  const [hovered, setHovered] = useState(false);
  const [isImageError, setIsImageError] = useState(false);

  const summary = note.content.length > 60 ? note.content.slice(0, 60) + '...' : note.content;
  const date = new Date(note.createdAt);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  const cardStyle: React.CSSProperties = {
    width: '280px',
    minHeight: '220px',
    height: 'auto',
    borderRadius: '16px',
    background: '#1e293b',
    border: '0.5px solid #38bdf8',
    padding: '16px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
    boxShadow: hovered ? '0 12px 32px rgba(56, 189, 248, 0.18), 0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
    transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
    ...style
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick(note)}
    >
      {note.imageUrl && !isImageError && (
        <div style={{
          width: '100%',
          height: '80px',
          borderRadius: '10px',
          overflow: 'hidden',
          background: '#0f172a',
          flexShrink: 0
        }}>
          <img
            src={note.imageUrl}
            alt={note.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onError={() => setIsImageError(true)}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <h3 style={{
          fontSize: '15px',
          fontWeight: 600,
          color: '#f1f5f9',
          lineHeight: 1.4,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical'
        }}>
          {note.title}
        </h3>
        <span style={{
          fontSize: '11px',
          color: '#64748b',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          paddingTop: '2px'
        }}>
          {dateStr}
        </span>
      </div>

      <p style={{
        fontSize: '13px',
        color: '#94a3b8',
        lineHeight: 1.6,
        flex: 1,
        minHeight: '40px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical'
      }}>
        {summary}
      </p>

      {note.tags && note.tags.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginTop: 'auto'
        }}>
          {note.tags.slice(0, 4).map((tag, idx) => (
            <span
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                background: '#3b82f6',
                color: '#ffffff',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 500,
                whiteSpace: 'nowrap'
              }}
            >
              #{tag}
            </span>
          ))}
          {note.tags.length > 4 && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 8px',
              background: '#334155',
              color: '#94a3b8',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 500
            }}>
              +{note.tags.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default InspirationCard;
