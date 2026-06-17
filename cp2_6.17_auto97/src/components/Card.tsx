import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CardData } from '../utils/websocket';

interface CardProps {
  card: CardData;
  categoryColor: string;
  categoryId: string;
  isDragging?: boolean;
  isSourceGhost?: boolean;
  onEdit?: (cardId: string, updates: Partial<Omit<CardData, 'id' | 'createdAt' | 'createdBy'>>) => void;
  onDelete?: (cardId: string) => void;
  onDragStart?: (e: React.MouseEvent, cardId: string, cardEl: HTMLElement) => void;
}

export const Card: React.FC<CardProps> = ({
  card,
  categoryColor,
  categoryId,
  isDragging = false,
  isSourceGhost = false,
  onEdit,
  onDelete,
  onDragStart,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [notes, setNotes] = useState(card.notes);
  const [tagInput, setTagInput] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitle(card.title);
    setNotes(card.notes);
  }, [card.title, card.notes]);

  const handleTitleBlur = useCallback(() => {
    const trimmed = title.trim().substring(0, 50);
    if (trimmed !== card.title) {
      onEdit?.(card.id, { title: trimmed || '未命名卡片' });
    } else if (trimmed === '') {
      setTitle('未命名卡片');
    }
  }, [title, card.title, card.id, onEdit]);

  const handleNotesBlur = useCallback(() => {
    const trimmed = notes.substring(0, 200);
    if (trimmed !== card.notes) {
      onEdit?.(card.id, { notes: trimmed });
    }
  }, [notes, card.notes, card.id, onEdit]);

  const handleAddTag = useCallback(
    (e?: React.KeyboardEvent) => {
      if (e && e.key !== 'Enter') return;
      e?.preventDefault();
      const tag = tagInput.trim().substring(0, 10);
      if (!tag) return;
      if (card.tags.length >= 3) return;
      if (card.tags.includes(tag)) {
        setTagInput('');
        return;
      }
      onEdit?.(card.id, { tags: [...card.tags, tag] });
      setTagInput('');
    },
    [tagInput, card.tags, card.id, onEdit],
  );

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      onEdit?.(card.id, { tags: card.tags.filter((t) => t !== tagToRemove) });
    },
    [card.id, card.tags, onEdit],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isExpanded) return;
      if ((e.target as HTMLElement).closest('.card-edit-area')) return;
      if ((e.target as HTMLElement).closest('button')) return;
      if ((e.target as HTMLElement).closest('input')) return;
      if ((e.target as HTMLElement).closest('textarea')) return;
      onDragStart?.(e, card.id, cardRef.current!);
    },
    [card.id, isExpanded, onDragStart],
  );

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  return (
    <div
      ref={cardRef}
      className={`card-wrapper ${isDragging ? 'card-dragging' : ''} ${isSourceGhost ? 'card-ghost' : ''}`}
      style={{
        backgroundColor: categoryColor,
        opacity: isSourceGhost ? 0.3 : 1,
        transition: isDragging ? 'none' : 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s ease',
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsExpanded(true);
      }}
    >
      <div className="card-header">
        <div className="card-actions">
          <button
            className="card-action-btn"
            onClick={handleExpandToggle}
            title={isExpanded ? '收起' : '展开编辑'}
          >
            {isExpanded ? '▲' : '▼'}
          </button>
          <button
            className="card-action-btn card-delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('确定要删除这张卡片吗？')) {
                onDelete?.(card.id);
              }
            }}
            title="删除卡片"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="card-body">
        {isExpanded ? (
          <div className="card-edit-area">
            <input
              type="text"
              className="card-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value.substring(0, 50))}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              maxLength={50}
              placeholder="卡片标题"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="card-title-counter">{title.length}/50</div>
          </div>
        ) : (
          <div className="card-title" title={card.title}>
            {card.title}
          </div>
        )}

        <div className="card-tags">
          {card.tags.map((tag) => (
            <span key={tag} className="card-tag">
              {tag}
              {isExpanded && (
                <button
                  className="card-tag-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveTag(tag);
                  }}
                >
                  ✕
                </button>
              )}
            </span>
          ))}
          {isExpanded && card.tags.length < 3 && (
            <input
              type="text"
              className="card-tag-input"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value.substring(0, 10))}
              onKeyDown={handleAddTag}
              onBlur={() => handleAddTag()}
              placeholder="+ 标签"
              maxLength={10}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>

        {isExpanded ? (
          <div className="card-edit-area">
            <textarea
              className="card-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value.substring(0, 200))}
              onBlur={handleNotesBlur}
              maxLength={200}
              placeholder="添加备注..."
              rows={4}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="card-notes-counter">{notes.length}/200</div>
          </div>
        ) : card.notes ? (
          <div className="card-notes-container">
            <div
              className={`card-notes-preview ${notesExpanded ? 'card-notes-preview-expanded' : 'card-notes-preview-collapsed'}`}
              title={!notesExpanded && card.notes.length > 60 ? card.notes : undefined}
            >
              {card.notes}
            </div>
            <button
              className="card-notes-toggle"
              onClick={(e) => {
                e.stopPropagation();
                setNotesExpanded((prev) => !prev);
              }}
              title={notesExpanded ? '收起备注' : '展开备注'}
            >
              {notesExpanded ? '▽' : '△'}
            </button>
          </div>
        ) : null}
      </div>

      <style>{`
        .card-wrapper {
          width: 200px;
          min-height: 80px;
          border-radius: 12px;
          padding: 12px 12px 12px 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          cursor: grab;
          position: relative;
          user-select: none;
          box-sizing: border-box;
          animation: cardEnter 0.15s ease;
        }

        @keyframes cardEnter {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .card-wrapper:hover {
          box-shadow: 0 6px 18px rgba(0,0,0,0.3);
        }

        .card-wrapper.card-dragging {
          cursor: grabbing;
          box-shadow: 0 6px 18px rgba(0,0,0,0.3);
          transform: scale(1.02);
          z-index: 1000;
        }

        .card-wrapper.card-ghost {
          pointer-events: none;
        }

        .card-header {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 4px;
          gap: 4px;
          position: absolute;
          top: 8px;
          right: 8px;
        }

        .card-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .card-wrapper:hover .card-actions,
        .card-wrapper.card-dragging .card-actions {
          opacity: 1;
        }

        .card-action-btn {
          width: 22px;
          height: 22px;
          border: none;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.1);
          color: #555;
          font-size: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.1s ease;
        }

        .card-action-btn:hover {
          background: rgba(0, 0, 0, 0.2);
        }

        .card-delete-btn:hover {
          background: #ef4444;
          color: white;
        }

        .card-body {
          padding-top: 4px;
        }

        .card-title {
          font-size: 14px;
          color: #333;
          font-weight: 500;
          line-height: 1.4;
          margin-bottom: 8px;
          padding-right: 50px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .card-edit-area {
          margin-bottom: 8px;
          position: relative;
        }

        .card-title-input {
          width: 100%;
          border: 1px solid #ccc;
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 14px;
          color: #333;
          font-weight: 500;
          box-sizing: border-box;
          outline: none;
          background: rgba(255, 255, 255, 0.9);
        }

        .card-title-input:focus {
          border-color: #3b82f6;
        }

        .card-title-counter {
          position: absolute;
          right: 4px;
          bottom: -14px;
          font-size: 10px;
          color: #999;
        }

        .card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 8px;
        }

        .card-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 24px;
          padding: 0 8px;
          background: #3b82f6;
          color: white;
          font-size: 12px;
          border-radius: 12px;
          font-weight: 500;
        }

        .card-tag-remove {
          border: none;
          background: none;
          color: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          font-size: 10px;
          padding: 0;
          line-height: 1;
          display: flex;
          align-items: center;
        }

        .card-tag-remove:hover {
          color: white;
        }

        .card-tag-input {
          width: 70px;
          height: 24px;
          border: 1px dashed #3b82f6;
          border-radius: 12px;
          padding: 0 8px;
          font-size: 12px;
          background: rgba(255, 255, 255, 0.8);
          outline: none;
          box-sizing: border-box;
        }

        .card-tag-input:focus {
          border-style: solid;
        }

        .card-notes-container {
          position: relative;
          margin-top: 4px;
        }

        .card-notes-preview {
          font-size: 12px;
          color: #666;
          line-height: 1.4;
          background: rgba(255, 255, 255, 0.5);
          padding: 6px 8px;
          border-radius: 6px;
          word-break: break-word;
          transition: max-height 0.2s ease;
        }

        .card-notes-preview-collapsed {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-notes-preview-expanded {
        }

        .card-notes-toggle {
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
          border: none;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.08);
          color: #888;
          font-size: 9px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          opacity: 0;
          padding: 0;
        }

        .card-notes-container:hover .card-notes-toggle {
          opacity: 1;
        }

        .card-notes-toggle:hover {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }

        .card-notes-input {
          width: 100%;
          border: 1px solid #ccc;
          border-radius: 6px;
          padding: 8px;
          font-size: 12px;
          background: #fafafa;
          resize: vertical;
          box-sizing: border-box;
          outline: none;
          line-height: 1.4;
          font-family: inherit;
        }

        .card-notes-input:focus {
          border-color: #3b82f6;
          background: white;
        }

        .card-notes-counter {
          position: absolute;
          right: 4px;
          bottom: -14px;
          font-size: 10px;
          color: #999;
        }
      `}</style>
    </div>
  );
};

export default Card;
