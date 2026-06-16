import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ImageCard from './ImageCard';
import type { ComicCard } from '../types';

interface SortableCardProps {
  card: ComicCard;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateCard: (updates: Partial<ComicCard>) => void;
}

const SortableCard: React.FC<SortableCardProps> = ({ card, isSelected, onSelect, onUpdateCard }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sortable-card ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
      {...attributes}
      {...listeners}
    >
      <ImageCard
        card={card}
        isExpanded={false}
        onUpdateCard={onUpdateCard}
        onClick={onSelect}
      />
      {isDragging && <div className="drag-placeholder" />}
      <style>{`
        .sortable-card {
          flex-shrink: 0;
          transition: all 0.3s ease-out;
          touch-action: none;
        }

        .sortable-card.dragging {
          z-index: 100;
          transform: scale(1.02);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .sortable-card.selected {
          transform: scale(1.02);
        }

        .sortable-card.selected .image-card {
          box-shadow: 0 0 0 3px #5B9BD5, 0 4px 20px rgba(91, 155, 213, 0.3);
        }

        .drag-placeholder {
          position: absolute;
          inset: -4px;
          border: 2px dashed #667eea;
          border-radius: 12px;
          background: rgba(102, 126, 234, 0.1);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default SortableCard;
