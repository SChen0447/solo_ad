import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { SensorData, FilterState, SensorType, TimeRange } from '../types';

interface DataContextType {
  data: SensorData[];
  filter: FilterState;
  hoveredTimestamp: number | null;
  setFilter: (filter: FilterState) => void;
  setHoveredTimestamp: (timestamp: number | null) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<SensorData[]>([]);
  const [filter, setFilter] = useState<FilterState>({
    sensors: ['temperature', 'humidity', 'light', 'windSpeed'],
    timeRange: '1m',
  });
  const [hoveredTimestamp, setHoveredTimestamp] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:8080/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'data') {
        setData((prevData) => {
          const newData = [...prevData, message.data];
          const maxPoints = getMaxPoints(filter.timeRange);
          if (newData.length > maxPoints) {
            return newData.slice(-maxPoints);
          }
          return newData;
        });
      } else if (message.type === 'history') {
        setData(message.data);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const getMaxPoints = (range: TimeRange): number => {
    switch (range) {
      case '1m':
        return 120;
      case '5m':
        return 600;
      case '15m':
        return 1800;
      default:
        return 60;
    }
  };

  const updateFilter = useCallback((newFilter: FilterState) => {
    setFilter(newFilter);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: 'rangeChange', range: newFilter.timeRange })
      );
    }
  }, []);

  return (
    <DataContext.Provider
      value={{
        data,
        filter,
        hoveredTimestamp,
        setFilter: updateFilter,
        setHoveredTimestamp,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
