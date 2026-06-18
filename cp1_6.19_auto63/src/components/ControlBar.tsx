import React, { memo, useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  WATER_COOLDOWN,
  WATER_AMOUNT,
  MUTATION_LIFETIME,
  MAX_STEM_HEIGHT,
  MIN_STEM_HEIGHT,
} from '../store/types';

const ease = 'cubic-bezier(0.4, 0, 0.2, 1)';

interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  glowColor: string;
  icon: string;
}

const ProgressBar: React.FC<ProgressBarProps> = memo(({ label, value, max, color, glowColor, icon }) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 130 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#a5c7e8', letterSpacing: 0.5 }}>
          <span style={{ marginRight: 4 }}>{icon}</span>{label}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#fff',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {Math.round(value)}<span style={{ color: '#5a7ea0', fontWeight: 400 }}>/{max}</span>
        </span>
      </div>
      <div
        style={{
          height: 8,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: 4,
            boxShadow: `0 0 8px ${glowColor}`,
            transition: `width 0.35s ${ease}`,
          }}
        />
      </div>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';

interface StatItemProps { label: string; value: string | number; highlight?: string }

const StatItem: React.FC<StatItemProps> = memo(({ label, value, highlight }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 8,
      background: highlight ? `${highlight}15` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${highlight || 'rgba(255,255,255,0.08)'}25`,
    }}
  >
    <span style={{ fontSize: 11, color: '#9fb9d4', whiteSpace: 'nowrap' }}>{label}</span>
    <span
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: highlight || '#ffffff',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      }}
    >
      {value}
    </span>
  </div>
));

StatItem.displayName = 'StatItem';

const ControlBar: React.FC = () => {
  const energy = useGameStore(s => s.energy);
  const maxEnergy = useGameStore(s => s.maxEnergy);
  const water = useGameStore(s => s.water);
  const waterCooldownUntil = useGameStore(s => s.waterCooldownUntil);
  const plants = useGameStore(s => s.plants);
  const waterPlant = useGameStore(s => s.waterPlant);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 120);
    return () => window.clearInterval(t);
  }, []);

  const plant = plants[0];
  const cooldownRemaining = Math.max(0, waterCooldownUntil - now);
  const cooldownPct = cooldownRemaining > 0 ? 1 - cooldownRemaining / WATER_COOLDOWN : 1;
  const onWater = () => {
    if (cooldownRemaining > 0) return;
    waterPlant();
  };

  const heightPct = Math.round(((plant.stemHeight - MIN_STEM_HEIGHT) / (MAX_STEM_HEIGHT - MIN_STEM_HEIGHT)) * 100);
  const mutationRemaining = plant.isMutating
    ? `${Math.max(0, Math.ceil((plant.mutationEndsAt - now) / 1000))}s`
    : '—';

  return (
    <div
      style={{
        height: 60,
        background: '#1a1a2e',
        borderTop: '1px solid rgba(0, 255, 204, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 18px',
        gap: 16,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexShrink: 0 }}>
        <ProgressBar
          label="能量"
          value={energy}
          max={maxEnergy}
          icon="✦"
          color="linear-gradient(90deg, #00ff88, #00d4aa)"
          glowColor="rgba(0,255,150,0.6)"
        />
        <ProgressBar
          label="水分"
          value={water}
          max={100}
          icon="💧"
          color="linear-gradient(90deg, #4fc3f7, #29b6f6)"
          glowColor="rgba(79,195,247,0.6)"
        />

        <button
          onClick={onWater}
          disabled={cooldownRemaining > 0}
          style={{
            position: 'relative',
            padding: '8px 18px',
            borderRadius: 10,
            border: cooldownRemaining > 0
              ? '1px solid rgba(120, 150, 180, 0.3)'
              : '1px solid #4fc3f7',
            background: cooldownRemaining > 0
              ? 'rgba(120, 150, 180, 0.08)'
              : 'linear-gradient(180deg, rgba(79,195,247,0.25), rgba(41,182,246,0.12))',
            color: cooldownRemaining > 0 ? '#7b95b2' : '#b3e5fc',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.5,
            cursor: cooldownRemaining > 0 ? 'not-allowed' : 'pointer',
            transition: `all 0.2s ${ease}`,
            boxShadow: cooldownRemaining > 0 ? 'none' : '0 0 12px rgba(79,195,247,0.3)',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {cooldownRemaining > 0 && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${cooldownPct * 100}%`,
                background: 'rgba(79,195,247,0.1)',
                transition: 'width 0.1s linear',
              }}
            />
          )}
          <span style={{ position: 'relative', zIndex: 1 }}>
            💧 浇水 +{WATER_AMOUNT}
            {cooldownRemaining > 0 && (
              <span style={{ marginLeft: 6, opacity: 0.8 }}>
                ({Math.ceil(cooldownRemaining / 1000)}s)
              </span>
            )}
          </span>
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          padding: '6px 12px',
          borderRadius: 12,
          background: 'rgba(0,0,0,0.45)',
          border: '1px solid rgba(0,255,204,0.12)',
          backdropFilter: 'blur(6px)',
          flexShrink: 0,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <StatItem label="高度" value={`${plant.stemHeight}px (${heightPct}%)`} highlight="#4caf50" />
        <StatItem label="叶片" value={plant.leaves.length} highlight="#66bb6a" />
        <StatItem label="花朵" value={plant.flowers.length} highlight="#ff4081" />
        <StatItem
          label="变异"
          value={mutationRemaining}
          highlight={plant.isMutating ? '#e040fb' : undefined}
        />
      </div>
    </div>
  );
};

export default memo(ControlBar);
