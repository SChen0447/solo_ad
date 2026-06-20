import React, { useState, useEffect, useCallback } from 'react';
import SearchBar from './components/SearchBar';
import WeatherCard from './components/WeatherCard';
import RecommendList from './components/RecommendList';
import MapView from './components/MapView';
import HistoryList from './components/HistoryList';
import { fetchWeather, onWeatherUpdate } from './weather';
import { getRecommendations } from './recommendation';
import { WeatherData, Recommendation, HistoryItem } from './types';

const HISTORY_KEY = 'weather_search_history';
const MAX_HISTORY = 10;

function App() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedDest, setSelectedDest] = useState<Recommendation | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  const saveHistory = useCallback((newHistory: HistoryItem[]) => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    setHistory(newHistory);
  }, []);

  const addToHistory = useCallback(
    (city: string) => {
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        city,
        timestamp: Date.now(),
      };

      const filtered = history.filter((h) => h.city !== city);
      const newHistory = [newItem, ...filtered].slice(0, MAX_HISTORY);
      saveHistory(newHistory);
    },
    [history, saveHistory]
  );

  const deleteHistoryItem = useCallback(
    (id: string) => {
      const newHistory = history.filter((h) => h.id !== id);
      saveHistory(newHistory);
    },
    [history, saveHistory]
  );

  useEffect(() => {
    const unsubscribe = onWeatherUpdate((data) => {
      setWeather(data);
      const recs = getRecommendations(data);
      setRecommendations(recs);
      setSelectedDest(null);
    });
    return unsubscribe;
  }, []);

  const handleSearch = useCallback(
    async (city: string) => {
      if (!city.trim()) return;

      setIsLoading(true);
      try {
        await fetchWeather(city.trim());
        addToHistory(city.trim());
      } catch (error) {
        console.error('Failed to fetch weather:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [addToHistory]
  );

  const handleSelectDestination = useCallback((dest: Recommendation) => {
    setSelectedDest(dest);
  }, []);

  const handleHistorySelect = useCallback(
    (city: string) => {
      handleSearch(city);
    },
    [handleSearch]
  );

  return (
    <div className="app">
      <div className="app-background" />
      
      <div className="app-layout">
        <div className="left-panel">
          <div className="app-header">
            <h1 className="app-title">
              <span className="title-icon">🌤️</span>
              天气旅行推荐
            </h1>
            <p className="app-subtitle">根据天气发现完美目的地</p>
          </div>

          <SearchBar onSearch={handleSearch} isLoading={isLoading} />

          <WeatherCard weather={weather} isLoading={isLoading} />

          <RecommendList
            recommendations={recommendations}
            onSelect={handleSelectDestination}
            selectedId={selectedDest?.id || null}
          />

          <HistoryList
            history={history}
            onSelect={handleHistorySelect}
            onDelete={deleteHistoryItem}
          />
        </div>

        <div className="right-panel">
          <MapView
            recommendations={recommendations}
            selectedDestination={selectedDest}
            onMarkerClick={handleSelectDestination}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
