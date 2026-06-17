import React from 'react';
import type { MoodType } from '../App';

interface MoodOption {
  type: MoodType;
  emoji: string;
  label: string;
}

const moods: MoodOption[] = [
  { type: 'happy', emoji: '😊', label: '开心' },
  { type: 'calm', emoji: '😌', label: '平静' },
  { type: 'sad', emoji: '😢', label: '悲伤' },
  { type: 'angry', emoji: '😡', label: '愤怒' },
  { type: 'excited', emoji: '🤩', label: '兴奋' },
  { type: 'tired', emoji: '😴', label: '疲惫' },
];

interface MoodSelectorProps {
  selectedMood: MoodType | null;
  onMoodSelect: (mood: MoodType) => void;
}

function MoodSelector({ selectedMood, onMoodSelect }: MoodSelectorProps) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 32,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 40,
      }}
    >
      {moods.map(mood => {
        const isSelected = selectedMood === mood.type;
        return (
          <div
            key={mood.type}
            onClick={() => onMoodSelect(mood.type)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              opacity: isSelected ? 1 : selectedMood ? 0.5 : 1,
              transition: 'all 0.3s ease-out',
              transform: isSelected ? 'scale(1)' : 'scale(1)',
            }}
          >
            <style>{`
              @keyframes pulse {
                0% { transform: scale(1.25); }
                50% { transform: scale(1.35); }
                100% { transform: scale(1.25); }
              }
              .mood-emoji-${mood.type} {
                width: ${isSelected ? 80 : 64}px;
                height: ${isSelected ? 80 : 64}px;
                font-size: ${isSelected ? 48 : 36}px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                background: rgba(255,255,255,0.08);
                transition: all 0.3s ease-out;
                animation: ${isSelected ? `pulse 1.5s ease-out infinite` : 'none'};
                user-select: none;
              }
              .mood-emoji-${mood.type}:hover {
                background: rgba(255,255,255,0.15);
                transform: scale(1.1);
              }
            `}</style>
            <div className={`mood-emoji-${mood.type}`}>
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
  );
}

export default MoodSelector;
