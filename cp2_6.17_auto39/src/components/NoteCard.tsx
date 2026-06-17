import React, { useState } from 'react';
import { Note } from '../types';
import { analyzeSentiment, formatDate, parseMarkdown } from '../utils';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (noteId: string) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onEdit, onDelete }) => {
  const [showActions, setShowActions] = useState(false);
  const sentiment = analyzeSentiment(note.content);

  return (
    <div
      className={`note-card sentiment-${sentiment}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="note-header">
        <span className="note-date">{formatDate(note.createdAt)}</span>
        {showActions && (
          <div className="note-actions">
            <button
              className="note-action-btn"
              onClick={() => onEdit(note)}
              title="编辑"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
            </button>
            <button
              className="note-action-btn"
              onClick={() => onDelete(note.id)}
              title="删除"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <div
        className="note-content"
        dangerouslySetInnerHTML={{ __html: parseMarkdown(note.content) }}
      />
    </div>
  );
};

export default NoteCard;
