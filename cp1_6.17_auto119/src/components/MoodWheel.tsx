import React, { memo, useMemo, useState } from 'react';
import type { MoodType, MoodConfig } from '../types';
import { MOOD_CONFIGS } from '../types';

interface MoodWheelProps {
  onMoodSelect: (mood: MoodType) => void;
  selectedMood?: MoodType | null;
}

const SIZE = 340;
const CENTER = SIZE / 2;
const OUTER_R = 155;
const INNER_R = 52;
const SEGMENT_COUNT = 8;
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;
const START_OFFSET = -90 - SEGMENT_ANGLE / 2;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number
): string {
  const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, endAngle);
  const p3 = polarToCartesian(cx, cy, rInner, endAngle);
  const p4 = polarToCartesian(cx, cy, rInner, startAngle);
  const largeOuter = endAngle - startAngle > 180 ? 1 : 0;
  const largeInner = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeOuter} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 ${largeInner} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
}

interface SegmentProps {
  config: MoodConfig;
  index: number;
  isSelected: boolean;
  onHover: (v: boolean) => void;
  onClick: () => void;
}

const Segment: React.FC<SegmentProps> = memo(
  ({ config, index, isSelected, onHover, onClick }) => {
    const start = START_OFFSET + index * SEGMENT_ANGLE + 0.8;
    const end = START_OFFSET + (index + 1) * SEGMENT_ANGLE - 0.8;
    const midAngle = START_OFFSET + (index + 0.5) * SEGMENT_ANGLE;

    const emojiPos = polarToCartesian(CENTER, CENTER, (OUTER_R + INNER_R) / 2 + 6, midAngle + 90);
    const namePos = polarToCartesian(CENTER, CENTER, OUTER_R + 18, midAngle + 90);

    const gradId = `mood-grad-${config.key}`;

    return (
      <g
        className="mood-segment-group"
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onClick={onClick}
        style={{
          cursor: 'pointer',
          transformOrigin: `${CENTER}px ${CENTER}px`,
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.25s',
          transform: isSelected ? 'scale(1.06)' : 'scale(1)',
          filter: isSelected
            ? `drop-shadow(0 0 14px ${config.solidColor})`
            : 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))',
        }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={config.gradientFrom} />
            <stop offset="100%" stopColor={config.gradientTo} />
          </linearGradient>
        </defs>
        <path
          d={describeArc(CENTER, CENTER, OUTER_R, INNER_R, start, end)}
          fill={`url(#${gradId})`}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={1.5}
          strokeLinejoin="round"
          opacity={isSelected ? 1 : 0.92}
        />
        <text
          x={emojiPos.x}
          y={emojiPos.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={24}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {config.emoji}
        </text>
        <text
          x={namePos.x}
          y={namePos.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={13}
          fontWeight={600}
          fill={isSelected ? config.solidColor : '#5A4B75'}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            transition: 'fill 0.2s, font-size 0.2s',
            letterSpacing: '1px',
          }}
        >
          {config.name}
        </text>
      </g>
    );
  }
);
Segment.displayName = 'Segment';

const MoodWheel: React.FC<MoodWheelProps> = memo(({ onMoodSelect, selectedMood }) => {
  const [, setHoverIdx] = useState<number | null>(null);

  const centerConfig = useMemo(() => {
    if (!selectedMood) return null;
    return MOOD_CONFIGS.find((c) => c.key === selectedMood);
  }, [selectedMood]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.labelBar}>
        <span style={styles.labelTitle}>今日心情</span>
        <span style={styles.labelSub}>点击选择最贴合的情绪</span>
      </div>

      <div style={styles.wheelContainer}>
        <div style={styles.glowRing} />
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width="100%"
          height="100%"
          style={styles.svg}
        >
          <circle
            cx={CENTER}
            cy={CENTER}
            r={OUTER_R + 6}
            fill="rgba(255,255,255,0.6)"
            style={{ backdropFilter: 'blur(8px)' }}
          />
          {MOOD_CONFIGS.map((cfg, idx) => (
            <Segment
              key={cfg.key}
              config={cfg}
              index={idx}
              isSelected={selectedMood === cfg.key}
              onHover={(v) => setHoverIdx(v ? idx : null)}
              onClick={() => onMoodSelect(cfg.key)}
            />
          ))}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={INNER_R - 4}
            fill={centerConfig ? centerConfig.solidColor : '#ffffff'}
            style={{
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: centerConfig
                ? `inset 0 0 16px ${centerConfig.gradientTo}`
                : 'inset 0 0 12px rgba(107,91,138,0.12)',
            }}
          />
          <text
            x={CENTER}
            y={CENTER - 4}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={centerConfig ? 32 : 20}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {centerConfig ? centerConfig.emoji : '✨'}
          </text>
          <text
            x={CENTER}
            y={CENTER + 22}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={12}
            fontWeight={600}
            fill={centerConfig ? '#ffffff' : '#6B5B8A'}
            style={{ pointerEvents: 'none', userSelect: 'none', letterSpacing: '1.5px' }}
          >
            {centerConfig ? centerConfig.name.toUpperCase() : 'MOOD'}
          </text>
        </svg>
      </div>
    </div>
  );
});

MoodWheel.displayName = 'MoodWheel';

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    maxWidth: 440,
  },
  labelBar: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  labelTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#3D2F52',
    letterSpacing: '2px',
  },
  labelSub: {
    fontSize: 13,
    color: '#7A6B94',
  },
  wheelContainer: {
    position: 'relative',
    width: SIZE,
    height: SIZE,
    maxWidth: '100%',
    aspectRatio: '1 / 1',
  },
  glowRing: {
    position: 'absolute',
    inset: -12,
    borderRadius: '50%',
    background:
      'radial-gradient(circle, rgba(107,91,138,0.12) 0%, rgba(107,91,138,0) 70%)',
    animation: 'pulseGlow 3s ease-in-out infinite',
    pointerEvents: 'none',
  },
  svg: {
    position: 'relative',
    zIndex: 1,
    display: 'block',
  },
};

export default MoodWheel;
