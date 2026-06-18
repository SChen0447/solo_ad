import { useState } from 'react';

interface ScoringPanelProps {
  onSubmit: (score: number, comment: string) => Promise<void>;
}

export default function ScoringPanel({ onSubmit }: ScoringPanelProps) {
  const [hoverScore, setHoverScore] = useState(0);
  const [selectedScore, setSelectedScore] = useState(0);
  const [comment, setComment] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (selectedScore === 0 || hasSubmitted || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(selectedScore, comment);
      setHasSubmitted(true);
    } catch (err) {
      console.error('Submit rating failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStar = (index: number) => {
    const isActive = index <= (hoverScore || selectedScore);
    const isLocked = hasSubmitted || isSubmitting;

    return (
      <svg
        key={index}
        width={32}
        height={32}
        viewBox="0 0 24 24"
        fill={isActive ? '#f59e0b' : 'none'}
        stroke={isActive ? '#f59e0b' : '#d1d5db'}
        strokeWidth="2"
        style={{
          cursor: isLocked ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          transform: isActive && !isLocked ? 'scale(1.1)' : 'scale(1)',
          opacity: isSubmitting ? 0.6 : 1
        }}
        onMouseEnter={() => !isLocked && setHoverScore(index)}
        onMouseLeave={() => !isLocked && setHoverScore(0)}
        onClick={() => !isLocked && setSelectedScore(index)}
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    );
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginTop: 20
      }}
    >
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        {hasSubmitted ? '感谢您的评分！' : '为本次分享评分'}
      </h3>

      {!hasSubmitted && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[1, 2, 3, 4, 5].map((i) => renderStar(i))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              评论（可选）
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="分享您的想法和建议..."
              rows={3}
              disabled={isSubmitting}
              style={{
                width: '100%',
                height: 80,
                padding: '10px 12px',
                fontSize: 14,
                border: '1px solid #d1d5db',
                borderRadius: 8,
                outline: 'none',
                transition: 'all 0.2s ease',
                resize: 'none',
                fontFamily: 'inherit',
                opacity: isSubmitting ? 0.6 : 1
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
              }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={selectedScore === 0 || isSubmitting}
            style={{
              padding: '10px 24px',
              backgroundColor: selectedScore === 0 || isSubmitting ? '#9ca3af' : '#3b82f6',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              borderRadius: 8,
              cursor: selectedScore === 0 || isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (selectedScore > 0 && !isSubmitting) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = selectedScore === 0 || isSubmitting ? '#9ca3af' : '#3b82f6';
            }}
            onMouseDown={(e) => {
              if (selectedScore > 0 && !isSubmitting) {
                e.currentTarget.style.backgroundColor = '#1d4ed8';
              }
            }}
            onMouseUp={(e) => {
              if (selectedScore > 0 && !isSubmitting) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
          >
            {isSubmitting ? '提交中...' : '提交评分'}
          </button>
        </>
      )}

      {hasSubmitted && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <svg
                key={i}
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill={i <= selectedScore ? '#f59e0b' : 'none'}
                stroke={i <= selectedScore ? '#f59e0b' : '#d1d5db'}
                strokeWidth="2"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </div>
          <span style={{ color: '#6b7280', fontSize: 14 }}>
            您已给出 {selectedScore} 星评分
          </span>
        </div>
      )}
    </div>
  );
}
