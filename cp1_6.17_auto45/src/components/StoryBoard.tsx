import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableCard from './SortableCard';
import ImageCard from './ImageCard';
import type { ComicCard } from '../types';

interface StoryBoardProps {
  cards: ComicCard[];
  selectedCardId: string | null;
  onAddCard: () => void;
  onSelectCard: (cardId: string) => void;
  onReorderCards: (cards: ComicCard[]) => void;
  onUpdateCard: (cardId: string, updates: Partial<ComicCard>) => void;
  maxCards?: number;
}

const StoryBoard: React.FC<StoryBoardProps> = ({
  cards,
  selectedCardId,
  onAddCard,
  onSelectCard,
  onReorderCards,
  onUpdateCard,
  maxCards = 20,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setIsDragging(false);

    if (over && active.id !== over.id) {
      const oldIndex = cards.findIndex((card) => card.id === active.id);
      const newIndex = cards.findIndex((card) => card.id === over.id);
      onReorderCards(arrayMove(cards, oldIndex, newIndex));
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setIsDragging(false);
  };

  const updateScrollProgress = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const maxScroll = scrollWidth - clientWidth;
      const progress = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;
      setScrollProgress(Math.min(100, Math.max(0, progress)));
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollProgress);
      updateScrollProgress();
      return () => container.removeEventListener('scroll', updateScrollProgress);
    }
  }, [updateScrollProgress, cards.length]);

  useEffect(() => {
    updateScrollProgress();
  }, [cards, updateScrollProgress]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const { scrollWidth, clientWidth } = scrollContainerRef.current;
    const targetScroll = percentage * (scrollWidth - clientWidth);
    scrollContainerRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });
  };

  const scrollToCard = (cardId: string) => {
    const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
    if (cardElement && scrollContainerRef.current) {
      cardElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  };

  useEffect(() => {
    if (selectedCardId) {
      scrollToCard(selectedCardId);
    }
  }, [selectedCardId]);

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  return (
    <div className="storyboard-container">
      <div className="storyboard-header">
        <h2>故事板</h2>
        <span className="card-count">
          {cards.length} / {maxCards} 张
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          ref={scrollContainerRef}
          className={`storyboard-scroll ${isDragging ? 'dragging' : ''}`}
        >
          <button
            className="add-card-btn"
            onClick={onAddCard}
            disabled={cards.length >= maxCards}
          >
            <span className="plus-icon">+</span>
            <span>添加卡片</span>
          </button>

          <SortableContext items={cards.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            <div className="cards-container">
              {cards.map((card) => (
                <div key={card.id} data-card-id={card.id}>
                  <SortableCard
                    card={card}
                    isSelected={selectedCardId === card.id}
                    onSelect={() => onSelectCard(card.id)}
                    onUpdateCard={(updates) => onUpdateCard(card.id, updates)}
                  />
                </div>
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeCard ? (
              <div style={{ transform: 'scale(1.05)', opacity: 0.9 }}>
                <ImageCard
                  card={activeCard}
                  isExpanded={false}
                  onUpdateCard={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </div>
      </DndContext>

      <div
        className="progress-container"
        onClick={handleProgressClick}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={scrollProgress}
        tabIndex={0}
      >
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${scrollProgress}%` }}
          />
          {cards.map((card, index) => (
            <div
              key={card.id}
              className={`progress-marker ${selectedCardId === card.id ? 'active' : ''}`}
              style={{
                left: `${cards.length > 1 ? (index / (cards.length - 1)) * 100 : 50}%`,
              }}
              title={`第 ${index + 1} 张`}
            />
          ))}
        </div>
        <div className="progress-labels">
          <span>开始</span>
          <span>结束</span>
        </div>
      </div>

      <style>{`
        .storyboard-container {
          width: 100%;
          background: #ffffff;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        }

        .storyboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .storyboard-header h2 {
          margin: 0;
          font-family: 'Noto Sans SC', sans-serif;
          font-size: 20px;
          font-weight: 600;
          color: #333333;
        }

        .card-count {
          font-family: 'Noto Sans SC', sans-serif;
          font-size: 14px;
          color: #8FBC8F;
          font-weight: 500;
        }

        .storyboard-scroll {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 12px 4px;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          transition: all 0.3s ease-out;
        }

        .storyboard-scroll::-webkit-scrollbar {
          height: 8px;
        }

        .storyboard-scroll::-webkit-scrollbar-track {
          background: #f0f0f0;
          border-radius: 4px;
        }

        .storyboard-scroll::-webkit-scrollbar-thumb {
          background: #cccccc;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .storyboard-scroll::-webkit-scrollbar-thumb:hover {
          background: #999999;
        }

        .storyboard-scroll.dragging {
          cursor: grabbing;
          scroll-behavior: auto;
        }

        .add-card-btn {
          flex-shrink: 0;
          width: 240px;
          height: 240px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border: 2px dashed #8FBC8F;
          border-radius: 8px;
          background: #f8fff8;
          color: #8FBC8F;
          font-family: 'Noto Sans SC', sans-serif;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease-out;
        }

        .add-card-btn:hover:not(:disabled) {
          border-color: #6b9b6b;
          color: #6b9b6b;
          background: #f0fff0;
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(143, 188, 143, 0.3);
        }

        .add-card-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          border-color: #cccccc;
          color: #cccccc;
          background: #f5f5f5;
        }

        .plus-icon {
          font-size: 48px;
          font-weight: 300;
          line-height: 1;
        }

        .cards-container {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .progress-container {
          margin-top: 20px;
          cursor: pointer;
        }

        .progress-track {
          position: relative;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: visible;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          border-radius: 4px;
          transition: width 0.1s ease-out;
        }

        .progress-marker {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #cccccc;
          transition: all 0.2s;
          z-index: 1;
        }

        .progress-marker:hover {
          transform: translate(-50%, -50%) scale(1.3);
          border-color: #667eea;
        }

        .progress-marker.active {
          width: 16px;
          height: 16px;
          background: #667eea;
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.3);
        }

        .progress-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          font-family: 'Noto Sans SC', sans-serif;
          font-size: 12px;
          color: #999999;
        }

        @media (max-width: 768px) {
          .storyboard-container {
            padding: 16px;
          }

          .storyboard-scroll {
            flex-direction: column;
            gap: 8px;
            overflow-x: hidden;
            overflow-y: auto;
            max-height: none;
          }

          .add-card-btn {
            width: 100%;
            height: 80px;
            flex-direction: row;
          }

          .plus-icon {
            font-size: 32px;
          }

          .cards-container {
            flex-direction: column;
            gap: 8px;
            width: 100%;
          }

          .progress-container {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default StoryBoard;
