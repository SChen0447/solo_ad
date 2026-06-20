import React, { useState } from 'react';
import { feedbackApi, type CreateFeedbackData, type Feedback } from '../utils/api';

interface FeedbackFormProps {
  onSubmitSuccess: (feedback: Feedback) => void;
}

const emotionOptions = [
  { value: 'positive' as const, label: '积极', color: '#10b981' },
  { value: 'neutral' as const, label: '中性', color: '#f59e0b' },
  { value: 'negative' as const, label: '消极', color: '#ef4444' },
];

const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSubmitSuccess }) => {
  const [content, setContent] = useState('');
  const [emotion, setEmotion] = useState<'positive' | 'neutral' | 'negative'>('neutral');
  const [name, setName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (content.trim().length < 10) {
      setError('反馈内容至少需要10个字');
      return;
    }

    setIsLoading(true);

    try {
      const data: CreateFeedbackData = {
        content: content.trim(),
        emotion,
        is_anonymous: isAnonymous,
        name: isAnonymous ? undefined : name.trim(),
      };

      const response = await feedbackApi.createFeedback(data);
      
      if (response.success) {
        onSubmitSuccess(response.data);
        setContent('');
        setEmotion('neutral');
        setName('');
      }
    } catch (err: any) {
      setError(err.message || '提交失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="feedback-form-container">
      <h2 className="form-title">提交反馈</h2>
      <form onSubmit={handleSubmit} className="feedback-form">
        <div className="form-row anonymous-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="toggle-input"
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">匿名提交</span>
          </label>
        </div>

        {!isAnonymous && (
          <div className="form-group">
            <label htmlFor="name">姓名</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入您的姓名"
              className="form-input"
              maxLength={20}
            />
          </div>
        )}

        <div className="form-group">
          <label>情感标签</label>
          <div className="emotion-options">
            {emotionOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`emotion-btn ${emotion === option.value ? 'active' : ''}`}
                style={{
                  '--emotion-color': option.color,
                } as React.CSSProperties}
                onClick={() => setEmotion(option.value)}
              >
                <span className="emotion-dot"></span>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="content">反馈内容</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="请输入您的反馈意见（至少10个字）..."
            className="form-textarea"
            rows={4}
            maxLength={500}
          />
          <div className="char-count">
            {content.length}/500
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <button type="submit" className="submit-btn" disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="loading-spinner"></span>
              提交中...
            </>
          ) : (
            '提交反馈'
          )}
        </button>
      </form>
    </div>
  );
};

export default FeedbackForm;
