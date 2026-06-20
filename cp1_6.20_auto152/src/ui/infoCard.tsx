import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProcessedQuake } from '@/types';
import { formatTimestamp, getDepthCategory } from '@/utils/constants';

interface InfoCardProps {
  quake: ProcessedQuake | null;
  screenPosition: { x: number; y: number } | null;
  onClose: () => void;
}

export function InfoCard({ quake, screenPosition, onClose }: InfoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const getCardPosition = () => {
    if (!screenPosition) return { x: 0, y: 0 };
    const cardW = 280;
    const cardH = 220;
    const padding = 16;
    let x = screenPosition.x + 20;
    let y = screenPosition.y - cardH / 2;
    if (x + cardW + padding > window.innerWidth) {
      x = screenPosition.x - cardW - 20;
    }
    if (y < padding) y = padding;
    if (y + cardH + padding > window.innerHeight) {
      y = window.innerHeight - cardH - padding;
    }
    return { x, y };
  };

  const depthClass = `depth-${getDepthCategory(quake?.depth ?? 0)}`;

  return (
    <AnimatePresence>
      {quake && screenPosition && (
        <motion.div
          ref={cardRef}
          className="info-card"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: getCardPosition().x,
            y: getCardPosition().y,
          }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, duration: 0.4 }}
          style={{ position: 'fixed' }}
        >
          <button className="info-card-close" onClick={onClose} aria-label="Close">
            ×
          </button>
          <div className="info-card-grid">
            <div className="info-card-magnitude">M {quake.magnitude.toFixed(1)}</div>
            <div>
              <div className="info-card-label">位置</div>
              <div className="info-card-value" style={{ wordBreak: 'break-word' }}>
                {quake.place}
              </div>
            </div>
            <div>
              <div className="info-card-label">时间</div>
              <div className="info-card-value" style={{ fontSize: '13px' }}>
                {formatTimestamp(quake.time)}
              </div>
            </div>
            <div>
              <div className="info-card-label">深度</div>
              <div className={`info-card-value ${depthClass}`}>
                {quake.depth.toFixed(1)} km
              </div>
            </div>
            <div>
              <div className="info-card-label">坐标</div>
              <div className="info-card-value">
                {quake.latitude.toFixed(2)}°, {quake.longitude.toFixed(2)}°
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default InfoCard;
