import React, { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';

const PlayerStatusPanel: React.FC = () => {
  const { playerState } = usePlayerStore();
  const [displayHealth, setDisplayHealth] = useState(playerState.health);
  const [displayHunger, setDisplayHunger] = useState(playerState.hunger);
  const animationRef = useRef<number>();
  const lastHealthRef = useRef(playerState.health);
  const lastHungerRef = useRef(playerState.hunger);

  useEffect(() => {
    const targetHealth = playerState.health;
    const targetHunger = playerState.hunger;
    const startHealth = lastHealthRef.current;
    const startHunger = lastHungerRef.current;
    const startTime = performance.now();
    const duration = 300;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      setDisplayHealth(startHealth + (targetHealth - startHealth) * easeProgress);
      setDisplayHunger(startHunger + (targetHunger - startHunger) * easeProgress);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        lastHealthRef.current = targetHealth;
        lastHungerRef.current = targetHunger;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [playerState.health, playerState.hunger]);

  const getHealthColor = (value: number) => {
    if (value > 60) return '#e53935';
    if (value > 30) return '#ff7043';
    return '#b71c1c';
  };

  const getHungerColor = (value: number) => {
    if (value > 60) return '#fb8c00';
    if (value > 30) return '#ffa726';
    return '#e65100';
  };

  return (
    <div className="panel status-panel">
      <h2 className="panel-title">玩家状态</h2>
      
      <div className="status-item">
        <div className="status-header">
          <span className="status-label">健康值</span>
          <span className="status-value" style={{ color: getHealthColor(displayHealth) }}>
            {displayHealth.toFixed(1)}/100
          </span>
        </div>
        <div className="progress-bar-container">
          <div 
            className="progress-bar health-bar" 
            style={{ 
              width: `${displayHealth}%`,
              backgroundColor: getHealthColor(displayHealth),
            }}
          ></div>
        </div>
      </div>

      <div className="status-item">
        <div className="status-header">
          <span className="status-label">饥饿值</span>
          <span className="status-value" style={{ color: getHungerColor(displayHunger) }}>
            {displayHunger.toFixed(1)}/100
          </span>
        </div>
        <div className="progress-bar-container">
          <div 
            className="progress-bar hunger-bar" 
            style={{ 
              width: `${displayHunger}%`,
              backgroundColor: getHungerColor(displayHunger),
            }}
          ></div>
        </div>
      </div>

      <div className="status-item speed-item">
        <span className="status-label">移动速度</span>
        <span className="speed-value">
          {(playerState.speedMultiplier * 100).toFixed(0)}%
        </span>
      </div>

      <div className="status-item temp-item">
        <span className="status-label">体感温度</span>
        <span className="temp-value">
          {playerState.temperature.toFixed(1)}°C
        </span>
      </div>
    </div>
  );
};

export default PlayerStatusPanel;
