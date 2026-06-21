import { useState, useEffect } from 'react';
import { SubmitScoreDTO } from '../../../shared/types';

interface ScoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (scores: SubmitScoreDTO) => Promise<void>;
  ideaTitle: string;
}

const DIMENSIONS = [
  { key: 'creativity', label: '创意性', icon: '💡' },
  { key: 'feasibility', label: '可行性', icon: '🔧' },
  { key: 'influence', label: '影响力', icon: '🌟' }
] as const;

type DimensionKey = typeof DIMENSIONS[number]['key'];

function ScoringModal({ isOpen, onClose, onSubmit, ideaTitle }: ScoringModalProps) {
  const [scores, setScores] = useState<Record<DimensionKey, number>>({
    creativity: 5,
    feasibility: 5,
    influence: 5
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setScores({ creativity: 5, feasibility: 5, influence: 5 });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSliderChange = (key: DimensionKey, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(scores);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const avgScore = Math.round(
    ((scores.creativity + scores.feasibility + scores.influence) / 3) * 10
  ) / 10;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`scoring-modal ${isOpen ? 'modal-enter' : 'modal-exit'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">评分打分</h2>
          <button className="modal-close" onClick={onClose} disabled={isSubmitting}>
            ✕
          </button>
        </div>

        <p className="modal-idea-title">{ideaTitle}</p>

        <div className="dimensions-container">
          {DIMENSIONS.map((dim) => (
            <div key={dim.key} className="dimension-item">
              <div className="dimension-header">
                <span className="dimension-icon">{dim.icon}</span>
                <span className="dimension-label">{dim.label}</span>
                <span className="dimension-value">{scores[dim.key]}</span>
              </div>
              <div className="slider-wrapper">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={scores[dim.key]}
                  onChange={(e) => handleSliderChange(dim.key, parseInt(e.target.value, 10))}
                  className="score-slider"
                  disabled={isSubmitting}
                />
                <div className="slider-track" />
                <div
                  className="slider-fill"
                  style={{ width: `${((scores[dim.key] - 1) / 9) * 100}%` }}
                />
                <div
                  className="slider-markers"
                  style={{ left: `${((scores[dim.key] - 1) / 9) * 100}%` }}
                >
                  <div className="slider-thumb" />
                </div>
              </div>
              <div className="slider-labels">
                <span>1</span>
                <span>10</span>
              </div>
            </div>
          ))}
        </div>

        <div className="score-preview">
          <span className="preview-label">综合预览</span>
          <span className="preview-score">{avgScore.toFixed(1)}</span>
        </div>

        <div className="modal-actions">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? '提交中...' : '提交评分'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ScoringModal;
