import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Instrument, Grade } from '../types';

const gradeStyles: Record<Grade, { bg: string; glow: string; text: string }> = {
  S: { bg: '#FFD700', glow: '0 2px 12px rgba(255, 215, 0, 0.5)', text: '#ffffff' },
  A: { bg: '#22C55E', glow: '0 2px 12px rgba(34, 197, 94, 0.4)', text: '#ffffff' },
  B: { bg: '#3B82F6', glow: '0 2px 12px rgba(59, 130, 246, 0.4)', text: '#ffffff' },
  C: { bg: '#F97316', glow: '0 2px 12px rgba(249, 115, 22, 0.4)', text: '#ffffff' },
  D: { bg: '#EF4444', glow: '0 2px 12px rgba(239, 68, 68, 0.4)', text: '#ffffff' },
};

export const GradeBadge: React.FC<{ grade: Grade; size?: 'sm' | 'md' | 'lg' }> = ({ grade, size = 'md' }) => {
  const s = gradeStyles[grade];
  const sizes = { sm: 28, md: 36, lg: 48 };
  const fontSizes = { sm: 12, md: 16, lg: 22 };
  const dim = sizes[size];
  return (
    <div
      className="badge-grade"
      style={{
        width: dim,
        height: dim,
        fontSize: fontSizes[size],
        background: `linear-gradient(135deg, ${s.bg}, ${adjustBrightness(s.bg, -10)})`,
        boxShadow: s.glow,
        color: s.text,
      }}
    >
      {grade}
    </div>
  );
};

function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const StarRating: React.FC<{ value: number; size?: number }> = ({ value, size = 14 }) => {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ fontSize: size, color: i <= full || (i === full + 1 && half) ? '#fbbf24' : '#e8e0d6' }}>
          ★
        </span>
      ))}
    </span>
  );
};

export { StarRating };

const typeIcons: Record<string, string> = {
  guitar: '🎸',
  violin: '🎻',
  saxophone: '🎷',
  keyboard: '🎹',
};

interface InstrumentCardProps {
  instrument: Instrument;
  index?: number;
  compact?: boolean;
}

const InstrumentCard: React.FC<InstrumentCardProps> = ({ instrument, index = 0, compact = false }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
      className="card"
      style={{
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={() => navigate(`/instrument/${instrument.id}`)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div style={{ position: 'relative', overflow: 'hidden', background: '#faf8f5' }}>
        <img
          src={instrument.thumbnail}
          alt={instrument.name}
          loading="lazy"
          style={{
            width: '100%',
            height: compact ? 140 : 180,
            objectFit: 'cover',
            display: 'block',
            transition: 'transform 0.4s ease-out',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(4px)',
            padding: '4px 10px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 500,
            color: '#5c554d',
          }}
        >
          <span>{typeIcons[instrument.type] || '🎵'}</span>
          <span>{instrument.type_name}</span>
        </div>
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <GradeBadge grade={instrument.grade} />
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            background: 'rgba(139, 94, 60, 0.9)',
            color: '#fff',
            fontSize: 11,
            padding: '3px 8px',
            borderRadius: 6,
            backdropFilter: 'blur(4px)',
          }}
        >
          {instrument.overall_score}分
        </div>
      </div>

      <div style={{ padding: compact ? 12 : 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: compact ? 14 : 16, fontWeight: 700, color: '#2d2a26', marginBottom: 6, lineHeight: 1.3 }}>
          {instrument.name}
        </div>
        <div style={{ fontSize: 12, color: '#8c7b6a', marginBottom: 10 }}>
          {instrument.brand} · {instrument.year}年 · {instrument.location.split('市')[0]}市
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
          <div>
            <div style={{ fontSize: 11, color: '#a89684', marginBottom: 2 }}>卖家</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, color: '#5c554d', fontWeight: 500 }}>{instrument.seller_name}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: compact ? 18 : 22, fontWeight: 800, color: '#8B5E3C', letterSpacing: -0.5 }}>
              ¥{instrument.price.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default InstrumentCard;
