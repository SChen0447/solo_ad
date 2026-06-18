import React, { useMemo } from 'react';
import { useWeatherStore } from '../../store/useWeatherStore';
import { WeatherType } from '../modules/weather/types';

const GameScene: React.FC = () => {
  const { weatherState } = useWeatherStore();

  const particles = useMemo(() => {
    const count = weatherState.type === WeatherType.HeavyRain ? 80 : 
                  weatherState.type === WeatherType.LightRain ? 40 :
                  weatherState.type === WeatherType.Sunny ? 30 :
                  weatherState.type === WeatherType.Foggy ? 20 : 15;
    
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 0.5 + Math.random() * 1.5,
      size: 2 + Math.random() * 4,
      opacity: 0.3 + Math.random() * 0.7,
    }));
  }, [weatherState.type]);

  const fogLayers = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      id: i,
      top: 10 + i * 20,
      duration: 15 + i * 5,
      opacity: 0.2 + Math.random() * 0.3,
    }));
  }, []);

  const getSceneClass = () => {
    switch (weatherState.type) {
      case WeatherType.Sunny:
        return 'scene-sunny';
      case WeatherType.Cloudy:
        return 'scene-cloudy';
      case WeatherType.LightRain:
        return 'scene-rain';
      case WeatherType.HeavyRain:
        return 'scene-heavy-rain';
      case WeatherType.Foggy:
        return 'scene-foggy';
      default:
        return 'scene-default';
    }
  };

  const renderParticles = () => {
    if (weatherState.type === WeatherType.Sunny) {
      return (
        <div className="particles sunny-particles">
          {particles.map((p) => (
            <div
              key={p.id}
              className="sun-particle"
              style={{
                left: `${p.left}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration + 2}s`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
              }}
            />
          ))}
        </div>
      );
    }

    if (weatherState.type === WeatherType.LightRain || weatherState.type === WeatherType.HeavyRain) {
      return (
        <div className="particles rain-particles">
          {particles.map((p) => (
            <div
              key={p.id}
              className="rain-drop"
              style={{
                left: `${p.left}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration * 0.5}s`,
                height: `${p.size * 3}px`,
                opacity: p.opacity,
              }}
            />
          ))}
        </div>
      );
    }

    if (weatherState.type === WeatherType.Foggy) {
      return (
        <div className="fog-container">
          {fogLayers.map((fog) => (
            <div
              key={fog.id}
              className="fog-layer"
              style={{
                top: `${fog.top}%`,
                animationDuration: `${fog.duration}s`,
                opacity: fog.opacity,
              }}
            />
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`game-scene ${getSceneClass()}`}>
      <div className="scene-background">
        <div className="ground"></div>
        <div className="palm-tree palm-tree-1"></div>
        <div className="palm-tree palm-tree-2"></div>
        <div className="rocks"></div>
      </div>

      <div className="player-character">
        <div className="player-body"></div>
        <div className="player-head"></div>
        <div className="player-arm player-arm-left"></div>
        <div className="player-arm player-arm-right"></div>
        <div className="player-leg player-leg-left"></div>
        <div className="player-leg player-leg-right"></div>
      </div>

      {renderParticles()}

      {weatherState.isTransitioning && (
        <div 
          className="weather-transition-overlay"
          style={{ opacity: weatherState.transitionProgress * 0.3 }}
        />
      )}
    </div>
  );
};

export default GameScene;
