import { useState, useCallback, useRef, useEffect } from 'react';
import { Trash2, Play, ChevronDown } from 'lucide-react';
import { useAppStore, TRANSITION_LABELS } from '@/store';
import type { TransitionType, StoryCardData } from '@/types';

interface StoryCardProps {
  card: StoryCardData;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
  isDragging?: boolean;
  dragOverIndex?: number;
}

const TRANSITION_TYPES: TransitionType[] = ['fadeInOut', 'slideUp', 'slideDown', 'slideLeft', 'slideRight', 'zoom'];

function getTransitionAnimStyle(type: TransitionType, animKey: number): React.CSSProperties {
  const duration = '0.6s';
  const easing = 'cubic-bezier(0.4, 0, 0.2, 1)';
  switch (type) {
    case 'fadeInOut':
      return {
        animation: `${animKey > 0 ? 'cardFadeIn' : 'none'} ${duration} ${easing} both`,
      };
    case 'slideUp':
      return {
        animation: `${animKey > 0 ? 'cardSlideUp' : 'none'} ${duration} ${easing} both`,
      };
    case 'slideDown':
      return {
        animation: `${animKey > 0 ? 'cardSlideDown' : 'none'} ${duration} ${easing} both`,
      };
    case 'slideLeft':
      return {
        animation: `${animKey > 0 ? 'cardSlideLeft' : 'none'} ${duration} ${easing} both`,
      };
    case 'slideRight':
      return {
        animation: `${animKey > 0 ? 'cardSlideRight' : 'none'} ${duration} ${easing} both`,
      };
    case 'zoom':
      return {
        animation: `${animKey > 0 ? 'cardZoom' : 'none'} ${duration} ${easing} both`,
      };
    default:
      return {};
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
}: StoryCardProps) {
  const updateCard = useAppStore((s) => s.updateCard);
  const [animKey, setAnimKey] = useState(0);
  const animKeyRef = useRef(0);

  const triggerPreview = useCallback(() => {
    animKeyRef.current += 1;
    setAnimKey(animKeyRef.current);
  }, []);

  const handleTransitionChange = useCallback(
    (transition: TransitionType) => {
      updateCard(card.id, { transition });
      triggerPreview();
    },
    [card.id, updateCard, triggerPreview]
  );

  const animStyle = getTransitionAnimStyle(card.transition, animKey);
  useEffect(() => {
    if (animKey > 0) {
      const t = setTimeout(() => {
        animKeyRef.current = 0;
        setAnimKey(0);
      }, 700);
      return () => clearTimeout(t);
    }
  }, [animKey]);

  const showInsertBefore = dragOverIndex === index;
  const cardBg = card.imageUrl
    ? { backgroundImage: `url(${card.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: card.bgColor };

  return (
    <div
      className={`flex-shrink-0 relative transition-all ${showInsertBefore ? 'pl-6' : ''}`}
      style={{ transitionDuration: '300ms', transitionTimingFunction: 'ease' }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(index);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDragEnd();
      }}
    >
      <div
        className={`group relative rounded-xl cursor-pointer transition-all
          ${isSelected ? 'ring-2 ring-[#3b82f6] shadow-lg shadow-blue-500/25' : 'ring-1 ring-slate-600 hover:ring-slate-400'}
          ${isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}
        style={{
          width: 240,
          height: 180,
          transitionDuration: '300ms',
          transitionTimingFunction: 'ease',
          transitionProperty: 'transform, opacity, box-shadow',
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
            willChange: 'transform, opacity',
          }}
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
