import React, { memo, useMemo } from 'react';
import type { Note } from '../types';
import { MOOD_COLORS } from '../types';
import { useNoteStore } from '../store';

interface NoteCardProps {
  note: Note;
  isNew?: boolean;
  onAnimationEnd?: () => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;

  return date.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const NoteCard: React.FC<NoteCardProps> = memo(function NoteCard({ note, isNew, onAnimationEnd }) {
  const searchKeyword = useNoteStore(state => state.searchKeyword);
  const moodColor = MOOD_COLORS[note.mood] || MOOD_COLORS['soft-pink'];

  const highlightedContent = useMemo(() => {
    if (!searchKeyword.trim()) {
      return <span>{note.content}</span>;
    }

    const keyword = searchKeyword.toLowerCase();
    const content = note.content;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let index = content.toLowerCase().indexOf(keyword);

    while (index !== -1) {
      if (index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{content.slice(lastIndex, index)}</span>);
      }
      parts.push(
        <span key={`highlight-${index}`} className="highlight">
          {content.slice(index, index + keyword.length)}
        </span>
      );
      lastIndex = index + keyword.length;
      index = content.toLowerCase().indexOf(keyword, lastIndex);
    }

    if (lastIndex < content.length) {
      parts.push(<span key={`text-${lastIndex}`}>{content.slice(lastIndex)}</span>);
    }

    return <>{parts}</>;
  }, [note.content, searchKeyword]);

  return (
    <div
      className={`note-card ${isNew ? 'is-new' : ''}`}
      style={{ borderLeftColor: moodColor.hex }}
      onAnimationEnd={() => {
        if (isNew && onAnimationEnd) {
          onAnimationEnd();
        }
      }}
    >
      <div className="note-card-date">{formatDate(note.createdAt)}</div>
      <div className="note-card-content">{highlightedContent}</div>
      <div className="note-card-mood">
        <span className="note-card-mood-icon">{moodColor.icon}</span>
        <span>{moodColor.name}</span>
      </div>
    </div>
  );
});

export default NoteCard;
