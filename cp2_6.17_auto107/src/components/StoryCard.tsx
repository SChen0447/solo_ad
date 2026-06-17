import { useState, useCallback, useRef } from 'react';
import { Trash2, Play, ChevronDown } from 'lucide-react';
import { useAppStore, TRANSITION_LABELS } from '@/store';
import type { TransitionType, StoryCardData } from '@/types';

interface StoryCardProps {
  card: StoryCardData;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
  onDragStart: (index: number) => void;
  onDragOver: (index: number, insertBefore: boolean) => void;
  onDragEnd: (dropIndex: number) => void;
  isDragging?: boolean;
  dragOverIndex?: number;
  dragInsertBefore?: boolean;
}

const TRANSITION_TYPES: TransitionType[] = ['fadeInOut', 'slideUp', 'slideDown', 'slideLeft', 'slideRight', 'zoom'];

function getTransitionAnimName(type: TransitionType): string {
  switch (type) {
    case 'fadeInOut': return 'cardFadeIn';
    case 'slideUp': return 'cardSlideUp';
    case 'slideDown': return 'cardSlideDown';
    case 'slideLeft': return 'cardSlideLeft';
    case 'slideRight': return 'cardSlideRight';
    case 'zoom': return 'cardZoom';
    default: return 'cardFadeIn';
  }
}

export default function StoryCard({
  card,
  isSelected,
  onSelect,
  index,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging = false,
  dragOverIndex = -1,
  dragInsertBefore = false,
}: StoryCardProps) {
  const updateCard = useAppStore((s) => s.updateCard);
  const [isAnimating, setIsAnimating] = useState(false);
  const animTimerRef = useRef<number | null>(null);
  const animSeqRef = useRef(0);

  const triggerPreview = useCallback(() => {
    if (animTimerRef.current) {
      clearTimeout(animTimerRef.current);
      animTimerRef.current = null;
    }
    animSeqRef.current += 1;
    const seq = animSeqRef.current;
    setIsAnimating(false);
    requestAnimationFrame(() => {
      if (animSeqRef.current !== seq) return;
      setIsAnimating(true);
    });
  }, []);

  const handleAnimationEnd = useCallback(() => {
    setIsAnimating(false);
    if (animTimerRef.current) {
      clearTimeout(animTimerRef.current);
    }
    animTimerRef.current = window.setTimeout(() => {
      animSeqRef.current += 1;
      setIsAnimating(false);
    }, 50);
  }, []);

  const handleTransitionChange = useCallback(
    (transition: TransitionType) => {
      updateCard(card.id, { transition });
      triggerPreview();
    },
    [card.id, updateCard, triggerPreview]
  );

  const animStyle: React.CSSProperties = isAnimating
    ? {
        animation: `${getTransitionAnimName(card.transition)} 0.6s cubic-bezier(0.4, 0, 0.2, 1) both`,
      }
    : {
        animation: 'none',
        transform: 'none',
        opacity: 1,
      };

  const isDragTarget = dragOverIndex === index && dragInsertBefore;
  const cardBg = card.imageUrl
    ? { backgroundImage: `url(${card.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: card.bgColor };

  return (
    <div
      className={`flex-shrink-0 relative ${isDragTarget ? 'ml-6' : ''}`}
      style={{ transition: 'margin-left 0.3s ease' }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = e.currentTarget.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        const insertBefore = e.clientX < midX;
        onDragOver(index, insertBefore);
      }}
      onDrop={(e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        const insertBefore = e.clientX < midX;
        const dropIndex = insertBefore ? index : index + 1;
        onDragEnd(dropIndex);
      }}
    >
      <div
        className={`group relative rounded-xl cursor-pointer
          ${isSelected ? 'ring-2 ring-[#3b82f6] shadow-lg shadow-blue-500/25' : 'ring-1 ring-slate-600 hover:ring-slate-400'}
          ${isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}
        style={{
          width: 240,
          height: 180,
          transition: 'transform 0.3s ease, opacity 0.3s ease, box-shadow 0.3s ease',
        }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(index));
          onDragStart(index);
        }}
        onClick={onSelect}
      >
        <div
          className="absolute inset-0 rounded-xl overflow-hidden"
          style={{
            ...cardBg,
            ...animStyle,
            willChange: isAnimating ? 'transform, opacity' : 'auto',
          }}
          onAnimationEnd={handleAnimationEnd}
        >
          {!card.imageUrl && !card.title && !card.content && (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              点击编辑卡片
            </div>
          )}

          {(card.title || card.content) && (
            <div
              className="absolute inset-0 p-3 flex flex-col justify-end"
              style={{ background: card.imageUrl ? 'linear-gradient(transparent, rgba(0,0,0,0.75))' : 'transparent' }}
            >
              {card.title && (
                <div
                  className="font-semibold text-sm truncate mb-1"
                  style={{ color: card.imageUrl ? '#fff' : '#1e293b' }}
                >
                  {card.title}
                </div>
              )}
              {card.content && (
                <div
                  className="text-xs line-clamp-2"
                  style={{ color: card.imageUrl ? '#e2e8f0' : '#1e293b' }}
                >
                  {card.content}
                </div>
              )}
            </div>
          )}

          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerPreview();
              }}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors"
              title="预览动画"
            >
              <Play size={12} fill="white" />
            </button>
          </div>

          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="relative">
              <select
                value={card.transition}
                onChange={(e) => {
                  e.stopPropagation();
                  handleTransitionChange(e.target.value as TransitionType);
                }}
                onClick={(e) => e.stopPropagation()}
                className="appearance-none bg-black/60 text-white text-xs rounded-lg px-2 py-1 pr-6 cursor-pointer border-none outline-none hover:bg-black/80 transition-colors"
              >
                {TRANSITION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TRANSITION_LABELS[t]}
                  </option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white pointer-events-none" />
            </div>
          </div>

          <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-black/60 text-white text-xs rounded-lg px-2 py-1">
              {card.duration}s
            </span>
          </div>
        </div>

        {isSelected && (
          <div className="absolute -top-2 -right-2 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                useAppStore.getState().removeCard(card.id);
              }}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
