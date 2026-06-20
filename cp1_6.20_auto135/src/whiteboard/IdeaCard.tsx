import React, { memo, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { IdeaCardData } from '../types';
import { TAG_COLORS, CARD_WIDTH, CARD_HEIGHT } from '../types';

interface IdeaCardProps {
  card: IdeaCardData;
  isDragging?: boolean;
  readOnly?: boolean;
  isVotingPhase?: boolean;
  onContentChange?: (cardId: string, content: string) => void;
  onColorChange?: (cardId: string, color: string | null) => void;
  onDelete?: (cardId: string) => void;
  onMouseDown?: (e: React.MouseEvent, cardId: string) => void;
  onTouchStart?: (e: React.TouchEvent, cardId: string) => void;
}

const IdeaCardBase: React.FC<IdeaCardProps> = ({
  card,
  isDragging = false,
  readOnly = false,
  isVotingPhase = false,
  onContentChange,
  onColorChange,
  onDelete,
  onMouseDown,
  onTouchStart,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showColors, setShowColors] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.target.value;
      if (v.length <= 120) {
        onContentChange?.(card.id, v);
      }
    },
    [card.id, onContentChange],
  );

  const handleColorSelect = useCallback(
    (color: string | null) => {
      onColorChange?.(card.id, color);
      setShowColors(false);
    },
    [card.id, onColorChange],
  );

  const editable = !readOnly && !isVotingPhase;

  return (
    <motion.div
      layout
      data-card-id={card.id}
      onMouseDown={(e) => {
        if (editable) onMouseDown?.(e, card.id);
      }}
      onTouchStart={(e) => {
        if (editable) onTouchStart?.(e, card.id);
      }}
      style={{
        position: 'absolute',
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        left: 0,
        top: 0,
        transform: `translate(${card.x}px, ${card.y}px)`,
        zIndex: card.zIndex,
        borderRadius: 12,
        background: '#ffffff',
        boxShadow: isDragging
          ? '0 12px 28px rgba(0,0,0,0.15)'
          : '0 4px 16px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: editable ? 'grab' : 'default',
        touchAction: 'none',
        userSelect: 'none',
        willChange: isDragging ? 'transform' : 'auto',
      }}
      animate={{
        scale: isDragging ? 1.05 : 1,
      }}
      transition={{
        scale: { type: 'spring', stiffness: 400, damping: 25, duration: 0.2 },
        boxShadow: { duration: 0.2 },
      }}
    >
      <div
        style={{
          height: 4,
          width: '100%',
          background: card.color || 'transparent',
          flexShrink: 0,
          transition: 'background 0.2s ease-out',
        }}
      />
      <div
        style={{
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
          flex: 1,
          minHeight: 0,
        }}
      >
        <textarea
          ref={textareaRef}
          value={card.content}
          maxLength={120}
          placeholder="写下你的想法..."
          onChange={handleContentChange}
          onFocus={() => {
            setIsEditing(true);
          }}
          onBlur={() => setIsEditing(false)}
          readOnly={!editable}
          style={{
            flex: 1,
            width: '100%',
            resize: 'none',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 14,
            lineHeight: 1.5,
            color: '#333',
            fontFamily: 'inherit',
            cursor: editable ? 'text' : 'default',
            padding: 0,
          }}
        />
        {editable && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowColors((v) => !v);
              }}
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: '1.5px solid #ddd',
                background: card.color || '#fff',
                cursor: 'pointer',
                flexShrink: 0,
                padding: 0,
                transition: 'transform 0.15s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(1.15)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
            />
            {showColors && (
              <div
                onClick={(e) => e.stopPropagation()}
                onMouseLeave={() => setShowColors(false)}
                style={{
                  position: 'absolute',
                  top: 22,
                  right: 0,
                  background: '#fff',
                  borderRadius: 10,
                  boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                  padding: 8,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 6,
                  zIndex: 9999,
                }}
              >
                {TAG_COLORS.map((c) => (
                  <div
                    key={c.color}
                    title={c.name}
                    onClick={() => handleColorSelect(c.color)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: c.color,
                      cursor: 'pointer',
                      border: card.color === c.color ? '2px solid #333' : '2px solid transparent',
                      transition: 'transform 0.15s ease-out',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.2)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                    }}
                  />
                ))}
                <div
                  title="清除颜色"
                  onClick={() => handleColorSelect(null)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'repeating-linear-gradient(45deg, #fff, #fff 3px, #ddd 3px, #ddd 6px)',
                    cursor: 'pointer',
                    border: '2px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    color: '#888',
                    transition: 'transform 0.15s',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(1.2)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
                >
                  ✕
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div
        style={{
          padding: '0 12px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          borderTop: isEditing ? '1px dashed #ff922b' : '1px solid transparent',
          paddingTop: isEditing ? 6 : 0,
          transition: 'all 0.2s',
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: '#999',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background:
                'linear-gradient(135deg, #ff922b 0%, #ffd43b 100%)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {card.authorName.charAt(0).toUpperCase() || '?'}
          </div>
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={card.authorName}
          >
            {card.authorName}
          </span>
        </div>
        {editable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('确定删除这张卡片？')) onDelete?.(card.id);
            }}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#ccc',
              cursor: 'pointer',
              fontSize: 14,
              padding: '2px 4px',
              borderRadius: 4,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              const t = e.currentTarget as HTMLElement;
              t.style.color = '#ff6b6b';
              t.style.background = '#fff0f0';
            }}
            onMouseLeave={(e) => {
              const t = e.currentTarget as HTMLElement;
              t.style.color = '#ccc';
              t.style.background = 'transparent';
            }}
            title="删除卡片"
          >
            🗑
          </button>
        )}
      </div>
    </motion.div>
  );
};

export const IdeaCard = memo(IdeaCardBase, (prev, next) => {
  return (
    prev.card === next.card &&
    prev.isDragging === next.isDragging &&
    prev.readOnly === next.readOnly &&
    prev.isVotingPhase === next.isVotingPhase
  );
});
