import React from 'react';
import { useGameStore } from '../PlayerState';
import { GameEngine } from '../GameEngine';

interface GameOverPanelProps {
  engine: GameEngine | null;
}

export const GameOverPanel: React.FC<GameOverPanelProps> = React.memo(({ engine }) => {
  const phase = useGameStore(s => s.phase);
  const kills = useGameStore(s => s.kills);
  const sunlight = useGameStore(s => s.sunlight);
  const wave = useGameStore(s => s.wave);
  const leaks = useGameStore(s => s.leaks);

  if (phase !== 'gameOver' && phase !== 'victory') return null;

  const isVictory = phase === 'victory';
  const killScore = kills * 100;
  const sunlightScore = sunlight * 10;
  const waveScore = wave * 200;
  const totalScore = killScore + sunlightScore + waveScore;

  const handleRestart = () => {
    if (engine) {
      engine.stop();
      useGameStore.getState().reset();
      engine.start();
    }
  };

  return (
    <div className="game-over-overlay">
      <div className="game-over-panel">
        <h2 className={`game-over-title ${isVictory ? 'victory' : 'defeat'}`}>
          {isVictory ? '🌿 胜利！' : '💀 失败'}
        </h2>
        <div className="score-breakdown">
          <div className="score-row">
            <span>击杀得分</span>
            <span>{kills} × 100 = {killScore}</span>
          </div>
          <div className="score-row">
            <span>剩余阳光</span>
            <span>{sunlight} × 10 = {sunlightScore}</span>
          </div>
          <div className="score-row">
            <span>波次完成度</span>
            <span>{wave} × 200 = {waveScore}</span>
          </div>
          {!isVictory && (
            <div className="score-row leak-info">
              <span>漏敌数</span>
              <span>{leaks}</span>
            </div>
          )}
        </div>
        <div className="total-score">
          总分: <span className="total-number">{totalScore}</span>
        </div>
        <button className="restart-btn" onClick={handleRestart}>
          重新开始
        </button>
      </div>
    </div>
  );
});
GameOverPanel.displayName = 'GameOverPanel';
