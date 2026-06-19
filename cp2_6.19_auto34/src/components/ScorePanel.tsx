import { useState, useEffect } from 'react';
import { ROUND_SIZE } from '../data/words';

interface ScorePanelProps {
  score: number;
  correctCount: number;
  roundProgress: boolean[];
  scoreAnimating: boolean;
}

function ScorePanel({
  score,
  correctCount,
  roundProgress,
  scoreAnimating
}: ScorePanelProps) {
  const [displayScore, setDisplayScore] = useState(score);

  useEffect(() => {
    if (score === displayScore) return;

    const start = displayScore;
    const end = score;
    const duration = 200;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * easeProgress);
      setDisplayScore(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score, displayScore]);

  return (
    <footer
      style={{
        padding: '16px 20px',
        backgroundColor: '#fff',
        borderTop: '1px solid #f0f0f0',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        {Array.from({ length: ROUND_SIZE }).map((_, idx) => (
          <ProgressDot key={idx} filled={roundProgress[idx] || false} index={idx} />
        ))}
      </div>

      <div className="score-info-row">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ fontSize: '16px' }}>⭐</span>
          <span>得分：</span>
          <span
            className={scoreAnimating ? 'score-bounce' : ''}
            style={{
              fontWeight: 'bold',
              color: '#F5A623',
              fontSize: '18px',
              minWidth: '32px',
              display: 'inline-block',
              textAlign: 'left'
            }}
          >
            {displayScore}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ fontSize: '16px' }}>✓</span>
          <span>答对：</span>
          <span
            style={{
              fontWeight: 'bold',
              color: '#4CAF50',
              fontSize: '18px'
            }}
          >
            {correctCount}
          </span>
          <span>/</span>
          <span
            style={{
              color: '#999',
              fontSize: '14px'
            }}
          >
            {ROUND_SIZE}
          </span>
        </div>
      </div>
    </footer>
  );
}

function ProgressDot({ filled, index }: { filled: boolean; index: number }) {
  const [isFilled, setIsFilled] = useState(filled);
  const [animateFill, setAnimateFill] = useState(false);

  useEffect(() => {
    if (filled && !isFilled) {
      const timer = setTimeout(() => {
        setIsFilled(true);
        setAnimateFill(true);
      }, index * 50);
      return () => clearTimeout(timer);
    }
  }, [filled, isFilled, index]);

  return (
    <div
      className={animateFill ? 'dot-fill' : ''}
      style={{
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        border: '2px solid #F5A623',
        backgroundColor: isFilled ? '#F5A623' : 'transparent',
        transition: animateFill ? 'none' : 'background-color 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isFilled ? '0 0 0 3px rgba(245, 166, 35, 0.2)' : 'none'
      }}
    >
      {isFilled && (
        <span
          style={{
            color: '#fff',
            fontSize: '8px',
            fontWeight: 'bold'
          }}
        >
          ⭐
        </span>
      )}
    </div>
  );
}

export default ScorePanel;
