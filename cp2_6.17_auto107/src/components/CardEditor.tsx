import { useCallback } from 'react';
import { useAppStore, TRANSITION_LABELS, DEFAULT_CARD_COLORS } from '@/store';
import type { TransitionType, StoryCardData } from '@/types';

const TRANSITION_TYPES: TransitionType[] = ['fadeInOut', 'slideUp', 'slideDown', 'slideLeft', 'slideRight', 'zoom'];

export default function CardEditor() {
  const selectedCardId = useAppStore((s) => s.selectedCardId);
  const cards = useAppStore((s) => s.cards);
  const updateCard = useAppStore((s) => s.updateCard);
  const selectCard = useAppStore((s) => s.selectCard);

  const card = cards.find((c) => c.id === selectedCardId);

  const handleChange = useCallback(
    (field: keyof StoryCardData, value: string | number) => {
      if (card) {
        updateCard(card.id, { [field]: value });
      }
    },
    [card, updateCard]
  );

  if (!card) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm p-6 text-center">
        选择一张卡片进行编辑，或添加新的故事卡片
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full" style={{ maxHeight: 'calc(100vh - 200px)' }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-200">编辑卡片</h3>
        <button
          onClick={() => selectCard(null)}
          className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
        >
          关闭
        </button>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">标题（最多30字）</label>
        <input
          type="text"
          value={card.title}
          onChange={(e) => handleChange('title', e.target.value.slice(0, 30))}
          placeholder="输入卡片标题..."
          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none focus:border-indigo-500 transition-colors"
        />
        <div className="text-right text-xs text-slate-500 mt-1">{card.title.length}/30</div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">正文（最多200字）</label>
        <textarea
          value={card.content}
          onChange={(e) => handleChange('content', e.target.value.slice(0, 200))}
          placeholder="输入卡片正文..."
          rows={4}
          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none focus:border-indigo-500 transition-colors resize-none"
        />
        <div className="text-right text-xs text-slate-500 mt-1">{card.content.length}/200</div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">背景颜色</label>
        <div className="flex items-center gap-2 flex-wrap">
          {DEFAULT_CARD_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => handleChange('bgColor', color)}
              className={`w-7 h-7 rounded-lg border-2 transition-all ${
                card.bgColor === color && !card.imageUrl ? 'border-indigo-500 scale-110' : 'border-transparent hover:border-slate-400'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <div className="relative">
            <input
              type="color"
              value={card.bgColor}
              onChange={(e) => handleChange('bgColor', e.target.value)}
              className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">图片URL</label>
        <input
          type="text"
          value={card.imageUrl}
          onChange={(e) => handleChange('imageUrl', e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">转场效果</label>
        <select
          value={card.transition}
          onChange={(e) => handleChange('transition', e.target.value as TransitionType)}
          className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none focus:border-indigo-500 transition-colors cursor-pointer"
        >
          {TRANSITION_TYPES.map((t) => (
            <option key={t} value={t}>
              {TRANSITION_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">持续时长：{card.duration}秒</label>
        <input
          type="range"
          min={1}
          max={10}
          step={0.5}
          value={card.duration}
          onChange={(e) => handleChange('duration', parseFloat(e.target.value))}
          className="w-full accent-indigo-500"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>1s</span>
          <span>10s</span>
        </div>
      </div>
    </div>
  );
}
