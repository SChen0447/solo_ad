import React, { useState, useCallback } from 'react';
import Timeline from './renderer/Timeline';
import EventCard from './renderer/EventCard';
import ZoomControls from './uiInteraction/ZoomControls';
import SearchBar from './uiInteraction/SearchBar';
import { HistoricalEvent } from './dataManager/types';
import { getEventById } from './dataManager/mockData';
import './styles/App.css';

const App: React.FC = () => {
  const [zoom, setZoom] = useState(0.1);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<HistoricalEvent | null>(null);
  const [focusEventId, setFocusEventId] = useState<string | null>(null);

  const handleEventClick = useCallback((event: HistoricalEvent) => {
    setSelectedEvent(event);
  }, []);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchFilter(value);
  }, []);

  const handleSelectEvent = useCallback((eventId: string) => {
    setFocusEventId(eventId);
    const event = getEventById(eventId);
    if (event) {
      setSelectedEvent(event);
    }
  }, []);

  const handleFocused = useCallback(() => {
    setFocusEventId(null);
  }, []);

  const handleCloseCard = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  const handleNavigateToEvent = useCallback((eventId: string) => {
    const event = getEventById(eventId);
    if (event) {
      setFocusEventId(eventId);
      setSelectedEvent(event);
    }
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-icon">📜</span>
          历史叙事时间轴
        </h1>
        <p className="app-subtitle">穿越时空，探索中华文明五千年的波澜壮阔</p>
      </header>

      <div className="controls-section">
        <div className="search-section">
          <SearchBar
            searchFilter={searchFilter}
            onSearchChange={handleSearchChange}
            onSelectEvent={handleSelectEvent}
          />
        </div>
        <div className="zoom-section">
          <ZoomControls
            zoom={zoom}
            onZoomChange={handleZoomChange}
          />
        </div>
      </div>

      <main className="timeline-section">
        <Timeline
          zoom={zoom}
          searchFilter={searchFilter}
          onEventClick={handleEventClick}
          onZoomChange={handleZoomChange}
          focusEventId={focusEventId}
          onFocused={handleFocused}
        />
      </main>

      <EventCard
        event={selectedEvent}
        onClose={handleCloseCard}
        onNavigateToEvent={handleNavigateToEvent}
      />

      <footer className="app-footer">
        <p>💡 提示：拖动时间轴左右平移 | 滚轮或使用缩放按钮调整视角 | 点击金色节点查看详情</p>
      </footer>
    </div>
  );
};

export default App;
