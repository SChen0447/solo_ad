import React, { useState } from 'react';
import type { Emotion } from '../api';

const EMOTIONS: { key: Emotion; label: string; color: string }[] = [
  { key: 'happy', label: '快乐', color: '#facc15' },
  { key: 'sad', label: '悲伤', color: '#6366f1' },
  { key: 'anxious', label: '焦虑', color: '#f97316' },
  { key: 'calm', label: '平静', color: '#34d399' },
  { key: 'excited', label: '兴奋', color: '#f472b6' },
];

interface EmotionPickerProps {
  current: Emotion;
  onChange: (emotion: Emotion) => void;
}

export default function EmotionPicker({ current, onChange }: EmotionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentColor = EMOTIONS.find((e) => e.key === current)?.color || '#94a3b8';

  return (
    <div className="emotion-picker" style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="emotion-dot"
        style={{ background: currentColor }}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title={EMOTIONS.find((e) => e.key === current)?.label}
      />
      {isOpen && (
        <div
          className="emotion-palette"
          onClick={(e) => e.stopPropagation()}
        >
          {EMOTIONS.map((em) => (
            <button
              key={em.key}
              className={`palette-dot ${current === em.key ? 'palette-selected' : ''}`}
              style={{ background: em.color }}
              onClick={() => {
                onChange(em.key);
                setIsOpen(false);
              }}
              title={em.label}
            />
          ))}
        </div>
      )}
      <style>{`
        .emotion-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          transition: transform 0.2s;
          padding: 0;
        }
        .emotion-dot:hover {
          transform: scale(1.3);
        }
        .emotion-palette {
          position: absolute;
          top: 20px;
          left: -8px;
          display: flex;
          gap: 8px;
          padding: 10px 14px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          z-index: 50;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          animation: palette-in 0.2s ease;
        }
        @keyframes palette-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .palette-dot {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform 0.2s, border-color 0.2s;
          padding: 0;
        }
        .palette-dot:hover {
          transform: scale(1.2);
        }
        .palette-selected {
          border-color: #e2e8f0;
          transform: scale(1.15);
        }
      `}</style>
    </div>
  );
}
