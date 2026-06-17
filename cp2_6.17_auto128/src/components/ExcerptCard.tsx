import React, { useState } from 'react';
import type { Excerpt, TagColor } from '../types';
import { useCollection } from '../hooks/useCollection';

const TAG_COLOR_MAP: Record<TagColor, { bg: string; text: string }> = {
  red: { bg: '#fee2e2', text: '#dc2626' },
  orange: { bg: '#ffedd5', text: '#ea580c' },
  green: { bg: '#dcfce7', text: '#16a34a' },
  blue: { bg: '#dbeafe', text: '#2563eb' },
  purple: { bg: '#f3e8ff', text: '#9333ea' },
  gray: { bg: '#f3f4f6', text: '#4b5563' },
};

const TYPE_ICONS: Record<string, string> = {
  text: '📝',
  image: '🖼️',
  video: '🎬',
};

interface ExcerptCardProps {
  excerpt: Excerpt;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
}

export function ExcerptCard({
  excerpt,
  onClick,
  draggable = false,
  onDragStart,
  onDragEnd,
  isDragging = false,
}: ExcerptCardProps) {
  const { setExpandedCard, expandedCardId, addTag, removeTag, addAnnotation, addRelatedCard, getExcerptById, setSelectedTag, selectedTagId } = useCollection();
  const [newTagInput, setNewTagInput] = useState('');
  const [selectedColor, setSelectedColor] = useState<TagColor>('blue');
  const [showTagInput, setShowTagInput] = useState(false);
  const [annotationInput, setAnnotationInput] = useState('');
  const [relatedInput, setRelatedInput] = useState('');
  const [showAnnotationInput, setShowAnnotationInput] = useState(false);
  const [showRelatedInput, setShowRelatedInput] = useState(false);

  const isExpanded = expandedCardId === excerpt.id;
  const colors: TagColor[] = ['red', 'orange', 'green', 'blue', 'purple', 'gray'];

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.card-action')) return;
    setExpandedCard(isExpanded ? null : excerpt.id);
    onClick?.();
  };

  const handleAddTag = () => {
    if (newTagInput.trim() && excerpt.tags.length < 3) {
      addTag(excerpt.id, newTagInput.trim(), selectedColor);
      setNewTagInput('');
      setShowTagInput(false);
    }
  };

  const handleAddAnnotation = () => {
    if (annotationInput.trim()) {
      addAnnotation(excerpt.id, annotationInput.trim());
      setAnnotationInput('');
      setShowAnnotationInput(false);
    }
  };

  const handleAddRelated = () => {
    const cardId = relatedInput.trim();
    if (cardId && getExcerptById(cardId) && cardId !== excerpt.id) {
      addRelatedCard(excerpt.id, cardId);
      setRelatedInput('');
      setShowRelatedInput(false);
    }
  };

  const handleTagClick = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTag(selectedTagId === tagId ? null : tagId);
  };

  const renderContentPreview = () => {
    if (excerpt.type === 'image') {
      return (
        <img
          src={excerpt.content}
          alt={excerpt.title}
          style={{ width: '100%', height: 'auto', borderRadius: '8px', marginBottom: '12px' }}
        />
      );
    }
    if (excerpt.type === 'video') {
      return (
        <div style={{
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          marginBottom: '12px',
        }}>
          <span style={{ fontSize: '32px' }}>🎬</span>
          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', wordBreak: 'break-all' }}>
            {excerpt.content}
          </p>
        </div>
      );
    }
    return (
      <p style={{
        fontSize: '14px',
        color: '#4b5563',
        lineHeight: 1.6,
        display: '-webkit-box',
        WebkitLineClamp: isExpanded ? 'unset' : 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {excerpt.content}
      </p>
    );
  };

  const relatedCards = excerpt.relatedCardIds
    .map(id => getExcerptById(id))
    .filter(Boolean);

  return (
    <div
      className="excerpt-card"
      onClick={handleCardClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        width: '320px',
        backgroundColor: '#ffffff',
        border: '1px solid #f0f0f0',
        borderRadius: '16px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
        transform: isDragging ? 'translateY(-3px)' : undefined,
        boxShadow: isDragging ? '0 6px 18px rgba(0,0,0,0.10)' : undefined,
        opacity: isDragging ? 0.8 : 1,
        marginBottom: '20px',
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 18px rgba(0,0,0,0.10)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '16px' }}>{TYPE_ICONS[excerpt.type]}</span>
        <span
          className="card-action"
          style={{
            fontSize: '11px',
            color: '#9ca3af',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
          title={excerpt.sourceUrl}
        >
          {excerpt.sourceUrl}
        </span>
      </div>

      <h3 style={{
        fontSize: '15px',
        fontWeight: 600,
        color: '#1e3a5f',
        marginBottom: '12px',
        lineHeight: 1.4,
      }}>
        {excerpt.title}
      </h3>

      {renderContentPreview()}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        {excerpt.tags.map(tag => {
          const colorScheme = TAG_COLOR_MAP[tag.color];
          return (
            <span
              key={tag.id}
              className="card-action"
              onClick={(e) => handleTagClick(tag.id, e)}
              style={{
                padding: '3px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                backgroundColor: colorScheme.bg,
                color: colorScheme.text,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              {tag.name}
            </span>
          );
        })}
        {excerpt.tags.length < 3 && (
          <button
            className="card-action"
            onClick={(e) => { e.stopPropagation(); setShowTagInput(!showTagInput); }}
            style={{
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              border: '1px dashed #d1d5db',
              backgroundColor: 'transparent',
              color: '#9ca3af',
              cursor: 'pointer',
            }}
          >
            + 标签
          </button>
        )}
      </div>

      {showTagInput && (
        <div className="card-action" onClick={e => e.stopPropagation()} style={{ marginBottom: '12px' }}>
          <input
            type="text"
            value={newTagInput}
            onChange={e => setNewTagInput(e.target.value)}
            placeholder="输入标签名"
            style={{
              width: '100%',
              padding: '6px 10px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '12px',
              marginBottom: '8px',
            }}
            onKeyDown={e => e.key === 'Enter' && handleAddTag()}
          />
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            {colors.map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: selectedColor === color ? '2px solid #1e3a5f' : 'none',
                  backgroundColor: TAG_COLOR_MAP[color].bg,
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
          <button
            onClick={handleAddTag}
            style={{
              padding: '4px 12px',
              backgroundColor: '#1e3a5f',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            添加
          </button>
        </div>
      )}

      {isExpanded && (
        <div className="card-action" onClick={e => e.stopPropagation()} style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
          {excerpt.annotations.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                批注
              </h4>
              {excerpt.annotations.map(note => (
                <div
                  key={note.id}
                  style={{
                    padding: '8px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    marginBottom: '6px',
                    fontSize: '13px',
                    color: '#4b5563',
                  }}
                >
                  {note.content}
                </div>
              ))}
            </div>
          )}

          {!showAnnotationInput ? (
            <button
              onClick={() => setShowAnnotationInput(true)}
              style={{
                width: '100%',
                padding: '6px',
                border: '1px dashed #d1d5db',
                backgroundColor: 'transparent',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#9ca3af',
                cursor: 'pointer',
                marginBottom: '12px',
              }}
            >
              + 添加批注
            </button>
          ) : (
            <div style={{ marginBottom: '12px' }}>
              <textarea
                value={annotationInput}
                onChange={e => setAnnotationInput(e.target.value)}
                placeholder="写下你的批注..."
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '13px',
                  minHeight: '60px',
                  resize: 'vertical',
                  marginBottom: '8px',
                }}
              />
              <button
                onClick={handleAddAnnotation}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#1e3a5f',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                保存
              </button>
            </div>
          )}

          {relatedCards.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                关联卡片
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {relatedCards.map(card => card && (
                  <span
                    key={card.id}
                    onClick={() => setExpandedCard(card.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#4b5563',
                      cursor: 'pointer',
                    }}
                  >
                    🔗 {card.title.slice(0, 15)}...
                  </span>
                ))}
              </div>
            </div>
          )}

          {!showRelatedInput ? (
            <button
              onClick={() => setShowRelatedInput(true)}
              style={{
                width: '100%',
                padding: '6px',
                border: '1px dashed #d1d5db',
                backgroundColor: 'transparent',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#9ca3af',
                cursor: 'pointer',
              }}
            >
              + 关联卡片
            </button>
          ) : (
            <div>
              <input
                type="text"
                value={relatedInput}
                onChange={e => setRelatedInput(e.target.value)}
                placeholder="输入卡片ID"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '13px',
                  marginBottom: '8px',
                }}
                onKeyDown={e => e.key === 'Enter' && handleAddRelated()}
              />
              <button
                onClick={handleAddRelated}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#1e3a5f',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                添加
              </button>
            </div>
          )}

          <p style={{ fontSize: '10px', color: '#d1d5db', marginTop: '12px' }}>
            ID: {excerpt.id}
          </p>
        </div>
      )}

      <div style={{
        fontSize: '11px',
        color: '#d1d5db',
        marginTop: '8px',
      }}>
        {new Date(excerpt.createdAt).toLocaleString('zh-CN')}
      </div>
    </div>
  );
}
