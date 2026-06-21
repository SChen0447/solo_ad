import React, { memo } from 'react';
import type { WavePatternProps } from '@/types';

function buildPath(
  data: number[],
  width: number,
  height: number,
  midY: number
): string {
  if (data.length < 2) return '';
  const n = data.length;
  const stepX = width / (n - 1);
  const amp = height * 0.35;

  let d = `M 0 ${midY - data[0] * amp}`;

  for (let i = 1; i < n; i++) {
    const x1 = (i - 0.5) * stepX;
    const y1 = midY - data[i - 1] * amp;
    const x2 = (i - 0.5) * stepX;
    const y2 = midY - data[i] * amp;
    const x = i * stepX;
    const y = midY - data[i] * amp;
    d += ` C ${x1} ${y1}, ${x2} ${y2}, ${x} ${y}`;
  }

  const closeBottom = d;
  d = closeBottom + ` L ${width} ${height} L 0 ${height} Z`;
  return d;
}

function buildCenterLine(
  data: number[],
  width: number,
  midY: number,
  amp: number
): string {
  if (data.length < 2) return '';
  const n = data.length;
  const stepX = width / (n - 1);

  let d = `M 0 ${midY - data[0] * amp}`;

  for (let i = 1; i < n; i++) {
    const x1 = (i - 0.5) * stepX;
    const y1 = midY - data[i - 1] * amp;
    const x2 = (i - 0.5) * stepX;
    const y2 = midY - data[i] * amp;
    const x = i * stepX;
    const y = midY - data[i] * amp;
    d += ` C ${x1} ${y1}, ${x2} ${y2}, ${x} ${y}`;
  }

  return d;
}

const WavePattern: React.FC<WavePatternProps> = memo(function WavePattern({
  data,
  primary,
  secondary,
  width,
  height,
  gradientId,
  opacity = 0.6,
}) {
  const midY = height * 0.6;
  const amp = height * 0.25;
  const fillPath = buildPath(data, width, height, midY);
  const strokePath = buildCenterLine(data, width, midY, amp);

  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={primary} stopOpacity={0.9} />
          <stop offset="100%" stopColor={secondary} stopOpacity={0.9} />
        </linearGradient>
        <linearGradient id={`${gradientId}_stroke`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={primary} stopOpacity={1} />
          <stop offset="100%" stopColor={secondary} stopOpacity={1} />
        </linearGradient>
      </defs>
      <g style={{ transformOrigin: 'center', animation: 'waveFloat 4s ease-in-out infinite' }}>
        <path
          d={fillPath}
          fill={`url(#${gradientId})`}
          opacity={opacity * 0.6}
        />
        <path
          d={strokePath}
          fill="none"
          stroke={`url(#${gradientId}_stroke)`}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity={opacity}
          style={{ filter: `drop-shadow(0 0 6px ${primary}80)` }}
        />
      </g>
      <g style={{ transformOrigin: 'center', animation: 'waveFloat 5s ease-in-out infinite reverse', opacity: 0.5 }}>
        <path
          d={buildPath(
            data.map((v) => v * 0.7 + 0.1),
            width,
            height,
            midY + 15
          )}
          fill={`url(#${gradientId})`}
          opacity={opacity * 0.3}
        />
      </g>
    </g>
  );
});

export default WavePattern;
