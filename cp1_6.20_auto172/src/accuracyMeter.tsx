import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AccuracyMeterProps {
  accuracy: number;
  size?: number;
}

export default function AccuracyMeter({ accuracy, size = 140 }: AccuracyMeterProps) {
  const [displayAccuracy, setDisplayAccuracy] = useState(0);
  const targetRef = useRef(accuracy);
  const animationRef = useRef<number | null>(null);
  const currentRef = useRef(0);

  useEffect(() => {
    targetRef.current = accuracy;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    const startTime = performance.now();
    const startValue = currentRef.current;
    const duration = 500;
    
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const value = startValue + (targetRef.current - startValue) * easeProgress;
      currentRef.current = value;
      setDisplayAccuracy(value);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [accuracy]);

  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, displayAccuracy * 100));
  const offset = circumference - (progress / 100) * circumference;

  const getGradientColors = () => {
    if (progress >= 80) {
      return { start: '#10B981', end: '#34D399' };
    } else if (progress >= 50) {
      return { start: '#F59E0B', end: '#FBBF24' };
    } else {
      return { start: '#EF4444', end: '#F87171' };
    }
  };

  const colors = getGradientColors();
  const gradientId = `accuracy-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.start} />
            <stop offset="100%" stopColor={colors.end} />
          </linearGradient>
        </defs>
        
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          initial={false}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </svg>
      
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={Math.round(progress)}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            style={{
              fontSize: size * 0.25,
              fontWeight: 700,
              color: colors.start,
              lineHeight: 1
            }}
          >
            {Math.round(progress)}%
          </motion.span>
        </AnimatePresence>
        <span
          style={{
            fontSize: size * 0.1,
            color: '#6B7280',
            marginTop: 4
          }}
        >
          准确率
        </span>
      </div>
    </motion.div>
  );
}
