import React, { useRef } from 'react';
import { RetroItem } from '../api';

interface RetroCardProps {
  item: RetroItem;
  index: number;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

const RetroCard: React.FC<RetroCardProps> = ({
  item,
  index,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging
}) => {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
    }, 200);
  };

  const handlePointerUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  };

  const handlePointerLeave = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!isLongPress.current) {
      e.preventDefault();
      return;
    }
    onDragStart(e, item.id, index);
  };

  return (
    <div
      className={`retro-card ${isDragging ? 'dragging' : ''}`}
      draggable
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onDragStart={handleDragStart}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      style={{ animationDelay: `${index * 0.02}s` }}
    >
      <div className="retro-card-content">{item.content}</div>
      <div className="retro-card-footer">
        <span>#{index + 1}</span>
        <button
          className="delete-item-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          title="删除"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default RetroCard;
