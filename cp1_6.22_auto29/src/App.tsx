import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import mockData from './mockData.json';
import BubbleScene from './BubbleScene';
import UIControls from './UIControls';
import {
  CityEvent,
  ColorMap,
  Annotation,
  HoveredBubbleInfo,
  DEFAULT_COLORS,
} from './types';
import { latLngToVector3 } from './utils/geoUtils';

const dataWithPositions: CityEvent[] = mockData.map((item) => ({
  ...item,
  id: item.id || uuidv4(),
})) as CityEvent[];

export default function App() {
  const [timeRange, setTimeRange] = useState<number>(0);
  const [colorMap, setColorMap] = useState<ColorMap>(DEFAULT_COLORS);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [hoveredBubble, setHoveredBubble] = useState<HoveredBubbleInfo | null>(null);
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  const handleTimeChange = useCallback((month: number) => {
    setTimeRange(month);
  }, []);

  const handleColorChange = useCallback((eventType: keyof ColorMap, color: string) => {
    setColorMap((prev) => ({ ...prev, [eventType]: color }));
  }, []);

  const handleAddAnnotation = useCallback(
    (text: string) => {
      if (!hoveredBubble) {
        alert('请先将鼠标悬停在一个气泡上再添加标注');
        return;
      }
      const evt = hoveredBubble.event;
      const pos = latLngToVector3(evt.latitude, evt.longitude);
      const newAnnotation: Annotation = {
        id: uuidv4(),
        text,
        cityEventId: evt.id,
        position: pos,
      };
      setAnnotations((prev) => [...prev, newAnnotation]);
    },
    [hoveredBubble]
  );

  const handleReset = useCallback(() => {
    setTimeRange(0);
    setAnnotations([]);
    setColorMap(DEFAULT_COLORS);
    setHoveredBubble(null);
    setResetTrigger((prev) => prev + 1);
  }, []);

  const handleBubbleHover = useCallback((info: HoveredBubbleInfo | null) => {
    setHoveredBubble(info);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0a0a1a' }}>
      <BubbleScene
        data={dataWithPositions}
        timeRange={timeRange}
        colorMap={colorMap}
        annotations={annotations}
        onBubbleHover={handleBubbleHover}
        resetTrigger={resetTrigger}
      />
      <UIControls
        colorMap={colorMap}
        timeRange={timeRange}
        annotations={annotations}
        hoveredBubble={hoveredBubble}
        onTimeChange={handleTimeChange}
        onColorChange={handleColorChange}
        onAddAnnotation={handleAddAnnotation}
        onReset={handleReset}
      />
      {hoveredBubble && (
        <div
          style={{
            position: 'fixed',
            left: hoveredBubble.screenPosition.x + 10,
            top: hoveredBubble.screenPosition.y + 10,
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#ffffff',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'none',
            zIndex: 1000,
            minWidth: '180px',
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '6px', color: colorMap[hoveredBubble.event.eventType] }}>
            {hoveredBubble.event.cityName}
          </div>
          <div style={{ marginBottom: '4px', opacity: 0.9 }}>
            事件类型：{hoveredBubble.event.eventType}
          </div>
          <div style={{ marginBottom: '4px', opacity: 0.9 }}>
            事件数量：{hoveredBubble.event.eventCount}
          </div>
          <div style={{ opacity: 0.9 }}>
            事件名称：{hoveredBubble.event.eventName}
          </div>
        </div>
      )}
    </div>
  );
}
