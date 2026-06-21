import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bubble, Panel } from '../../types';

interface BubbleOverlayProps {
  bubbles: Bubble[];
  panel: Panel;
  selectedBubbleId: string | null;
  onSelectBubble: (bubbleId: string | null) => void;
  onBubbleChange: (bubble: Bubble) => void;
  overlappingIds: string[];
}

const BubbleOverlay: React.FC<BubbleOverlayProps> = ({
  bubbles,
  panel,
  selectedBubbleId,
  onSelectBubble,
  onBubbleChange,
  overlappingIds
}) => {
  const [editingBubbleId, setEditingBubbleId] = useState<string | null>(null);
  const dragRef = useRef<{
    isDragging: boolean;
    isResizing: boolean;
    startX: number;
    startY: number;
    bubbleStartX: number;
    bubbleStartY: number;
    startWidth: number;
    startHeight: number;
    bubbleId: string;
  }>({
    isDragging: false,
    isResizing: false,
    startX: 0,
    startY: 0,
    bubbleStartX: 0,
    bubbleStartY: 0,
    startWidth: 0,
    startHeight: 0,
    bubbleId: ''
  });

  const handleMouseDown = useCallback((e: React.MouseEvent, bubble: Bubble, isResize: boolean = false) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectBubble(bubble.id);

    dragRef.current = {
      isDragging: !isResize,
      isResizing: isResize,
      startX: e.clientX,
      startY: e.clientY,
      bubbleStartX: bubble.x,
      bubbleStartY: bubble.y,
      startWidth: bubble.width,
      startHeight: bubble.height,
      bubbleId: bubble.id
    };
  }, [onSelectBubble]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.isDragging && !dragRef.current.isResizing) return;

      const bubble = bubbles.find(b => b.id === dragRef.current.bubbleId);
      if (!bubble) return;

      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      if (dragRef.current.isDragging) {
        const newX = dragRef.current.bubbleStartX + dx;
        const newY = dragRef.current.bubbleStartY + dy;
        const clampedX = Math.min(Math.max(5, newX), Math.max(5, panel.width - bubble.width - 5));
        const clampedY = Math.min(Math.max(5, newY), Math.max(5, panel.height - bubble.height - 5));
        onBubbleChange({ ...bubble, x: clampedX, y: clampedY });
      }

      if (dragRef.current.isResizing) {
        const newWidth = Math.max(40, dragRef.current.startWidth + dx);
        const newHeight = Math.max(40, dragRef.current.startHeight + dy);
        const clampedWidth = Math.min(newWidth, panel.width - bubble.x - 5);
        const clampedHeight = Math.min(newHeight, panel.height - bubble.y - 5);
        onBubbleChange({ ...bubble, width: clampedWidth, height: clampedHeight });
      }
    };

    const handleMouseUp = () => {
      dragRef.current.isDragging = false;
      dragRef.current.isResizing = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [bubbles, panel.width, panel.height, onBubbleChange]);

  const getBubbleStyle = (bubble: Bubble): React.CSSProperties => {
    const isOverlapping = overlappingIds.includes(bubble.id);
    const isSelected = selectedBubbleId === bubble.id;
    let borderStyle: React.CSSProperties = {};

    if (bubble.type === 'ellipse') {
      borderStyle = {
        borderRadius: '50%'
      };
    } else if (bubble.type === 'cloud') {
      borderStyle = {
        borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%'
      };
    } else {
      borderStyle = {
        borderRadius: bubble.borderRadius || 0
      };
    }

    return {
      position: 'absolute',
      left: bubble.x,
      top: bubble.y,
      width: bubble.width,
      height: bubble.height,
      backgroundColor: '#FFFFFF',
      border: `2px solid ${isOverlapping ? '#FF1744' : '#333333'}`,
      boxShadow: isSelected ? '0 0 0 2px rgba(25, 118, 210, 0.4)' : 'none',
      cursor: 'move',
      display: 'flex',
      alignItems: 'center',
      justifyContent: bubble.textAlign === 'left' ? 'flex-start' : bubble.textAlign === 'right' ? 'flex-end' : 'center',
      padding: '8px 14px',
      overflow: 'hidden',
      ...borderStyle
    };
  };

  return (
    <>
      {bubbles.map(bubble => {
        const isEditing = editingBubbleId === bubble.id;
        return (
          <div
            key={bubble.id}
            style={getBubbleStyle(bubble)}
            onMouseDown={(e) => handleMouseDown(e, bubble)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditingBubbleId(bubble.id);
            }}
          >
            {isEditing ? (
              <input
                autoFocus
                value={bubble.text}
                onChange={(e) => onBubbleChange({ ...bubble, text: e.target.value })}
                onBlur={() => setEditingBubbleId(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingBubbleId(null);
                  e.stopPropagation();
                }}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: bubble.fontSize,
                  color: bubble.textColor,
                  textAlign: bubble.textAlign,
                  fontFamily: 'inherit'
                }}
              />
            ) : (
              <span
                style={{
                  fontSize: bubble.fontSize,
                  color: bubble.textColor,
                  textAlign: bubble.textAlign,
                  width: '100%',
                  wordBreak: 'break-word',
                  lineHeight: 1.3,
                  pointerEvents: 'none'
                }}
              >
                {bubble.text}
              </span>
            )}

            {selectedBubbleId === bubble.id && (
              <div
                onMouseDown={(e) => handleMouseDown(e, bubble, true)}
                style={{
                  position: 'absolute',
                  right: -4,
                  bottom: -4,
                  width: 12,
                  height: 12,
                  backgroundColor: '#1976D2',
                  borderRadius: 2,
                  cursor: 'nwse-resize',
                  border: '1px solid #FFF'
                }}
              />
            )}
          </div>
        );
      })}
    </>
  );
};

export default React.memo(BubbleOverlay);
