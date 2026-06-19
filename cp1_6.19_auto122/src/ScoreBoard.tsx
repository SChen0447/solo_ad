import React, { useState, useEffect, useRef } from 'react';

interface ScoreBoardProps {
  score: number;
  combo: number;
  bestScore: number;
  timeLeft: number;
  totalTime: number;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ score, combo, bestScore, timeLeft, totalTime }) => {
  const [displayScore, setDisplayScore] = useState(score);
  const prevScoreRef = useRef(score);

  useEffect(() => {
    const startScore = prevScoreRef.current;
    const endScore = score;
    const duration = 500;
    const startTime = performance.now();

    if (startScore === endScore) return;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startScore + (endScore - startScore) * easeProgress);
      setDisplayScore(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    prevScoreRef.current = score;
  }, [score]);

  const percentage = (timeLeft / totalTime) * 100;
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getTimeColor = () => {
    const ratio = timeLeft / totalTime;
    if (ratio > 0.5) return '#2ecc71';
    if (ratio > 0.25) return '#f1c40f';
    return '#e74c3c';
  };

  return (
    <div className="score-board">
      <div className="score-item">
        <span className="score-label">当前得分</span>
        <span className="score-value">{displayScore}</span>
      </div>
      <div className="score-item">
        <span className="score-label">连击</span>
        <span className={`score-value combo ${combo > 0 ? 'active' : ''}`}>
          {combo > 0 ? `x${combo}` : '-'}
        </span>
      </div>
      <div className="score-item">
        <span className="score-label">最佳记录</span>
        <span className="score-value best">{bestScore}</span>
      </div>
      <div className="timer-container">
        <svg width="70" height="70" className="timer-svg">
          <circle
            cx="35"
            cy="35"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="6"
          />
          <circle
            cx="35"
            cy="35"
            r={radius}
            fill="none"
            stroke={getTimeColor()}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 35 35)"
            style={{ transition: 'stroke 0.3s ease' }}
          />
          <text
            x="35"
            y="35"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={getTimeColor()}
            fontSize="16"
            fontWeight="bold"
          >
            {Math.ceil(timeLeft / 1000)}
          </text>
        </svg>
        <span className="timer-label">剩余时间</span>
      </div>
    </div>
  );
};

export default ScoreBoard;
