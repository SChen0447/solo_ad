import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EMOTIONS, Emotion } from '../types';

const formatDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const EmotionPicker: React.FC = () => {
  const { todayEmotion, saveEmotion, setCurrentPage } = useApp();
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(
    todayEmotion ? EMOTIONS.find(e => e.type === todayEmotion.emotion) || null : null
  );
  const [showConfirm, setShowConfirm] = useState(false);
  const [rotation, setRotation] = useState(0);

  const handleEmotionClick = (emotion: Emotion) => {
    setSelectedEmotion(emotion);
    const idx = EMOTIONS.findIndex(e => e.type === emotion.type);
    const targetAngle = -(idx * (360 / EMOTIONS.length));
    setRotation(targetAngle);
    setTimeout(() => setShowConfirm(true), 500);
  };

  const handleConfirm = () => {
    if (selectedEmotion) {
      const today = formatDate(new Date());
      saveEmotion({
        date: today,
        emotion: selectedEmotion.type,
        emotionColor: selectedEmotion.color,
      });
      setShowConfirm(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
    if (todayEmotion) {
      setSelectedEmotion(EMOTIONS.find(e => e.type === todayEmotion.emotion) || null);
    } else {
      setSelectedEmotion(null);
      setRotation(0);
    }
  };

  const wheelSize = 300;
  const itemSize = 70;
  const radius = (wheelSize - itemSize) / 2;

  return (
    <div className="emotion-container">
      <h1 className="page-title">记录今日情绪</h1>

      {todayEmotion && (
        <div style={{ padding: '12px 24px', backgroundColor: '#252539', borderRadius: '8px', color: '#A29BFE' }}>
          今日已记录: {EMOTIONS.find(e => e.type === todayEmotion.emotion)?.emoji} {EMOTIONS.find(e => e.type === todayEmotion.emotion)?.label}
        </div>
      )}

      <div
        className="emotion-wheel"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {EMOTIONS.map((emotion, idx) => {
          const angle = (idx / EMOTIONS.length) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * radius + wheelSize / 2 - itemSize / 2;
          const y = Math.sin(angle) * radius + wheelSize / 2 - itemSize / 2;
          const isSelected = selectedEmotion?.type === emotion.type;
          return (
            <div
              key={emotion.type}
              className={`emotion-item ${isSelected ? 'selected' : ''}`}
              style={{
                left: x,
                top: y,
                backgroundColor: isSelected ? emotion.color : '#252539',
                color: emotion.color,
                transform: `rotate(${-rotation}deg)`,
              }}
              onClick={() => handleEmotionClick(emotion)}
            >
              {emotion.emoji}
            </div>
          );
        })}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '48px',
          }}
        >
          {selectedEmotion ? selectedEmotion.emoji : '❓'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {EMOTIONS.map(e => (
          <div
            key={e.type}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#252539',
              borderRadius: '16px',
              fontSize: '13px',
            }}
          >
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: e.color }} />
            {e.label}
          </div>
        ))}
      </div>

      <div className="challenge-actions">
        <button className="action-btn secondary" onClick={() => setCurrentPage('challenge')}>
          ← 返回挑战
        </button>
        <button className="action-btn primary" onClick={() => setCurrentPage('calendar')}>
          查看月度色谱 →
        </button>
      </div>

      {showConfirm && selectedEmotion && (
        <div className="emotion-confirm-modal">
          <div className="confirm-card">
            <div className="confirm-emoji">{selectedEmotion.emoji}</div>
            <div className="confirm-label">{selectedEmotion.label}</div>
            <div
              className="confirm-color-box"
              style={{ backgroundColor: selectedEmotion.color }}
            />
            <div style={{ fontSize: '14px', color: '#8888AA', marginBottom: '24px' }}>
              情绪色: {selectedEmotion.color}
            </div>
            <div className="confirm-actions">
              <button className="action-btn secondary" onClick={handleCancel}>
                重新选择
              </button>
              <button className="action-btn primary" onClick={handleConfirm}>
                确认记录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmotionPicker;
