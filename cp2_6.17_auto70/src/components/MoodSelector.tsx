import React, { useState } from 'react';
import type { MoodType } from '../App';

interface MoodOption {
  type: MoodType;
  emoji: string;
  label: string;
  keywords: string;
}

const moods: MoodOption[] = [
  { type: 'happy', emoji: '😊', label: '开心', keywords: '欢快、流行' },
  { type: 'calm', emoji: '😌', label: '平静', keywords: '轻音乐、氛围' },
  { type: 'sad', emoji: '😢', label: '悲伤', keywords: '慢歌、抒情' },
  { type: 'angry', emoji: '😡', label: '愤怒', keywords: '摇滚、说唱' },
  { type: 'excited', emoji: '🤩', label: '兴奋', keywords: '电子、舞曲' },
  { type: 'tired', emoji: '😴', label: '疲惫', keywords: '舒缓、助眠' },
];

interface MoodSelectorProps {
  selectedMood: MoodType | null;
  onMoodSelect: (mood: MoodType) => void;
}

function MoodSelector({ selectedMood, onMoodSelect }: MoodSelectorProps) {
  const [hoveredMood, setHoveredMood] = useState<MoodType | null>(null);

  return (
    <>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1.25); }
          50% { transform: scale(1.35); }
          100% { transform: scale(1.25); }
        }
        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .mood-emoji-base {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          user-select: none;
        }
        .mood-tooltip {
          position: absolute;
          top: -36px;
          left: 50%;
          transform: translateX(-50%);
          background: #ffffff;
          color: #1a1a2e;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          pointer-events: none;
          animation: tooltipFadeIn 0.2s ease both;
          z-index: 10;
        }
        .mood-tooltip::after {
          content: '';
          position: absolute;
          bottom: -5px;
          left: 50%;
          transform: translateX(-50%);
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 5px solid #ffffff;
        }
      `}</style>
      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 16,
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 40,
            flexWrap: 'wrap',
          }}
        >
          {moods.map(mood => {
            const isSelected = selectedMood === mood.type;
            const isHovered = hoveredMood === mood.type;
            const dimmed = selectedMood !== null && !isSelected;
            const size = isSelected ? 80 : isHovered && !isSelected ? 70 : 64;
            const fontSize = isSelected ? 48 : isHovered && !isSelected ? 40 : 36;
            const showTooltip = isHovered && !isSelected;

            return (
              <div
                key={mood.type}
                onClick={() => onMoodSelect(mood.type)}
                onMouseEnter={() => setHoveredMood(mood.type)}
                onMouseLeave={() => setHoveredMood(null)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  opacity: dimmed ? 0.5 : 1,
                  transition: 'opacity 0.3s ease-out',
                  position: 'relative',
                }}
              >
                {showTooltip && (
                  <div className="mood-tooltip">
                    {mood.keywords}
                  </div>
                )}
                <div
                  className="mood-emoji-base"
                  style={{
                    width: size,
                    height: size,
                    fontSize,
                    background: isHovered && !isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
                    transition: 'all 0.2s ease',
                    animation: isSelected ? 'pulse 1.5s ease-out infinite' : 'none',
                  }}
                >
                  {mood.emoji}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    color: isSelected ? '#e0e0e0' : '#999',
                    fontWeight: isSelected ? 600 : 400,
                    transition: 'all 0.3s',
                  }}
                >
                  {mood.label}
                </span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontSize: 13,
            color: '#888',
            textAlign: 'center',
            letterSpacing: 0.5,
          }}
        >
          选择你此刻的心情
        </div>
      </div>
    </>
  );
}

export default MoodSelector;
