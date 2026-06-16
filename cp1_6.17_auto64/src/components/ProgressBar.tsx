import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number;
  total: number;
  height?: number;
  showLabel?: boolean;
}

function interpolateColor(pct: number) {
  const r1 = 255, g1 = 99, b1 = 99;
  const r2 = 82, g2 = 196, b2 = 26;
  const r = Math.round(r1 + (r2 - r1) * pct);
  const g = Math.round(g1 + (g2 - g1) * pct);
  const b = Math.round(b1 + (b2 - b1) * pct);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function ProgressBar({ value, total, height = 14, showLabel = true }: ProgressBarProps) {
  const pct = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  const pctStr = Math.round(pct * 100);
  const color = interpolateColor(pct);
  const color2 = interpolateColor(Math.min(1, pct + 0.1));

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          width: '100%',
          height,
          background: '#f0ebe3',
          borderRadius: height / 2,
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 20,
            mass: 0.8,
            duration: 0.3
          }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${color}, ${color2})`,
            borderRadius: height / 2,
            boxShadow: `0 2px 6px ${color}55`
          }}
        />
      </div>
      {showLabel && (
        <motion.div
          key={pctStr}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '8px',
            fontSize: '13px',
            color: '#666'
          }}
        >
          <span>{value} / {total} 页</span>
          <span style={{ fontWeight: 600, color: '#333' }}>{pctStr}%</span>
        </motion.div>
      )}
    </div>
  );
}
