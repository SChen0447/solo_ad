import React, { useEffect, useRef } from 'react';
import WeatherPanel from './components/WeatherPanel';
import GameScene from './components/GameScene';
import PlayerStatusPanel from './components/PlayerStatusPanel';
import InventoryPanel from './components/InventoryPanel';
import ControlPanel from './components/ControlPanel';
import { useWeatherStore } from './store/useWeatherStore';
import { usePlayerStore } from './store/usePlayerStore';
import { useInventoryStore } from './store/useInventoryStore';
import { useGameStore } from './store/useGameStore';
import { weatherManager } from './modules/weather/weatherManager';
import { playerStateManager } from './modules/player/playerState';

const App: React.FC = () => {
  const initWeatherStore = useWeatherStore((state) => state.init);
  const initPlayerStore = usePlayerStore((state) => state.init);
  const initInventoryStore = useInventoryStore((state) => state.init);
  const isRunning = useGameStore((state) => state.isRunning);
  const incrementGameTime = useGameStore((state) => state.incrementGameTime);

  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();
  
  const TICK_RATE = 1000 / 30;

  useEffect(() => {
    initWeatherStore();
    initPlayerStore();
    initInventoryStore();

    const effects = weatherManager.getEffects();
    playerStateManager.setWeatherEffects(effects);
    playerStateManager.setTemperature(weatherManager.getState().temperature);
  }, [initWeatherStore, initPlayerStore, initInventoryStore]);

  useEffect(() => {
    if (!isRunning) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    lastTimeRef.current = performance.now();

    const gameLoop = (currentTime: number) => {
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      accumulatorRef.current += deltaTime;

      while (accumulatorRef.current >= TICK_RATE) {
        const tickSeconds = TICK_RATE / 1000;
        
        weatherManager.update(tickSeconds);
        
        const effects = weatherManager.getEffects();
        playerStateManager.setWeatherEffects(effects);
        playerStateManager.setTemperature(weatherManager.getState().temperature);
        playerStateManager.update(tickSeconds);
        
        incrementGameTime(tickSeconds);
        
        accumulatorRef.current -= TICK_RATE;
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, incrementGameTime]);

  return (
    <div className="app-container">
      <div className="game-layout">
        <div className="left-panel">
          <WeatherPanel />
        </div>
        
        <div className="center-panel">
          <GameScene />
          <ControlPanel />
        </div>
        
        <div className="right-panel">
          <PlayerStatusPanel />
          <InventoryPanel />
        </div>
      </div>
    </div>
  );
};

export default App;
