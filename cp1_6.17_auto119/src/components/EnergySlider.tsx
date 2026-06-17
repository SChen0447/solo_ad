import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ENERGY_EMOJIS } from '../types';

interface EnergySliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const EnergySlider: React.FC<EnergySliderProps> = memo(
  ({ value, onChange, disabled = false }) => {
    const [dragging, setDragging] = useState(false);
    const trackRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number | null>(null);

    const emoji = ENERGY_EMOJIS[value] || ENERGY_EMOJIS[5];
    const percent = ((value - 1) / 9) * 100;

    const updateFromX = useCallback(
      (clientX: number) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
        const stepped = Math.round(ratio * 9) + 1;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          onChange(stepped);
        });
      },
      [onChange]
    );

    useEffect(() => {
      if (!dragging) return;
      const onMove = (e: MouseEvent | TouchEvent) => {
        const cx =
          'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        updateFromX(cx);
      };
      const onUp = () => setDragging(false);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onMove, { passive: true });
      window.addEventListener('touchend', onUp);
      return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onUp);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }, [dragging, updateFromX]);

    const onTrackMouseDown = (e: React.MouseEvent) => {
      if (disabled) return;
      setDragging(true);
      updateFromX(e.clientX);
    };

    const onTrackTouchStart = (e: React.TouchEvent) => {
      if (disabled) return;
      setDragging(true);
      updateFromX(e.touches[0].clientX);
    };

    return (
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <span style={styles.label}>能量水平</span>
          <div style={styles.valueBadge}>
            <span style={styles.emojiDisplay}>{emoji}</span>
            <span style={styles.valueText}>{value}/10</span>
          </div>
        </div>

        <div style={styles.emojiScale}>
          <span style={styles.scaleEmoji}>😫</span>
          <span style={styles.scaleLabel}>疲惫</span>
          <div style={{ flex: 1 }} />
          <span style={styles.scaleLabel}>充沛</span>
          <span style={styles.scaleEmoji}>🥳</span>
        </div>

        <div
          ref={trackRef}
          style={{
            ...styles.track,
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          onMouseDown={onTrackMouseDown}
          onTouchStart={onTrackTouchStart}
        >
          <div style={styles.trackBg} />
          <div
            style={{
              ...styles.trackFill,
              width: `${percent}%`,
              background: `linear-gradient(90deg, #5B96D0 0%, #A3F2D0 35%, #FFB347 65%, #FF4FA3 100%)`,
            }}
          />
          <div style={styles.ticks}>
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i + 1}
                style={{
                  ...styles.tick,
                  background: i + 1 <= value ? '#ffffff' : 'rgba(255,255,255,0.5)',
                }}
              />
            ))}
          </div>
          <div
            style={{
              ...styles.thumb,
              left: `calc(${percent}% - 22px)`,
              transform: dragging ? 'scale(1.25)' : 'scale(1)',
              boxShadow: dragging
                ? '0 6px 24px rgba(107,91,138,0.35), 0 0 0 6px rgba(107,91,138,0.12)'
                : '0 4px 14px rgba(107,91,138,0.25), 0 0 0 3px rgba(255,255,255,0.8)',
            }}
          >
            <span style={styles.thumbEmoji}>{emoji}</span>
          </div>
        </div>

        <div style={styles.tickLabels}>
          {[1, 3, 5, 7, 10].map((n) => (
            <span
              key={n}
              style={{
                ...styles.tickLabel,
                color: value >= n ? '#4A3A5C' : '#A99BC0',
                fontWeight: value === n ? 700 : 500,
              }}
            >
              {n}
            </span>
          ))}
        </div>
      </div>
    );
  }
);

EnergySlider.displayName = 'EnergySlider';

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    width: '100%',
    maxWidth: 440,
    padding: '20px 24px',
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(16px)',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.8)',
    boxShadow: '0 8px 28px rgba(74, 58, 92, 0.09)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 15,
    fontWeight: 700,
    color: '#3D2F52',
    letterSpacing: '1.5px',
  },
  valueBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 12px',
    background: 'linear-gradient(135deg, #E8E0F0 0%, #F5F0FA 100%)',
    borderRadius: 999,
    border: '1px solid rgba(107,91,138,0.12)',
  },
  emojiDisplay: { fontSize: 18 },
  valueText: {
    fontSize: 13,
    fontWeight: 700,
    color: '#4A3A5C',
    letterSpacing: '1px',
  },
  emojiScale: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: '#8A7DA3',
  },
  scaleEmoji: { fontSize: 14, opacity: 0.75 },
  scaleLabel: { fontWeight: 600 },
  track: {
    position: 'relative',
    width: '100%',
    height: 38,
    display: 'flex',
    alignItems: 'center',
    touchAction: 'none',
    userSelect: 'none',
  },
  trackBg: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(232, 224, 240, 0.9)',
    borderRadius: 999,
    boxShadow: 'inset 0 2px 6px rgba(107,91,138,0.18)',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    transition: 'width 0.12s ease-out',
    opacity: 0.9,
  },
  ticks: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '0 16px',
    pointerEvents: 'none',
  },
  tick: {
    width: 3,
    height: 14,
    borderRadius: 2,
    transition: 'background 0.15s',
  },
  thumb: {
    position: 'absolute',
    top: '50%',
    width: 44,
    height: 44,
    marginTop: -22,
    borderRadius: '50%',
    background: 'linear-gradient(145deg, #ffffff, #f3edfa)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition:
      'left 0.12s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.18s, box-shadow 0.18s',
    zIndex: 2,
  },
  thumbEmoji: { fontSize: 22 },
  tickLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0 4px',
    fontSize: 11,
    marginTop: -4,
  },
  tickLabel: {
    minWidth: 18,
    textAlign: 'center',
    transition: 'color 0.15s, font-weight 0.15s',
  },
};

export default EnergySlider;
