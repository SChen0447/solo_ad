import React, { useRef, useState } from 'react';
import type { ColorScheme } from '../theme-engine/colorUtils';
import './SchemeCard.css';

interface SchemeCardProps {
  scheme: ColorScheme;
  isSelected: boolean;
  index: number;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
}

const SchemeCard: React.FC<SchemeCardProps> = ({
  scheme,
  isSelected,
  index,
  onSelect,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const colorDots = [
    scheme.primary,
    scheme.secondary,
    scheme.background,
    scheme.text,
    scheme.accent
  ];

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    onDragStart(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    if (cardRef.current) {
      e.dataTransfer.setDragImage(cardRef.current, 50, 30);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver(index);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(scheme.id);
  };

  return (
    <div
      ref={cardRef}
      className={`scheme-card ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onClick={() => onSelect(scheme.id)}
    >
      <div className="scheme-card-drag-handle">⋮⋮</div>
      <div className="scheme-card-colors">
        {colorDots.map((color, i) => (
          <div
            key={i}
            className="color-dot"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      <span className="scheme-card-name">{scheme.name}</span>
      <button
        className="scheme-card-delete"
        onClick={handleDelete}
        title="删除方案"
      >
        ×
      </button>
    </div>
  );
};

export default SchemeCard;
