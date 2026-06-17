import { useState, useCallback } from 'react';
import { Plus, GripVertical } from 'lucide-react';
import { useAppStore } from '@/store';
import StoryCard from './StoryCard';

export default function TimeLine() {
  const cards = useAppStore((s) => s.cards);
  const selectedCardId = useAppStore((s) => s.selectedCardId);
  const addCard = useAppStore((s) => s.addCard);
  const selectCard = useAppStore((s) => s.selectCard);
  const reorderCards = useAppStore((s) => s.reorderCards);

  const [dragIndex, setDragIndex] = useState<number>(-1);
  const [dragOverIndex, setDragOverIndex] = useState<number>(-1);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((index: number) => {
    if (index !== dragIndex) {
      setDragOverIndex(index);
    }
  }, [dragIndex]);

  const handleDragEnd = useCallback(() => {
    if (dragIndex >= 0 && dragOverIndex >= 0 && dragIndex !== dragOverIndex) {
      reorderCards(dragIndex, dragOverIndex);
    }
    setDragIndex(-1);
    setDragOverIndex(-1);
  }, [dragIndex, dragOverIndex, reorderCards]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <GripVertical size={16} className="text-slate-500" />
          <h2 className="text-sm font-medium text-slate-300">时间轴</h2>
          <span className="text-xs text-slate-500 px-2 py-0.5 bg-slate-700/50 rounded-full">
            {cards.length} 张卡片
          </span>
        </div>
        <button
          onClick={addCard}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white
            bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400
            shadow-md shadow-indigo-500/20 transition-all active:scale-95"
        >
          <Plus size={14} />
          添加卡片
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {cards.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center mb-4">
              <Plus size={28} className="text-slate-500" />
            </div>
            <h3 className="text-slate-300 font-medium mb-2">还没有故事卡片</h3>
            <p className="text-slate-500 text-sm mb-4">点击上方"添加卡片"按钮开始创作你的故事</p>
            <button
              onClick={addCard}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white
                bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400
                shadow-md shadow-indigo-500/20 transition-all active:scale-95"
            >
              创建第一张卡片
            </button>
          </div>
        ) : (
          <div
            className="timeline-container flex gap-4
              max-md:flex-col max-md:items-center"
            onDragOver={(e) => e.preventDefault()}
          >
            {cards.map((card, index) => (
              <StoryCard
                key={card.id}
                card={card}
                index={index}
                isSelected={selectedCardId === card.id}
                onSelect={() => selectCard(card.id)}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                isDragging={dragIndex === index}
                dragOverIndex={dragOverIndex}
              />
            ))}
            <button
              onClick={addCard}
              className="flex-shrink-0 flex flex-col items-center justify-center gap-2 rounded-xl
                border-2 border-dashed border-slate-600 hover:border-indigo-500 hover:bg-indigo-500/5
                text-slate-500 hover:text-indigo-400 transition-all active:scale-95
                max-md:w-[240px]"
              style={{ width: 240, height: 180 }}
            >
              <Plus size={28} />
              <span className="text-xs">添加卡片</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
