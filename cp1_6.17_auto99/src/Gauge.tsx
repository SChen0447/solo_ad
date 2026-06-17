import React, { useMemo } from 'react';

interface GaugeProps {
  score: number;
}

const Gauge: React.FC<GaugeProps> = React.memo(({ score }) => {
  const clampedScore = Math.max(0, Math.min(100, score));

  const color = useMemo(() => {
    if (clampedScore >= 80) return '#00ff88';
    if (clampedScore >= 40) return '#ffcc00';
    return '#ff3366';
  }, [clampedScore]);

  const cx = 150;
  const cy = 150;
  const outerR = 130;
  const innerR = 100;
  const startAngle = -225;
  const endAngle = 45;
  const angleRange = endAngle - startAngle;

  const needleAngle = startAngle + (angleRange * clampedScore) / 100;
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleEndX = cx + Math.cos(needleRad) * (outerR - 12);
  const needleEndY = cy + Math.sin(needleRad) * (outerR - 12);

  const polarToCart = (angleDeg: number, r: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
  };

  const buildArc = (r: number, fromA: number, toA: number) => {
    const start = polarToCart(fromA, r);
    const end = polarToCart(toA, r);
    const large = toA - fromA <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
  };

  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const pct = i / 10;
    const a = startAngle + angleRange * pct;
    const outer = polarToCart(a, outerR);
    const inner = polarToCart(a, outerR - (i % 5 === 0 ? 14 : 7));
    ticks.push(
      <line
        key={i}
        x1={outer.x}
        y1={outer.y}
        x2={inner.x}
        y2={inner.y}
        stroke={i % 5 === 0 ? 'rgba(0,212,255,0.8)' : 'rgba(0,212,255,0.35)'}
        strokeWidth={i % 5 === 0 ? 2 : 1}
        strokeLinecap="round"
      />
    );
    if (i % 2 === 0) {
      const labelPos = polarToCart(a, outerR - 26);
      ticks.push(
        <text
          key={`t-${i}`}
          x={labelPos.x}
          y={labelPos.y}
          fill="rgba(255,255,255,0.6)"
          fontSize="11"
          fontWeight="500"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {i * 10}
        </text>
      );
    }
  }

  const sectionArcs = [
    { from: startAngle, to: startAngle + angleRange * 0.4, color: 'rgba(255,51,102,0.25)' },
    { from: startAngle + angleRange * 0.4, to: startAngle + angleRange * 0.8, color: 'rgba(255,204,0,0.22)' },
    { from: startAngle + angleRange * 0.8, to: endAngle, color: 'rgba(0,255,136,0.25)' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.titleIcon}>🎯</span>
        <span style={styles.titleText}>专注度仪表盘</span>
      </div>
      <div style={styles.gaugeWrap}>
        <svg viewBox="0 0 300 300" width="100%" height="100%" style={{ display: 'block' }}>
          <defs>
            <radialGradient id="gaugeBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(26,35,50,0.9)" />
              <stop offset="100%" stopColor="rgba(15,20,30,0.95)" />
            </radialGradient>
            <filter id="needleGlow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle cx={cx} cy={cy} r={outerR + 8} fill="url(#gaugeBg)" stroke="rgba(0,212,255,0.12)" strokeWidth="1" />

          {sectionArcs.map((s, i) => (
            <path
              key={i}
              d={`${buildArc(outerR - 2, s.from, s.to)} L ${polarToCart(s.to, innerR).x} ${polarToCart(s.to, innerR).y} A ${innerR} ${innerR} 0 0 0 ${polarToCart(s.from, innerR).x} ${polarToCart(s.from, innerR).y} Z`}
              fill={s.color}
              stroke="none"
            />
          ))}

          <path d={buildArc(outerR, startAngle, endAngle)} fill="none" stroke="rgba(0,212,255,0.4)" strokeWidth="1.5" />
          <path d={buildArc(innerR, startAngle, endAngle)} fill="none" stroke="rgba(0,212,255,0.25)" strokeWidth="1" />

          {ticks}

          <g filter="url(#needleGlow)" style={{ transition: 'transform 500ms cubic-bezier(0.34,1.56,0.64,1)', transformOrigin: `${cx}px ${cy}px`, transform: `rotate(${needleAngle + 90}deg)` }}>
            <line x1={cx} y1={cy} x2={needleEndX} y2={needleEndY} stroke={color} strokeWidth="4" strokeLinecap="round" />
          </g>
          <circle cx={cx} cy={cy} r="10" fill={color} stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
          <circle cx={cx} cy={cy} r="4" fill="#fff" />

          <text x={cx} y={cy + 55} fill={color} fontSize="38" fontWeight="800" textAnchor="middle" style={{ textShadow: `0 0 20px ${color}66`, letterSpacing: '1px' }}>
            {clampedScore}
          </text>
          <text x={cx} y={cy + 78} fill="rgba(255,255,255,0.45)" fontSize="12" textAnchor="middle" letterSpacing="2">
            FOCUS SCORE
          </text>
        </svg>
      </div>
      <div style={styles.footer}>
        <div style={{ ...styles.statusDot, background: color }} />
        <span style={{ ...styles.statusText, color }}>
          {clampedScore >= 80 ? '高度专注' : clampedScore >= 40 ? '中度专注' : '需要关注'}
        </span>
      </div>
    </div>
  );
});

Gauge.displayName = 'Gauge';

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'linear-gradient(135deg, rgba(26,35,50,0.85), rgba(15,20,30,0.9))',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '16px',
    padding: '20px 20px 16px',
    border: '1px solid rgba(0,212,255,0.2)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
    transition: 'box-shadow 300ms, border-color 300ms',
    position: 'relative',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px'
  },
  titleIcon: { fontSize: '18px' },
  titleText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: '15px',
    fontWeight: '600',
    letterSpacing: '0.5px'
  },
  gaugeWrap: {
    width: '100%',
    aspectRatio: '1 / 1',
    maxHeight: '260px',
    margin: '0 auto'
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '4px'
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    boxShadow: '0 0 8px currentColor'
  },
  statusText: {
    fontSize: '13px',
    fontWeight: '600',
    letterSpacing: '1px',
    transition: 'color 500ms ease'
  }
};

export default Gauge;
