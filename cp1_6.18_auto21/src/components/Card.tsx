import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Link2, ExternalLink, Edit3, X } from 'lucide-react';
import type { Card as CardType } from '../types';
import { useCardStore } from '../store/useCardStore';

interface CardProps {
  card: CardType;
  isHighlighted: boolean;
  isDimmed: boolean;
  onMouseDown: (e: React.MouseEvent, cardId: string) => void;
  onStartLink: (cardId: string, pos: { x: number; y: number }) => void;
  canvasOffset: { x: number; y: number };
}

export const Card: React.FC<CardProps> = ({
  card,
  isHighlighted,
  isDimmed,
  onMouseDown,
  onStartLink,
  canvasOffset,
}) => {
  const {
    deleteCard,
    clearCardNewFlag,
    updateCard,
    highlightedTag,
  } = useCardStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editContent, setEditContent] = useState(card.content);
  const [linkHover, setLinkHover] = useState(false);

  useEffect(() => {
    if (card.isNew && cardRef.current) {
      const timer = setTimeout(() => {
        clearCardNewFlag(card.id);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [card.isNew, card.id, clearCardNewFlag]);

  useEffect(() => {
    setEditTitle(card.title);
    setEditContent(card.content);
  }, [card.title, card.content]);

  const handleLinkStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      onStartLink(card.id, {
        x: rect.right - canvasOffset.x,
        y: rect.bottom - canvasOffset.y,
      });
    }
  };

  const handleSaveEdit = () => {
    updateCard(card.id, {
      title: editTitle.trim() || card.title,
      content: editContent.trim() || card.content,
    });
    setIsEditing(false);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const cardClasses = [
    'card-item',
    card.isNew ? 'card-new' : '',
    isHighlighted ? 'card-highlighted' : '',
    isDimmed ? 'card-dimmed' : '',
    isEditing ? 'card-editing' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={cardRef}
      className={cardClasses}
      style={{
        left: `${card.x}px`,
        top: `${card.y}px`,
      }}
      onMouseDown={(e) => !isEditing && onMouseDown(e, card.id)}
    >
      {!isEditing ? (
        <>
          <div className="card-header" onMouseDown={(e) => e.stopPropagation()}>
            <div className="card-title" title={card.title}>
              {card.title}
            </div>
            <div className="card-actions">
              <button
                className="icon-btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                title="编辑"
              >
                <Edit3 size={14} />
              </button>
              {card.url && (
                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="icon-btn-sm"
                  onClick={(e) => e.stopPropagation()}
                  title="打开源链接"
                >
                  <ExternalLink size={14} />
                </a>
              )}
              <button
                className="icon-btn-sm icon-btn-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCard(card.id);
                }}
                title="删除"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="card-body">
            <p className="card-content">{card.content}</p>
          </div>

          <div className="card-footer">
            <div className="card-tags">
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  className={`card-tag ${
                    highlightedTag === tag ? 'tag-active' : ''
                  }`}
                >
                  #{tag}
                </span>
              ))}
            </div>
            <span className="card-date">{formatDate(card.createdAt)}</span>
          </div>

          <div
            className="card-link-handle"
            onMouseDown={handleLinkStart}
            onMouseEnter={() => setLinkHover(true)}
            onMouseLeave={() => setLinkHover(false)}
          >
            <Link2 size={14} />
            {linkHover && <span className="link-tooltip">拖出连线</span>}
          </div>
        </>
      ) : (
        <div className="card-edit-form" onMouseDown={(e) => e.stopPropagation()}>
          <div className="edit-header">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="标题"
              autoFocus
            />
            <button
              className="icon-btn-sm"
              onClick={() => setIsEditing(false)}
            >
              <X size={14} />
            </button>
          </div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="内容"
            rows={3}
          />
          <div className="edit-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(false)}>
              取消
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSaveEdit}>
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
