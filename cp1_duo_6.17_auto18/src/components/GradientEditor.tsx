import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { ColorStop } from '../types';
import { generateGradientString, generateId, clamp } from '../utils/gradientUtils';
import ColorPicker from './ColorPicker';

interface GradientEditorProps {
  stops: ColorStop[];
  angle: number;
  onChange: (stops: ColorStop[], angle: number) => void;
}

const GradientEditor: React.FC<GradientEditorProps> = ({ stops, angle, onChange }) => {
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
  const [draggingStop, setDraggingStop] = useState<string | null>(null);
  const [draggingAngle, setDraggingAngle] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const dialRef = useRef<HTMLDivElement>(null);
  const stopRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const sortedStops = [...stops].sort((a, b) => a.position - b.position);
  const gradientStr = generateGradientString(stops, angle);

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (stops.length >= 8) return;
      if (draggingStop) return;

      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;

      const position = ((e.clientX - rect.left) / rect.width) * 100;
      const clampedPosition = clamp(position, 0, 100);

      const newStop: ColorStop = {
        id: generateId(),
        color: '#ffffff',
        position: Math.round(clampedPosition),
      };

      onChange([...stops, newStop], angle);
      setActiveStopId(newStop.id);
    },
    [stops, angle, onChange, draggingStop]
  );

  const handleStopMouseDown = useCallback(
    (e: React.MouseEvent, stopId: string) => {
      e.stopPropagation();
      setDraggingStop(stopId);
      setActiveStopId(stopId);
    },
    []
  );

  useEffect(() => {
    if (!draggingStop) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;

      const position = ((e.clientX - rect.left) / rect.width) * 100;
      const clampedPosition = clamp(position, 0, 100);

      const newStops = stops.map((stop) =>
        stop.id === draggingStop ? { ...stop, position: Math.round(clampedPosition) } : stop
      );
      onChange(newStops, angle);
    };

    const handleMouseUp = () => {
      setDraggingStop(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingStop, stops, angle, onChange]);

  const handleStopClick = useCallback(
    (e: React.MouseEvent, stop: ColorStop) => {
      e.stopPropagation();
      if (draggingStop) return;

      const stopEl = stopRefs.current.get(stop.id);
      if (stopEl) {
        const rect = stopEl.getBoundingClientRect();
        setPickerPosition({
          x: rect.left,
          y: rect.bottom + 8,
        });
      }
      setActiveStopId(stop.id);
      setShowColorPicker(true);
    },
    [draggingStop]
  );

  const handleColorChange = useCallback(
    (color: string) => {
      if (!activeStopId) return;
      const newStops = stops.map((stop) =>
        stop.id === activeStopId ? { ...stop, color } : stop
      );
      onChange(newStops, angle);
    },
    [activeStopId, stops, angle, onChange]
  );

  const handleDeleteStop = useCallback(
    (e: React.MouseEvent, stopId: string) => {
      e.stopPropagation();
      if (stops.length <= 2) return;
      const newStops = stops.filter((stop) => stop.id !== stopId);
      onChange(newStops, angle);
      if (activeStopId === stopId) {
        setActiveStopId(null);
        setShowColorPicker(false);
      }
    },
    [stops, angle, onChange, activeStopId]
  );

  const handleAngleDialMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingAngle(true);
  }, []);

  useEffect(() => {
    if (!draggingAngle) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dial = dialRef.current;
      if (!dial) return;

      const rect = dial.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      let newAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI) + 90;
      if (newAngle < 0) newAngle += 360;

      onChange(stops, Math.round(newAngle));
    };

    const handleMouseUp = () => {
      setDraggingAngle(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingAngle, stops, onChange]);

  const handleAngleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value) || 0;
      const clamped = clamp(value, 0, 360);
      onChange(stops, clamped);
    },
    [stops, onChange]
  );

  const activeStop = stops.find((s) => s.id === activeStopId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '10px' }}>
          渐变轨道
          <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>
            点击添加色标 · 最多8个
          </span>
        </div>

        <div
          ref={trackRef}
          onClick={handleTrackClick}
          style={{
            position: 'relative',
            height: '24px',
            background: gradientStr,
            borderRadius: '12px',
            cursor: stops.length >= 8 ? 'not-allowed' : 'pointer',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'visible',
          }}
        >
          {sortedStops.map((stop) => (
            <div
              key={stop.id}
              ref={(el) => {
                if (el) stopRefs.current.set(stop.id, el);
              }}
              onMouseDown={(e) => handleStopMouseDown(e, stop.id)}
              onClick={(e) => handleStopClick(e, stop)}
              style={{
                position: 'absolute',
                left: `${stop.position}%`,
                top: '50%',
                transform: `translateX(-50%) translateY(-50%) ${
                  activeStopId === stop.id ? 'scale(1.2)' : 'scale(1)'
                }`,
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: stop.color,
                border: activeStopId === stop.id ? '3px solid #1890ff' : '2px solid #fff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                cursor: 'grab',
                transition: draggingStop === stop.id ? 'none' : 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                zIndex: activeStopId === stop.id ? 10 : 1,
              }}
              title={`${stop.color} - ${stop.position}%`}
            >
              {stops.length > 2 && (
                <button
                  onClick={(e) => handleDeleteStop(e, stop.id)}
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: '#ff4d4f',
                    color: '#fff',
                    border: 'none',
                    fontSize: '10px',
                    lineHeight: '14px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.opacity = '0';
                  }}
                >
                  ×
                </button>
              )}
              {draggingStop === stop.id && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#333',
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {stop.position}%
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '10px' }}>
            色标列表
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              maxHeight: '150px',
              overflowY: 'auto',
            }}
          >
            {sortedStops.map((stop) => (
              <div
                key={stop.id}
                onClick={(e) => handleStopClick(e, stop)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '6px 10px',
                  background: activeStopId === stop.id ? '#e6f7ff' : '#fafafa',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.3s ease',
                  border: activeStopId === stop.id ? '1px solid #1890ff' : '1px solid transparent',
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    background: stop.color,
                    border: '1px solid #e8e8e8',
                  }}
                />
                <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#555', flex: 1 }}>
                  {stop.color}
                </span>
                <span style={{ fontSize: '12px', color: '#999' }}>{stop.position}%</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>角度</div>
          <div
            ref={dialRef}
            onMouseDown={handleAngleDialMouseDown}
            style={{
              position: 'relative',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: `conic-gradient(from ${angle - 90}deg, #1890ff, #1890ff 10%, #f0f0f0 10%, #f0f0f0)`,
              border: '2px solid #e0e0e0',
              cursor: 'grab',
              userSelect: 'none',
              transition: draggingAngle ? 'none' : 'background 0.3s ease',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '4px',
                height: '45px',
                background: '#1890ff',
                borderRadius: '2px',
                transformOrigin: 'center top',
                transform: `translateX(-50%) rotate(${angle}deg)`,
                transition: draggingAngle ? 'none' : 'transform 0.3s ease',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#fff',
                border: '2px solid #1890ff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '-28px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '14px',
                fontWeight: 600,
                color: '#333',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {angle}°
            </div>
          </div>
          <input
            type="number"
            min="0"
            max="360"
            value={angle}
            onChange={handleAngleInput}
            style={{
              width: '70px',
              padding: '6px 8px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              fontSize: '13px',
              textAlign: 'center',
              marginTop: '24px',
              outline: 'none',
              transition: 'border-color 0.3s ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#1890ff')}
            onBlur={(e) => (e.target.style.borderColor = '#d9d9d9')}
          />
        </div>
      </div>

      {showColorPicker && activeStop && (
        <div
          style={{
            position: 'fixed',
            left: pickerPosition.x,
            top: pickerPosition.y,
            zIndex: 1000,
          }}
        >
          <ColorPicker
            color={activeStop.color}
            onChange={handleColorChange}
            onClose={() => setShowColorPicker(false)}
          />
        </div>
      )}
    </div>
  );
};

export default GradientEditor;
