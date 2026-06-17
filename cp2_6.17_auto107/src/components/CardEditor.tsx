import { useCallback, useState } from 'react';
import { AlertCircle, Image, Check } from 'lucide-react';
import { useAppStore, TRANSITION_LABELS, DEFAULT_CARD_COLORS } from '@/store';
import type { TransitionType, StoryCardData } from '@/types';

const TRANSITION_TYPES: TransitionType[] = ['fadeInOut', 'slideUp', 'slideDown', 'slideLeft', 'slideRight', 'zoom'];

function isValidUrl(url: string): boolean {
  if (!url) return true;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default function CardEditor() {
  const selectedCardId = useAppStore((s) => s.selectedCardId);
  const cards = useAppStore((s) => s.cards);
  const updateCard = useAppStore((s) => s.updateCard);
  const selectCard = useAppStore((s) => s.selectCard);

  const card = cards.find((c) => c.id === selectedCardId);

  const [titleError, setTitleError] = useState('');
  const [contentError, setContentError] = useState('');
  const [imageUrlError, setImageUrlError] = useState('');

  const handleChange = useCallback(
    (field: keyof StoryCardData, value: string | number) => {
      if (!card) return;

      if (field === 'title') {
        const v = value as string;
        if (v.length > 30) {
          setTitleError('标题不能超过30个字符');
          return;
        }
        setTitleError('');
        updateCard(card.id, { title: v });
      }

      if (field === 'content') {
        const v = value as string;
        if (v.length > 200) {
          setContentError('正文不能超过200个字符');
          return;
        }
        setContentError('');
        updateCard(card.id, { content: v });
      }

      if (field === 'imageUrl') {
        const v = value as string;
        if (v && !isValidUrl(v)) {
          setImageUrlError('请输入有效的URL地址');
        } else {
          setImageUrlError('');
        }
        updateCard(card.id, { imageUrl: v });
      }

      if (field === 'bgColor' || field === 'transition' || field === 'duration') {
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

  const previewBg = card.imageUrl
    ? { backgroundImage: `url(${card.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: card.bgColor };

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
        <div className="relative rounded-xl overflow-hidden border border-slate-600" style={{ width: '100%', height: 120 }}>
          <div className="absolute inset-0" style={previewBg}>
            {!card.imageUrl && !card.title && !card.content && (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                卡片预览
              </div>
            )}
            {(card.title || card.content) && (
              <div className="absolute inset-0 p-2 flex flex-col justify-end" style={{ background: card.imageUrl ? 'linear-gradient(transparent, rgba(0,0,0,0.7))' : 'transparent' }}>
                {card.title && (
                  <div className="font-semibold text-xs truncate mb-0.5" style={{ color: card.imageUrl ? '#fff' : '#1e293b' }}>
                    {card.title}
                  </div>
                )}
                {card.content && (
                  <div className="text-xs line-clamp-2" style={{ color: card.imageUrl ? '#e2e8f0' : '#1e293b', fontSize: 9 }}>
                    {card.content}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
          <Check size={10} className="text-emerald-500" />
          实时预览
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">标题（最多30字）</label>
        <input
          type="text"
          value={card.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="输入卡片标题..."
          className={`w-full bg-slate-700/50 border rounded-lg px-3 py-2 text-slate-200 text-sm outline-none focus:border-indigo-500 transition-colors ${
            titleError ? 'border-red-500/70' : 'border-slate-600'
          }`}
        />
        {titleError && (
          <div className="flex items-center gap-1 text-red-400 text-xs mt-1">
            <AlertCircle size={10} />
            {titleError}
          </div>
        )}
        <div className="text-right text-xs text-slate-500 mt-1">{card.title.length}/30</div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">正文（最多200字）</label>
        <textarea
          value={card.content}
          onChange={(e) => handleChange('content', e.target.value)}
          placeholder="输入卡片正文..."
          rows={4}
          className={`w-full bg-slate-700/50 border rounded-lg px-3 py-2 text-slate-200 text-sm outline-none focus:border-indigo-500 transition-colors resize-none ${
            contentError ? 'border-red-500/70' : 'border-slate-600'
          }`}
        />
        {contentError && (
          <div className="flex items-center gap-1 text-red-400 text-xs mt-1">
            <AlertCircle size={10} />
            {contentError}
          </div>
        )}
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
          <div className="relative flex items-center gap-1">
            <input
              type="color"
              value={card.bgColor}
              onChange={(e) => handleChange('bgColor', e.target.value)}
              className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0"
            />
            <span className="text-xs text-slate-500 font-mono">{card.bgColor}</span>
          </div>
        </div>
        <div
          className="mt-2 h-6 rounded-md border border-slate-600"
          style={{ backgroundColor: card.bgColor }}
        />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">图片URL</label>
        <input
          type="text"
          value={card.imageUrl}
          onChange={(e) => handleChange('imageUrl', e.target.value)}
          placeholder="https://example.com/image.jpg"
          className={`w-full bg-slate-700/50 border rounded-lg px-3 py-2 text-slate-200 text-sm outline-none focus:border-indigo-500 transition-colors ${
            imageUrlError ? 'border-red-500/70' : 'border-slate-600'
          }`}
        />
        {imageUrlError && (
          <div className="flex items-center gap-1 text-red-400 text-xs mt-1">
            <AlertCircle size={10} />
            {imageUrlError}
          </div>
        )}
        {card.imageUrl && isValidUrl(card.imageUrl) && (
          <div className="mt-2 rounded-lg overflow-hidden border border-slate-600" style={{ height: 80 }}>
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `url(${card.imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="w-full h-full flex items-center justify-center bg-black/20">
                <Image size={16} className="text-white/60" />
              </div>
            </div>
          </div>
        )}
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
