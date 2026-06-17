import { useState } from 'react';
import type { MoodType } from '../types';

const moods: { type: MoodType; emoji: string; label: string }[] = [
  { type: 'happy', emoji: '😊', label: '开心' },
  { type: 'calm', emoji: '😌', label: '平静' },
  { type: 'sad', emoji: '😢', label: '悲伤' },
  { type: 'angry', emoji: '😠', label: '愤怒' },
  { type: 'excited', emoji: '🤩', label: '兴奋' },
  { type: 'tired', emoji: '😴', label: '疲惫' },
];

interface Props {
  selectedMood: MoodType | null;
  onSelect: (mood: MoodType) => void;
}

export default function MoodSelector({ selectedMood, onSelect }: Props) {
  const [animating, setAnimating] = useState<MoodType | null>(null);

  const handleClick = (type: MoodType) => {
    setAnimating(type);
    onSelect(type);
    setTimeout(() => setAnimating(null), 300);
  };

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '32px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '32px',
          flexWrap: 'wrap',
        }}
      >
        {moods.map((mood) => {
          const isSelected = selectedMood === mood.type;
          const isAnimating = animating === mood.type;
          return (
            <button
              key={mood.type}
              onClick={() => handleClick(mood.type)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                opacity: isSelected ? 1 : 0.5,
                transition: 'all 0.3s ease-out',
                transform: isSelected ? 'scale(1)' : 'scale(1)',
              }}
            >
              <div
                style={{
                  fontSize: isSelected ? '80px' : '64px',
                  width: isSelected ? '80px' : '64px',
                  height: isSelected ? '80px' : '64px',
                  lineHeight: isSelected ? '80px' : '64px',
                  textAlign: 'center',
                  transition: 'all 0.3s ease-out',
                  animation: isAnimating ? 'pulseMood 0.3s ease-out' : undefined,
                }}
              >
                {mood.emoji}
              </div>
              <span
                style={{
                  fontSize: '14px',
                  color: isSelected ? '#A29BFE' : '#e0e0e0',
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'all 0.3s ease-out',
                }}
              >
                {mood.label}
              </span>
            </button>
          );
        })}
      </div>
      <style>{`
        @keyframes pulseMood {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
