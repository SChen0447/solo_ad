import React, { useState, useEffect, useCallback } from 'react';
import { OperationType, usePlantStore } from './store';

interface ButtonConfig {
  type: OperationType;
  label: string;
  bgColor: string;
}

const BUTTONS: ButtonConfig[] = [
  { type: 'water', label: '浇水', bgColor: '#2196F3' },
  { type: 'light', label: '光照', bgColor: '#FF9800' },
  { type: 'fertilizer', label: '施肥', bgColor: '#4CAF50' },
];

const WaterIcon: React.FC = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
);

const SunIcon: React.FC = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const FertilizerIcon: React.FC = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <circle cx="12" cy="12" r="3" fill="white" />
  </svg>
);

const ICONS: Record<OperationType, React.FC> = {
  water: WaterIcon,
  light: SunIcon,
  fertilizer: FertilizerIcon,
};

interface ActionButtonProps {
  config: ButtonConfig;
}

const ActionButton: React.FC<ActionButtonProps> = ({ config }) => {
  const { type, label, bgColor } = config;
  const performOperation = usePlantStore((s) => s.performOperation);
  const isOnCooldown = usePlantStore((s) => s.isOnCooldown);
  const getCooldownProgress = usePlantStore((s) => s.getCooldownProgress);
  const isUpgrading = usePlantStore((s) => s.isUpgrading);

  const [progress, setProgress] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  const cooldown = isOnCooldown(type);
  const disabled = cooldown || isUpgrading;

  useEffect(() => {
    let animationId: number;
    const tick = () => {
      const p = getCooldownProgress(type);
      setProgress(p);
      if (p < 1) {
        animationId = requestAnimationFrame(tick);
      }
    };
    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, [getCooldownProgress, type, cooldown]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    setIsAnimating(true);
    setPulseKey((k) => k + 1);
    performOperation(type);
    setTimeout(() => setIsAnimating(false), 200);
  }, [disabled, performOperation, type]);

  const Icon = ICONS[type];
  const size = 60;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label={label}
      className={isAnimating ? 'btn-pulse' : ''}
      key={pulseKey}
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '12px',
        border: 'none',
        background: bgColor,
        color: 'white',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: cooldown ? 0.5 : 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        transition: 'opacity 0.2s ease, box-shadow 0.2s ease',
        padding: 0,
      }}
    >
      <Icon />
      <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>
        {label}
      </span>
      {cooldown && (
        <svg
          width={size}
          height={size}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: 'rotate(-90deg)',
            pointerEvents: 'none',
          }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="white"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: 'stroke-dashoffset 0.1s linear',
            }}
          />
        </svg>
      )}
    </button>
  );
};

const ControlPanel: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        gap: '24px',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px',
      }}
      className="control-panel"
    >
      {BUTTONS.map((b) => (
        <ActionButton key={b.type} config={b} />
      ))}

      <style>{`
        @media (max-width: 480px) {
          .control-panel {
            flex-direction: column !important;
            gap: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ControlPanel;
