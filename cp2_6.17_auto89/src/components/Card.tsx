import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface CardData {
  id: string;
  title: string;
  tags: string[];
  note: string;
  categoryId: string;
}

interface CardProps {
  card: CardData;
  categoryColor: string;
  isDragging: boolean;
  onDragStart: (e: React.MouseEvent, cardId: string) => void;
  onUpdate: (cardId: string, updates: Partial<Pick<CardData, 'title' | 'tags' | 'note'>>) => void;
  onDelete: (cardId: string) => void;
}

const Card: React.FC<CardProps> = ({ card, categoryColor, isDragging, onDragStart, onUpdate, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editNote, setEditNote] = useState(card.note);
  const [tagInput, setTagInput] = useState('');
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    setFadeIn(true);
  }, []);

  useEffect(() => {
    setEditTitle(card.title);
    setEditNote(card.note);
  }, [card.title, card.note]);

  const handleTitleBlur = useCallback(() => {
    if (editTitle !== card.title) {
      onUpdate(card.id, { title: editTitle });
    }
  }, [editTitle, card.title, card.id, onUpdate]);

  const handleNoteBlur = useCallback(() => {
    if (editNote !== card.note) {
      onUpdate(card.id, { note: editNote });
    }
  }, [editNote, card.note, card.id, onUpdate]);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const tag = tagInput.trim();
        if (tag && card.tags.length < 3 && !card.tags.includes(tag)) {
          onUpdate(card.id, { tags: [...card.tags, tag] });
          setTagInput('');
        }
      }
    },
    [tagInput, card.id, card.tags, onUpdate]
  );

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onUpdate(card.id, { tags: card.tags.filter((t) => t !== tagToRemove) });
    },
    [card.id, card.tags, onUpdate]
  );

  return (
    <div
      className={`card ${fadeIn ? 'card-fade-in' : ''} ${isDragging ? 'card-dragging' : ''}`}
      style={{ backgroundColor: categoryColor }}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('.card-edit-area')) return;
        onDragStart(e, card.id);
      }}
    >
      <div className="card-header" onClick={() => setExpanded(!expanded)}>
        <span className="card-title">{card.title}</span>
        <span className="card-expand-icon">{expanded ? '▼' : '▶'}</span>
      </div>

      {card.tags.length > 0 && (
        <div className="card-tags">
          {card.tags.map((tag) => (
            <span key={tag} className="card-tag">
              {tag}
              <button
                className="card-tag-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {card.note && !expanded && <div className="card-note-preview">{card.note}</div>}

      {expanded && (
        <div className="card-edit-area" onClick={(e) => e.stopPropagation()}>
          <input
            className="card-edit-title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value.slice(0, 50))}
            onBlur={handleTitleBlur}
            maxLength={50}
            placeholder="卡片标题"
          />
          <div className="card-tag-input-wrapper">
            {card.tags.map((tag) => (
              <span key={tag} className="card-tag">
                {tag}
                <button className="card-tag-remove" onClick={() => removeTag(tag)}>
                  ×
                </button>
              </span>
            ))}
            {card.tags.length < 3 && (
              <input
                className="card-tag-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="添加标签"
              />
            )}
          </div>
          <textarea
            className="card-edit-note"
            value={editNote}
            onChange={(e) => setEditNote(e.target.value.slice(0, 200))}
            onBlur={handleNoteBlur}
            maxLength={200}
            placeholder="备注..."
          />
          <button className="card-delete-btn" onClick={() => onDelete(card.id)}>
            删除卡片
          </button>
        </div>
      )}
    </div>
  );
};

export default Card;
