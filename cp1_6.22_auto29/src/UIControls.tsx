import { ChangeEvent, useState } from 'react';
import {
  ColorMap,
  Annotation,
  HoveredBubbleInfo,
  EventType,
  EVENT_TYPE_LABELS,
} from './types';
import { getMonthLabel } from './utils/geoUtils';

interface Props {
  colorMap: ColorMap;
  timeRange: number;
  annotations: Annotation[];
  hoveredBubble: HoveredBubbleInfo | null;
  onTimeChange: (month: number) => void;
  onColorChange: (eventType: keyof ColorMap, color: string) => void;
  onAddAnnotation: (text: string) => void;
  onReset: () => void;
}

const eventTypes: EventType[] = ['protest', 'festival', 'disaster', 'economy', 'traffic'];

export default function UIControls({
  colorMap,
  timeRange,
  hoveredBubble,
  onTimeChange,
  onColorChange,
  onAddAnnotation,
  onReset,
}: Props) {
  const [annotationText, setAnnotationText] = useState('');

  const handleTimeInput = (e: ChangeEvent<HTMLInputElement>) => {
    onTimeChange(parseInt(e.target.value, 10));
  };

  const handleColorInput = (eventType: EventType) => (e: ChangeEvent<HTMLInputElement>) => {
    onColorChange(eventType, e.target.value);
  };

  const handleSubmitAnnotation = () => {
    if (annotationText.trim()) {
      onAddAnnotation(annotationText.trim());
      setAnnotationText('');
    }
  };

  return (
    <>
      <div
        className="legend-panel"
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '12px',
          padding: '16px',
          color: '#ffffff',
          backdropFilter: 'blur(10px)',
          zIndex: 100,
          minWidth: '220px',
        }}
      >
        <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 600, letterSpacing: '0.5px' }}>
          事件类型图例
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {eventTypes.map((type) => (
            <div
              key={type}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                position: 'relative',
              }}
            >
              <label
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: colorMap[type],
                  cursor: 'pointer',
                  boxShadow: `0 0 8px ${colorMap[type]}`,
                  flexShrink: 0,
                }}
              >
                <input
                  type="color"
                  value={colorMap[type]}
                  onChange={handleColorInput(type)}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: 0,
                    height: 0,
                    pointerEvents: 'none',
                  }}
                />
              </label>
              <span style={{ fontSize: '14px', opacity: 0.9 }}>{EVENT_TYPE_LABELS[type]}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 500 }}>添加标注</h4>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={annotationText}
              onChange={(e) => setAnnotationText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmitAnnotation();
              }}
              placeholder={hoveredBubble ? '输入标注内容...' : '先悬停气泡后标注'}
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.05)',
                color: '#ffffff',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSubmitAnnotation}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: 'none',
                background: hoveredBubble ? '#6c5ce7' : 'rgba(255,255,255,0.1)',
                color: '#ffffff',
                cursor: hoveredBubble ? 'pointer' : 'not-allowed',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'background 0.15s ease',
              }}
            >
              添加
            </button>
          </div>
        </div>

        <button
          onClick={onReset}
          style={{
            marginTop: '14px',
            width: '100%',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.05)',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'background 0.15s ease',
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
          }}
        >
          一键重置
        </button>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(70%, 600px)',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '12px',
          padding: '14px 20px 18px',
          backdropFilter: 'blur(10px)',
          zIndex: 100,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: '#ffffff',
            fontSize: '13px',
            marginBottom: '8px',
            opacity: 0.85,
          }}
        >
          <span>时间轴</span>
          <span style={{ fontWeight: 600 }}>{getMonthLabel(timeRange)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="11"
          step="1"
          value={timeRange}
          onChange={handleTimeInput}
          style={{
            width: '100%',
            height: '6px',
            appearance: 'none',
            WebkitAppearance: 'none',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '3px',
            outline: 'none',
            cursor: 'pointer',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '6px',
            fontSize: '11px',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          {['1月', '3月', '5月', '7月', '9月', '11月'].map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          transition: transform 0.1s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          transition: transform 0.1s ease;
        }
        @media (max-width: 768px) {
          .legend-panel {
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: auto !important;
            min-width: auto !important;
            border-radius: 0 0 12px 12px !important;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 12px;
          }
          .legend-panel > div:first-of-type {
            display: flex;
            flex-direction: row !important;
            flex-wrap: wrap;
            gap: 12px !important;
          }
        }
      `}</style>
    </>
  );
}
