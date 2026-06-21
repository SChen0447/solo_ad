import React, { useRef, useState, useCallback, useEffect } from 'react';
import { KeyframePositions } from '../utils/animationEngine';

interface TimelineBarProps {
  keyframes: KeyframePositions;
  onChange: (kf: KeyframePositions) => void;
  width: number;
}

const MARKER_ORDER: (keyof KeyframePositions)[] = ['k0', 'k25', 'k50', 'k100'];
const MARKER_LABELS = ['0%', '25%', '50%', '100%'];

const TimelineBar: React.FC<TimelineBarProps> = ({ keyframes, onChange, width }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [draggingKey, setDraggingKey] = useState<keyof KeyframePositions | null>(null);
  const [hoverKey, setHoverKey] = useState<keyof KeyframePositions | null>(null);

  const height = 50;
  const markerRadius = 8;

  const pctToX = useCallback(
    (pct: number) => (pct / 100) * (width - markerRadius * 2) + markerRadius,
    [width]
  );

  const xToPct = useCallback(
    (x: number) => {
      const clamped = Math.max(markerRadius, Math.min(width - markerRadius, x));
      return ((clamped - markerRadius) / (width - markerRadius * 2)) * 100;
    },
    [width]
  );

  const handlePointerDown = (key: keyof KeyframePositions) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingKey(key);
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!draggingKey || !barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const newPct = xToPct(localX);

      const idx = MARKER_ORDER.indexOf(draggingKey);
      const next: KeyframePositions = { ...keyframes };

      if (idx === 0) {
        next.k0 = Math.min(newPct, next.k25 - 2);
      } else if (idx === MARKER_ORDER.length - 1) {
        next.k100 = Math.max(newPct, next.k50 + 2);
      } else {
        const prevKey = MARKER_ORDER[idx - 1];
        const nextKey = MARKER_ORDER[idx + 1];
        const minPct = keyframes[prevKey] + 2;
        const maxPct = keyframes[nextKey] - 2;
        next[draggingKey] = Math.max(minPct, Math.min(maxPct, newPct));
      }
      onChange(next);
    },
    [draggingKey, keyframes, xToPct, onChange]
  );

  const handlePointerUp = useCallback(() => {
    setDraggingKey(null);
  }, []);

  useEffect(() => {
    if (draggingKey) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [draggingKey, handlePointerMove, handlePointerUp]);

  const style: React.CSSProperties = {
    position: 'relative',
    width,
    height,
    background: '#0f1729',
    borderRadius: '8px',
    marginTop: '12px',
    userSelect: 'none',
    touchAction: 'none',
    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)',
  };

  return (
    <div style={style} ref={barRef}>
      <div
        style={{
          position: 'absolute',
          left: markerRadius,
          right: markerRadius,
          top: height / 2 - 1,
          height: 2,
          background: 'linear-gradient(90deg, #4a4a6a, #6a6a8a)',
          borderRadius: '2px',
        }}
      />
      {MARKER_ORDER.map((key, idx) => {
        const pct = keyframes[key];
        const x = pctToX(pct);
        const isActive = draggingKey === key || hoverKey === key;
        const displayPct = Math.round(pct);
        return (
          <div key={key} style={{ position: 'absolute' }}>
            <div
              onPointerDown={handlePointerDown(key)}
              onPointerEnter={() => setHoverKey(key)}
              onPointerLeave={() => setHoverKey(null)}
              style={{
                position: 'absolute',
                left: x - markerRadius,
                top: height / 2 - markerRadius,
                width: markerRadius * 2,
                height: markerRadius * 2,
                borderRadius: '50%',
                background: isActive ? '#00d2ff' : '#3a7bd5',
                border: '2px solid #ffffff',
                boxShadow: isActive
                  ? '0 0 12px rgba(0,210,255,0.8), 0 4px 10px rgba(0,0,0,0.5)'
                  : '0 2px 8px rgba(0,0,0,0.4)',
                cursor: draggingKey ? (draggingKey === key ? 'grabbing' : 'default') : 'grab',
                transform: isActive ? 'scale(1.25)' : 'scale(1)',
                transition: 'all 0.15s ease',
                zIndex: isActive ? 10 : 1,
              }}
            />
            {(isActive || true) && (
              <div
                style={{
                  position: 'absolute',
                  left: x,
                  top: height / 2 + markerRadius + 4,
                  transform: 'translateX(-50%)',
                  fontSize: '10px',
                  color: isActive ? '#00d2ff' : '#a0a0b0',
                  fontWeight: isActive ? 600 : 400,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  pointerEvents: 'none',
                }}
              >
                {idx === 0 || idx === 3 ? MARKER_LABELS[idx] : `${displayPct}%`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TimelineBar;
