import React from 'react';
import { GripVertical, Trash2, Link2 } from 'lucide-react';
import { Tag, TagColors } from '@/model/CardModel';
import type { InspirationCard } from '@/model/CardModel';
import { useMindStore } from '@/store/useMindStore';

interface CardItemProps {
  card: InspirationCard;
  isHighlighted: boolean;
}

const CardItem: React.FC<CardItemProps> = ({ card, isHighlighted }) => {
  const selectedCardId = useMindStore((s) => s.selectedCardId);
  const setSelectedCardId = useMindStore((s) => s.setSelectedCardId);
  const deleteCard = useMindStore((s) => s.deleteCard);
  const setConnectingFrom = useMindStore((s) => s.setConnectingFrom);

  const isSelected = selectedCardId === card.id;

  const handleConnectionStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setConnectingFrom(card.id);
  };

  return (
    <div
      className={`absolute w-[220px] backdrop-blur-[12px] rounded-[16px] border transition-all duration-200 cursor-pointer select-none ${
        isHighlighted ? 'bg-white/[0.15]' : 'bg-white/[0.08]'
      } border-white/[0.15] ${isSelected ? 'ring-2 ring-white/30' : ''}`}
      style={{ transform: `translate(${card.x}px, ${card.y}px)` }}
      onClick={() => setSelectedCardId(card.id)}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <GripVertical className="w-4 h-4 text-white/30 cursor-grab" />
          <div className="flex items-center gap-1">
            <button
              className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/80"
              onClick={(e) => {
                e.stopPropagation();
                deleteCard(card.id);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {card.tags.map((tag) => {
              const color = TagColors[tag as Tag];
              return (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                  style={{
                    backgroundColor: `${color}33`,
                    color: color,
                  }}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        )}

        <h3 className="font-display text-sm text-white/90 mb-1 leading-snug">
          {card.title}
        </h3>

        <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">
          {card.content}
        </p>
      </div>

      <div
        data-connection-handle
        className="absolute bottom-2 right-2 w-5 h-5 bg-white/10 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/20"
        onMouseDown={handleConnectionStart}
        onTouchStart={handleConnectionStart}
      >
        <Link2 className="w-3 h-3 text-white/50" />
      </div>
    </div>
  );
};

export default CardItem;
