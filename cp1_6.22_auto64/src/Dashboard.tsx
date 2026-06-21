import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useData } from './context/DataContext';
import { SensorType, LayoutItem } from './types';
import TemperatureChart from './components/TemperatureChart';
import HumidityGauge from './components/HumidityGauge';
import LightMeter from './components/LightMeter';
import WindSpeedRadar from './components/WindSpeedRadar';
import FilterPanel from './components/FilterPanel';

const STORAGE_KEY = 'dashboard_layout';

const defaultLayout: LayoutItem[] = [
  { id: 'temperature', x: 0, y: 0, w: 1, h: 1 },
  { id: 'humidity', x: 1, y: 0, w: 1, h: 1 },
  { id: 'light', x: 0, y: 1, w: 1, h: 1 },
  { id: 'windSpeed', x: 1, y: 1, w: 1, h: 1 },
];

const componentMap: Record<SensorType, React.FC<{ data: any[] }>> = {
  temperature: TemperatureChart,
  humidity: HumidityGauge,
  light: LightMeter,
  windSpeed: WindSpeedRadar,
};

const sensorNames: Record<SensorType, string> = {
  temperature: '温度',
  humidity: '湿度',
  light: '光照强度',
  windSpeed: '风速',
};

const Dashboard: React.FC = () => {
  const { data, filter } = useData();
  const [layout, setLayout] = useState<LayoutItem[]>(defaultLayout);
  const [draggedItem, setDraggedItem] = useState<SensorType | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [visibleSensors, setVisibleSensors] = useState<Set<SensorType>>(
    new Set(filter.sensors)
  );
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragItemRef = useRef<HTMLDivElement>(null);
  const snapLines = useRef<{ x: number[]; y: number[] }>({ x: [], y: [] });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLayout(parsed);
      } catch (e) {
        console.error('Failed to parse saved layout');
      }
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setVisibleSensors(new Set(filter.sensors));
    }, 10);
    return () => clearTimeout(timeout);
  }, [filter.sensors]);

  const saveLayout = useCallback((newLayout: LayoutItem[]) => {
    setLayout(newLayout);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
  }, []);

  const visibleLayout = useMemo(() => {
    return layout.filter((item) => filter.sensors.includes(item.id));
  }, [layout, filter.sensors]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, id: SensorType) => {
    e.preventDefault();
    setDraggedItem(id);
    setIsDragging(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setDragPosition({ x: clientX, y: clientY });

    const otherItems = visibleLayout.filter((item) => item.id !== id);
    snapLines.current = {
      x: otherItems.flatMap((item) => [item.x, item.x + item.w]),
      y: otherItems.flatMap((item) => [item.y, item.y + item.h]),
    };
  };

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!draggedItem || !isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      setDragPosition({ x: clientX, y: clientY });
    },
    [draggedItem, isDragging]
  );

  const handleDragEnd = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!draggedItem || !isDragging || !containerRef.current) {
        setIsDragging(false);
        setDraggedItem(null);
        return;
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
      const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;

      const relX = (clientX - containerRect.left) / containerRect.width;
      const relY = (clientY - containerRect.top) / (containerRect.height || 400);

      const cols = isMobile ? 1 : 2;
      const newX = Math.max(0, Math.min(cols - 1, Math.floor(relX * cols)));
      const rows = Math.ceil(visibleLayout.length / cols);
      const newY = Math.max(0, Math.min(rows - 1, Math.floor(relY * rows)));

      const draggedLayoutItem = layout.find((l) => l.id === draggedItem);
      if (!draggedLayoutItem) {
        setIsDragging(false);
        setDraggedItem(null);
        return;
      }

      const targetItem = visibleLayout.find((item) => {
        return item.x === newX && item.y === newY && item.id !== draggedItem;
      });

      if (targetItem) {
        const newLayout = layout.map((item) => {
          if (item.id === draggedItem) {
            return { ...item, x: targetItem.x, y: targetItem.y };
          }
          if (item.id === targetItem.id) {
            return { ...item, x: draggedLayoutItem.x, y: draggedLayoutItem.y };
          }
          return item;
        });
        saveLayout(newLayout);
      }

      setIsDragging(false);
      setDraggedItem(null);
    },
    [draggedItem, isDragging, visibleLayout, layout, isMobile, saveLayout]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  const getItemStyle = (item: LayoutItem, index: number): React.CSSProperties => {
    const cols = isMobile ? 1 : 2;
    const gap = 16;
    const cardHeight = isMobile ? 300 : 'calc(50vh - 50px)';

    if (draggedItem === item.id) {
      return {
        position: 'fixed',
        left: dragPosition.x - 100,
        top: dragPosition.y - 75,
        width: 200,
        height: 150,
        zIndex: 1000,
        opacity: 0.6,
        pointerEvents: 'none',
        cursor: 'grabbing',
      };
    }

    const isVisible = visibleSensors.has(item.id);

    return {
      position: 'relative' as const,
      gridColumn: `${item.x + 1} / span ${item.w}`,
      gridRow: `${item.y + 1} / span ${item.h}`,
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'scale(1)' : 'scale(0.95)',
      transition: 'opacity 0.2s ease, transform 0.2s ease',
      pointerEvents: isVisible ? 'auto' : 'none',
      height: '100%',
      minHeight: isMobile ? 300 : 'auto',
    };
  };

  const gridStyle: React.CSSProperties = isMobile
    ? {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }
    : {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridAutoRows: 'minmax(280px, 1fr)',
        gap: '16px',
        height: 'calc(100vh - 160px)',
        minHeight: '560px',
      };

  const handleChartMouseEnter = () => {};

  const renderDraggedItem = () => {
    if (!draggedItem || !isDragging) return null;

    const Component = componentMap[draggedItem];

    return (
      <div
        ref={dragItemRef}
        style={{
          position: 'fixed',
          left: dragPosition.x - 150,
          top: dragPosition.y - 100,
          width: 300,
          height: 200,
          zIndex: 1000,
          opacity: 0.6,
          pointerEvents: 'none',
          cursor: 'grabbing',
          transform: 'scale(0.8)',
          transformOrigin: 'center center',
        }}
      >
        <div
          style={{
            backgroundColor: '#2d3748',
            borderRadius: '8px',
            border: '2px solid #3182ce',
            padding: '12px',
            height: '100%',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#63b3ed',
              marginBottom: '8px',
            }}
          >
            {sensorNames[draggedItem]}
          </div>
          <div style={{ color: '#a0aec0', fontSize: '12px' }}>拖拽中...</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#e2e8f0',
          marginBottom: '16px',
          textAlign: 'center',
        }}
      >
        IoT 传感器数据仪表板
      </h1>

      <FilterPanel />

      <div ref={containerRef} style={gridStyle}>
        {visibleLayout.map((item, index) => {
          const Component = componentMap[item.id];
          const isVisible = visibleSensors.has(item.id);

          if (!isVisible && !filter.sensors.includes(item.id)) {
            return null;
          }

          return (
            <div
              key={item.id}
              style={getItemStyle(item, index)}
              onMouseDown={(e) => handleDragStart(e, item.id)}
              onTouchStart={(e) => handleDragStart(e, item.id)}
            >
              <div
                style={{
                  height: '100%',
                  cursor: isDragging && draggedItem === item.id ? 'grabbing' : 'grab',
                }}
              >
                <Component data={data} />
              </div>
            </div>
          );
        })}
      </div>

      {renderDraggedItem()}
    </div>
  );
};

export default Dashboard;
