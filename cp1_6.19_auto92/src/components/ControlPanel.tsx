import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { weatherManager } from '../modules/weather/weatherManager';
import { playerStateManager } from '../modules/player/playerState';

const ControlPanel: React.FC = () => {
  const { isRunning, gameTime, toggleRunning, skipTime } = useGameStore();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSkipTime = () => {
    const skipSeconds = 60;
    skipTime(skipSeconds);
    
    weatherManager.skipTime(skipSeconds);
    
    const effects = weatherManager.getEffects();
    playerStateManager.setWeatherEffects(effects);
    playerStateManager.setTemperature(weatherManager.getState().temperature);
    
    const steps = 60;
    const stepTime = skipSeconds / steps;
    for (let i = 0; i < steps; i++) {
      playerStateManager.update(stepTime);
    }
  };

  return (
    <div className="control-panel">
      <div className="game-time">
        <span className="time-label">游戏时间</span>
        <span className="time-value">{formatTime(gameTime)}</span>
      </div>

      <div className="control-buttons">
        <button
          className={`control-btn play-pause-btn ${isRunning ? 'running' : 'paused'}`}
          onClick={toggleRunning}
          title={isRunning ? '暂停' : '继续'}
        >
          {isRunning ? (
            <span className="pause-icon">
              <span className="pause-bar"></span>
              <span className="pause-bar"></span>
            </span>
          ) : (
            <span className="play-icon"></span>
          )}
        </button>

        <button
          className="control-btn speed-btn"
          onClick={handleSkipTime}
          title="快进1分钟"
        >
          <span className="speed-icon">»</span>
        </button>
      </div>

      <div className="game-status">
        <span className={`status-indicator ${isRunning ? 'active' : 'inactive'}`}></span>
        <span>{isRunning ? '运行中' : '已暂停'}</span>
      </div>
    </div>
  );
};

export default ControlPanel;
