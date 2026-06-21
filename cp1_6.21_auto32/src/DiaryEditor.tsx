import { useState, useEffect } from 'react';
import type { Diary, EmotionTag } from './types';
import { EMOTIONS, getEmotionMeta } from './types';

const MAX_CONTENT = 2000;
const MAX_EMOTIONS = 2;

type Props = {
  diary: Diary | null;
  onSave: (content: string, emotions: EmotionTag[]) => void;
};

export default function DiaryEditor({ diary, onSave }: Props) {
  const [content, setContent] = useState('');
  const [selected, setSelected] = useState<Record<string, number>>({});

  useEffect(() => {
    if (diary) {
      setContent(diary.content);
      const s: Record<string, number> = {};
      diary.emotions.forEach((e) => {
        s[e.type] = e.intensity;
      });
      setSelected(s);
    } else {
      setContent('');
      setSelected({});
    }
  }, [diary]);

  const toggleEmotion = (type: string) => {
    setSelected((prev) => {
      if (prev[type] !== undefined) {
        const next = { ...prev };
        delete next[type];
        return next;
      }
      if (Object.keys(prev).length >= MAX_EMOTIONS) {
        alert(`最多选择 ${MAX_EMOTIONS} 个情绪标签`);
        return prev;
      }
      return { ...prev, [type]: 3 };
    });
  };

  const changeIntensity = (type: string, value: number) => {
    setSelected((prev) => {
      if (prev[type] === undefined) return prev;
      return { ...prev, [type]: value };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      alert('请输入日记内容');
      return;
    }
    if (trimmed.length > MAX_CONTENT) {
      alert(`内容不能超过 ${MAX_CONTENT} 字`);
      return;
    }
    const types = Object.keys(selected);
    if (types.length < 1) {
      alert('请至少选择一个情绪标签');
      return;
    }
    const emotions: EmotionTag[] = types.map((t) => ({
      type: t,
      intensity: selected[t],
    }));
    onSave(trimmed, emotions);
  };

  const getSliderBg = (type: string, intensity: number): string => {
    const meta = getEmotionMeta(type);
    if (!meta) return 'linear-gradient(to right, #e5e7eb, #e5e7eb)';
    const ratio = intensity / 5;
    const color = meta.color;
    return `linear-gradient(to right, ${color} 0%, ${color} ${ratio * 100}%, #fde8e8 ${ratio * 100}%, #fde8e8 100%)`;
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <textarea
          className="editor-textarea"
          placeholder="今天发生了什么？记录下你的心情吧..."
          value={content}
          maxLength={MAX_CONTENT}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="char-count">
          {content.length} / {MAX_CONTENT}
        </div>
      </div>

      <div>
        <div style={{
          fontSize: '13px',
          color: '#9f7a7a',
          marginBottom: '10px',
          fontWeight: 500,
        }}>
          选择情绪标签（1-2个，调整强度0-5）
        </div>
        <div className="emotion-grid">
          {EMOTIONS.map((em) => {
            const isSelected = selected[em.type] !== undefined;
            const intensity = selected[em.type] ?? 0;
            return (
              <div
                key={em.type}
                className={`emotion-option ${isSelected ? 'selected' : ''}`}
                style={{
                  background: isSelected ? em.bg : 'rgba(255,255,255,0.6)',
                  borderColor: isSelected ? em.color : 'transparent',
                }}
                onClick={() => toggleEmotion(em.type)}
              >
                <div className="emotion-label">
                  <span className="emotion-emoji">{em.emoji}</span>
                  <span style={{ color: em.color }}>{em.type}</span>
                  {isSelected && (
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: '11px',
                      color: 'white',
                      background: em.color,
                      padding: '2px 6px',
                      borderRadius: '8px',
                    }}>
                      已选
                    </span>
                  )}
                </div>
                {isSelected && (
                  <div
                    className="slider-wrapper"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="range"
                      min={0}
                      max={5}
                      step={1}
                      value={intensity}
                      onChange={(e) => changeIntensity(em.type, parseInt(e.target.value, 10))}
                      className="emotion-slider"
                      style={{ background: getSliderBg(em.type, intensity) }}
                    />
                    <span className="slider-value">{intensity}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setContent('');
            setSelected({});
          }}
        >
          清空
        </button>
        <button type="submit" className="btn btn-primary btn-sm">
          {diary ? '保存修改' : '保存日记'}
        </button>
      </div>
    </form>
  );
}
