import React from 'react';
import { useWeatherStore } from '../../store/useWeatherStore';
import { WeatherType, WEATHER_CONFIG } from '../../modules/weather/types';

const WeatherPanel: React.FC = () => {
  const { weatherState } = useWeatherStore();
  const config = WEATHER_CONFIG[weatherState.type];

  const getWeatherIcon = (type: WeatherType) => {
    switch (type) {
      case WeatherType.Sunny:
        return (
          <div className="weather-icon sunny">
            <div className="sun"></div>
            <div className="sun-rays"></div>
          </div>
        );
      case WeatherType.Cloudy:
        return (
          <div className="weather-icon cloudy">
            <div className="cloud cloud-1"></div>
            <div className="cloud cloud-2"></div>
          </div>
        );
      case WeatherType.LightRain:
        return (
          <div className="weather-icon rain">
            <div className="cloud"></div>
            <div className="rain-drops">
              <span className="drop drop-1"></span>
              <span className="drop drop-2"></span>
              <span className="drop drop-3"></span>
            </div>
          </div>
        );
      case WeatherType.HeavyRain:
        return (
          <div className="weather-icon heavy-rain">
            <div className="cloud dark"></div>
            <div className="rain-drops heavy">
              <span className="drop drop-1"></span>
              <span className="drop drop-2"></span>
              <span className="drop drop-3"></span>
              <span className="drop drop-4"></span>
              <span className="drop drop-5"></span>
            </div>
          </div>
        );
      case WeatherType.Foggy:
        return (
          <div className="weather-icon foggy">
            <div className="fog fog-1"></div>
            <div className="fog fog-2"></div>
            <div className="fog fog-3"></div>
          </div>
        );
      default:
        return null;
    }
  };

  const minTemp = config.minTemp;
  const maxTemp = config.maxTemp;
  const currentTemp = weatherState.temperature;
  const tempPercent = ((currentTemp - minTemp) / (maxTemp - minTemp)) * 100;

  return (
    <div className="panel weather-panel">
      <h2 className="panel-title">天气</h2>
      <div className="weather-display">
        <div className={`weather-icon-container ${weatherState.isTransitioning ? 'transitioning' : ''}`}>
          {getWeatherIcon(weatherState.type)}
        </div>
        <p className="weather-name">{config.name}</p>
        {weatherState.isTransitioning && weatherState.nextWeather && (
          <p className="weather-next">
            转为: {WEATHER_CONFIG[weatherState.nextWeather].name}
          </p>
        )}
      </div>
      
      <div className="temperature-section">
        <div className="temp-range">
          <span>{minTemp}°C</span>
          <span>{maxTemp}°C</span>
        </div>
        <div className="temp-bar">
          <div className="temp-gradient"></div>
          <div 
            className="temp-indicator" 
            style={{ left: `${Math.max(0, Math.min(100, tempPercent))}%` }}
          ></div>
        </div>
        <p className="current-temp">当前: {currentTemp.toFixed(1)}°C</p>
      </div>

      <div className="weather-duration">
        <p>剩余时间: {Math.floor(weatherState.duration)}秒</p>
        {weatherState.isTransitioning && (
          <div className="transition-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${weatherState.transitionProgress * 100}%` }}
              ></div>
            </div>
            <p>天气变化中...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherPanel;
