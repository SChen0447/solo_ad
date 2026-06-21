import { useState, useMemo } from 'react';
import { CURVES, type EasingCurve } from '../utils/exportCss';
import styles from './CurveLibrary.module.css';

interface CurveLibraryProps {
  selectedId: string;
  onSelect: (curve: EasingCurve) => void;
}

function generateCurvePath(curve: EasingCurve, width: number, height: number): string {
  const points: [number, number][] = [];
  const steps = 100;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let y: number;

    if (curve.points) {
      const [p1x, p1y, p2x, p2y] = curve.points;
      y = cubicBezier(t, p1x, p1y, p2x, p2y);
    } else {
      y = getPresetEasing(t, curve.value);
    }

    points.push([t * width, (1 - y) * height]);
  }

  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
}

function cubicBezier(t: number, p1x: number, p1y: number, p2x: number, p2y: number): number {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  let x = t;
  for (let i = 0; i < 8; i++) {
    const currentX = ((ax * x + bx) * x + cx) * x - t;
    if (Math.abs(currentX) < 1e-3) break;
    const derivative = (3 * ax * x + 2 * bx) * x + cx;
    if (Math.abs(derivative) < 1e-6) break;
    x -= currentX / derivative;
  }

  return ((ay * x + by) * x + cy) * x;
}

function getPresetEasing(t: number, value: string): number {
  switch (value) {
    case 'linear':
      return t;
    case 'ease':
      return cubicBezier(t, 0.25, 0.1, 0.25, 1);
    case 'ease-in':
      return cubicBezier(t, 0.42, 0, 1, 1);
    case 'ease-out':
      return cubicBezier(t, 0, 0, 0.58, 1);
    case 'ease-in-out':
      return cubicBezier(t, 0.42, 0, 0.58, 1);
    default:
      return t;
  }
}

function CurveThumbnail({ curve }: { curve: EasingCurve }) {
  const width = 200;
  const height = 120;
  const padding = 8;

  const path = useMemo(() =>
    generateCurvePath(curve, width - padding * 2, height - padding * 2),
    [curve]
  );

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${curve.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="#4a4a5a"
        strokeWidth="1"
        strokeDasharray="3,3"
      />
      <line
        x1={padding}
        y1={padding}
        x2={padding}
        y2={height - padding}
        stroke="#4a4a5a"
        strokeWidth="1"
        strokeDasharray="3,3"
      />
      <path
        d={path}
        fill="none"
        stroke={`url(#grad-${curve.id})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={`translate(${padding}, ${padding})`}
      />
    </svg>
  );
}

export default function CurveLibrary({ selectedId, onSelect }: CurveLibraryProps) {
  const [customPoints, setCustomPoints] = useState<[number, number, number, number]>([0.25, 0.1, 0.25, 1]);
  const [customCurve, setCustomCurve] = useState<EasingCurve>(CURVES[5]);

  const handleCustomInputChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.max(-1, Math.min(2, numValue));
    const newPoints = [...customPoints] as [number, number, number, number];
    newPoints[index] = clampedValue;
    setCustomPoints(newPoints);

    const newValue = `cubic-bezier(${newPoints.join(', ')})`;
    setCustomCurve({
      ...customCurve,
      value: newValue,
      points: newPoints,
    });
  };

  const handleCurveSelect = (curve: EasingCurve) => {
    if (curve.id === 'cubic-bezier') {
      onSelect(customCurve);
    } else {
      onSelect(curve);
    }
  };

  return (
    <div className={styles.curveLibrary}>
      <h2 className={styles.title}>缓动函数</h2>
      <div className={styles.curveList}>
        {CURVES.map((curve) => {
          const isSelected = curve.id === 'cubic-bezier'
            ? selectedId === 'cubic-bezier'
            : selectedId === curve.id;
          const displayCurve = curve.id === 'cubic-bezier' ? customCurve : curve;

          return (
            <button
              key={curve.id}
              className={`${styles.curveCard} ${isSelected ? styles.selected : ''}`}
              onClick={() => handleCurveSelect(curve)}
            >
              <div className={styles.thumbnail}>
                <CurveThumbnail curve={displayCurve} />
              </div>
              <span className={styles.curveName}>{curve.name}</span>
              {curve.id === 'cubic-bezier' && (
                <div className={styles.customInputs}>
                  {['P1x', 'P1y', 'P2x', 'P2y'].map((label, index) => (
                    <div key={label} className={styles.inputGroup}>
                      <label>{label}</label>
                      <input
                        type="number"
                        step="0.01"
                        min="-1"
                        max="2"
                        value={customPoints[index]}
                        onChange={(e) => handleCustomInputChange(index, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
