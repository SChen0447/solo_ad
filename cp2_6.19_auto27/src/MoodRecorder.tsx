import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { MoodType, MoodRecord } from './types';
import { MOOD_CONFIGS } from './types';
import { formatDate } from './utils/storage';

interface MoodRecorderProps {
  onAddRecord: (record: MoodRecord) => void;
  onShowToast: () => void;
}

const MOOD_TYPES: MoodType[] = ['happy', 'calm', 'anxious', 'sad', 'angry'];

export default function MoodRecorder({ onAddRecord, onShowToast }: MoodRecorderProps) {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [description, setDescription] = useState('');

  const handleMoodSelect = useCallback((mood: MoodType) => {
    setSelectedMood(mood);
  }, []);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 50) {
      setDescription(value);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedMood) return;

    const now = new Date();
    const record: MoodRecord = {
      id: uuidv4(),
      mood: selectedMood,
      description: description.trim(),
      timestamp: now.getTime(),
      date: formatDate(now)
    };

    onAddRecord(record);
    onShowToast();
    setSelectedMood(null);
    setDescription('');
  }, [selectedMood, description, onAddRecord, onShowToast]);

  const moodConfigs = useMemo(() => 
    MOOD_TYPES.map((mood) => ({ mood, config: MOOD_CONFIGS[mood] })),
  []);

  return (
    <div className="section">
      <h2 className="section-title">记录今天的心情</h2>
      
      <div className="mood-tags">
        {moodConfigs.map(({ mood, config }) => {
          return (
            <div
              key={mood}
              className={`mood-tag ${selectedMood === mood ? 'selected' : ''}`}
              onClick={() => handleMoodSelect(mood)}
            >
              <span className="mood-emoji">{config.emoji}</span>
              <span className="mood-label">{config.label}</span>
            </div>
          );
        })}
      </div>

      <textarea
        className="description-input"
        placeholder="记录此刻的感受（不超过50字）..."
        value={description}
        onChange={handleDescriptionChange}
        rows={2}
      />
      <div className="char-count">{description.length}/50</div>

      <button
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={!selectedMood}
        style={{ opacity: selectedMood ? 1 : 0.6, cursor: selectedMood ? 'pointer' : 'not-allowed' }}
      >
        记录心情
      </button>
    </div>
  );
}
