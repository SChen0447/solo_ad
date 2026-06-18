import React from 'react';
import { useGameStore } from '../state/gameStore';

interface HeroProps {
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export const Hero: React.FC<HeroProps> = ({ bounds }) => {
  const { hero } = useGameStore();
  const { x, y, charging, chargeTime, cooldown, skillWaves } = hero;

  const maxCharge = 3;
  const cooldownMax = 5;
  const skillRadius = 80;

  const chargePct = Math.min(chargeTime / maxCharge, 1);
  const cooldownPct = cooldown > 0 ? Math.min(cooldown / cooldownMax, 1) : 0;

  const bodyHeight = 24;
  const headRadius = 8;

  return (
    <g>
      {skillWaves.map((wave) => (
        <circle
          key={wave.id}
          cx={wave.x}
          cy={wave.y}
          r={wave.radius}
          fill="none"
          stroke="#3498db"
          strokeWidth={3}
          className="skill-wave"
          opacity={0.8}
          pointerEvents="none"
        />
      ))}

      {charging && (
        <g pointerEvents="none">
          <circle
            cx={x}
            cy={y}
            r={skillRadius + chargePct * 40}
            fill="none"
            stroke="url(#chargeGradient)"
            strokeWidth={4}
            className="charge-ring"
            strokeDasharray={`${chargePct * Math.PI * 2 * (skillRadius + chargePct * 40)} 9999`}
            opacity={0.8}
          />
          <circle
            cx={x}
            cy={y}
            r={skillRadius + chargePct * 40}
            fill="none"
            stroke="#9b59b6"
            strokeWidth={1}
            strokeDasharray="6 6"
            opacity={0.4 + chargePct * 0.4}
          />
        </g>
      )}

      <defs>
        <linearGradient id="chargeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00ffff" />
          <stop offset="50%" stopColor="#8e44ad" />
          <stop offset="100%" stopColor="#ff00ff" />
        </linearGradient>
      </defs>

      <g pointerEvents="none">
        <rect
          x={x - 8}
          y={y - headRadius - 2}
          width={16}
          height={bodyHeight}
          rx={4}
          fill="#e67e22"
          stroke="#d35400"
          strokeWidth={1.5}
        />

        <circle
          cx={x}
          cy={y - headRadius - 10}
          r={headRadius}
          fill="#f39c12"
          stroke="#d35400"
          strokeWidth={1.5}
        />

        <circle cx={x - 3} cy={y - headRadius - 11} r={1.5} fill="#2c3e50" />
        <circle cx={x + 3} cy={y - headRadius - 11} r={1.5} fill="#2c3e50" />

        <rect
          x={x - 14}
          y={y + bodyHeight - 2}
          width={28}
          height={5}
          rx={2}
          fill="#1a252f"
          opacity={0.9}
        />
        <rect
          x={x - 13}
          y={y + bodyHeight - 1}
          width={26 * (1 - cooldownPct)}
          height={3}
          rx={1.5}
          fill={cooldown > 0 ? '#7f8c8d' : '#27ae60'}
        />
      </g>

      {charging && (
        <g pointerEvents="none">
          <rect
            x={x - 18}
            y={y + bodyHeight + 4}
            width={36}
            height={6}
            rx={3}
            fill="#1a252f"
            stroke="#3498db"
            strokeWidth={1}
          />
          <rect
            x={x - 17}
            y={y + bodyHeight + 5}
            width={34 * chargePct}
            height={4}
            rx={2}
            fill="url(#chargeGradient)"
          />
        </g>
      )}
    </g>
  );
};
