import React, { useState, useEffect } from 'react';
import { WeatherData } from '../types';

interface WeatherCardProps {
  weather: WeatherData | null;
  isLoading: boolean;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ weather, isLoading }) => {
  const [showTemp, setShowTemp] = useState(false);

  useEffect(() => {
    if (weather) {
      setShowTemp(false);
      const timer = setTimeout(() => setShowTemp(true), 50);
      return () => clearTimeout(timer);
    }
  }, [weather]);

  if (isLoading) {
    return (
      <div className="weather-card glass-effect">
        <div className="weather-loading">
          <span className="loading-spinner">☁️</span>
          <p>正在获取天气数据...</p>
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="weather-card glass-effect">
        <div className="weather-placeholder">
          <span className="placeholder-icon">🌍</span>
          <p>搜索城市查看天气</p>
        </div>
      </div>
    );
  }

  return (
    <div className="weather-card glass-effect">
      <div className="weather-header">
        <div>
          <h2 className="weather-city">{weather.city}</h2>
          <p className="weather-desc">{weather.description}</p>
        </div>
        <div className="weather-icon">{weather.weatherIcon}</div>
      </div>

      <div className="weather-temperature">
        <span className={`temp-value ${showTemp ? 'temp-animate' : ''}`}>
          {weather.temperature}°C
        </span>
      </div>

      <div className="weather-details">
        <div className="detail-item">
          <span className="detail-icon">💧</span>
          <div className="detail-info">
            <span className="detail-label">湿度</span>
            <span className="detail-value">{weather.humidity}%</span>
          </div>
        </div>
        <div className="detail-item">
          <span className="detail-icon">💨</span>
          <div className="detail-info">
            <span className="detail-label">风速</span>
            <span className="detail-value">{weather.windSpeed} km/h</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherCard;
