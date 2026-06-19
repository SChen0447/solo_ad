import React from 'react';

interface ScoreBoardProps {
  score: number;
  lives: number;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ score, lives }) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    top: 60,
    left: 20,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: "'Courier New', monospace",
    fontSize: '20px',
    textShadow: '0 0 8px rgba(255, 255, 255, 0.5), 0 0 16px rgba(100, 150, 255, 0.3)',
    pointerEvents: 'none',
    zIndex: 10,
    lineHeight: '1.6',
  };

  return (
    <div style={style}>
      <div>SCORE: {score.toString().padStart(6, '0')}</div>
      <div>LIVES: {'♥'.repeat(lives)}{'♡'.repeat(Math.max(0, 3 - lives))}</div>
    </div>
  );
};
