import React, { useMemo } from 'react';

interface DateSliderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export const DateSlider: React.FC<DateSliderProps> = ({ selectedDate, onDateChange }) => {
  const startOfYear = useMemo(() => new Date(selectedDate.getFullYear(), 0, 1), [selectedDate.getFullYear()]);
  const endOfYear = useMemo(() => new Date(selectedDate.getFullYear(), 11, 31), [selectedDate.getFullYear()]);

  const totalDays = Math.floor((endOfYear.getTime() - startOfYear.getTime()) / 86400000);
  const currentDay = Math.floor((selectedDate.getTime() - startOfYear.getTime()) / 86400000);

  const dayToLabel = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;

  const seasonMarkers = [
    { day: 79, label: '春分', color: '#ff9ec4' },
    { day: 171, label: '夏至', color: '#ffd66b' },
    { day: 265, label: '秋分', color: '#8cc8ff' },
    { day: 355, label: '冬至', color: '#e8e8f0' },
  ];

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      padding: '28px 24px 18px',
      background: 'linear-gradient(180deg, rgba(11,14,42,0.92) 0%, rgba(26,32,64,0.88) 100%)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      zIndex: 5,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        maxWidth: 900,
        margin: '0 auto',
      }}>
        <div style={{
          fontFamily: '"Cinzel", "Noto Serif SC", serif',
          fontSize: 14,
          fontWeight: 600,
          color: '#fff',
          whiteSpace: 'nowrap',
          minWidth: 90,
          letterSpacing: 1,
        }}>
          <div style={{ fontSize: 10, opacity: 0.5, fontWeight: 400, letterSpacing: 2, marginBottom: 2 }}>DATE</div>
          <div>{dayToLabel(selectedDate)}</div>
        </div>

        <div style={{ flex: 1, position: 'relative', paddingTop: 20, paddingBottom: 4 }}>
          <svg width="100%" height="18" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} preserveAspectRatio="none" viewBox="0 0 100 18">
            <defs>
              <linearGradient id="sliderGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6bb3ff" stopOpacity="0.4" />
                <stop offset="25%" stopColor="#ff9ec4" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#ffd66b" stopOpacity="0.6" />
                <stop offset="75%" stopColor="#8cc8ff" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#e8e8f0" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            <rect x="0" y="8" width="100" height="3" rx="1.5" fill="url(#sliderGradient)" />
          </svg>

          {seasonMarkers.map((m) => (
            <div
              key={m.label}
              title={m.label}
              style={{
                position: 'absolute',
                left: `${(m.day / totalDays) * 100}%`,
                top: 16,
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <div style={{
                width: 2,
                height: 10,
                background: m.color,
                opacity: 0.6,
              }} />
              <div style={{
                fontFamily: '"Noto Serif SC", serif',
                fontSize: 10,
                color: m.color,
                marginTop: 2,
                opacity: 0.8,
                whiteSpace: 'nowrap',
              }}>{m.label}</div>
            </div>
          ))}

          <input
            type="range"
            min={0}
            max={totalDays}
            value={currentDay}
            onChange={(e) => {
              const day = parseInt(e.target.value, 10);
              const newDate = new Date(startOfYear.getTime() + day * 86400000);
              onDateChange(newDate);
            }}
            style={{
              width: '100%',
              height: 20,
              appearance: 'none',
              WebkitAppearance: 'none',
              background: 'transparent',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 2,
            }}
          />
          <style>{`
            input[type="range"]::-webkit-slider-runnable-track {
              height: 3px;
              background: transparent;
              border-radius: 2px;
            }
            input[type="range"]::-moz-range-track {
              height: 3px;
              background: transparent;
              border-radius: 2px;
            }
            input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 18px;
              height: 18px;
              margin-top: -8px;
              border-radius: 50%;
              background: radial-gradient(circle, #fff 20%, #c8d8ff 60%, rgba(200,216,255,0.2) 100%);
              box-shadow: 0 0 14px rgba(200, 216, 255, 0.9), 0 2px 6px rgba(0,0,0,0.4);
              cursor: grab;
              transition: transform 0.15s;
            }
            input[type="range"]::-webkit-slider-thumb:active {
              transform: scale(1.18);
              cursor: grabbing;
            }
            input[type="range"]::-moz-range-thumb {
              width: 18px;
              height: 18px;
              border: none;
              border-radius: 50%;
              background: radial-gradient(circle, #fff 20%, #c8d8ff 60%, rgba(200,216,255,0.2) 100%);
              box-shadow: 0 0 14px rgba(200, 216, 255, 0.9), 0 2px 6px rgba(0,0,0,0.4);
              cursor: grab;
            }
          `}</style>
        </div>

        <div style={{
          fontFamily: '"Cinzel", serif',
          fontSize: 12,
          color: 'rgba(255,255,255,0.55)',
          whiteSpace: 'nowrap',
          letterSpacing: 1,
        }}>
          {selectedDate.getFullYear()}
        </div>
      </div>
    </div>
  );
};
