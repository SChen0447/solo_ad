import { useState, useEffect, useRef } from 'react';
import type { Rating, LevelRecord } from './gameLogic';

const RATING_COLORS: Record<Rating, string> = {
  S: '#F59E0B',
  A: '#9CA3AF',
  B: '#D97706',
  C: '#6B7280',
};

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({ children, onClick, disabled }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 20px',
        borderRadius: '8px',
        backgroundColor: disabled ? '#313244' : '#45475A',
        color: '#CDD6F4',
        fontSize: '14px',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s ease',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#585B70';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#45475A';
        }
      }}
    >
      {children}
    </button>
  );
}

interface TimerProps {
  timeLeft: number;
  totalTime?: number;
}

export function Timer({ timeLeft, totalTime = 90 }: TimerProps) {
  const [shakeTick, setShakeTick] = useState(0);
  const isLow = timeLeft <= 15;

  useEffect(() => {
    if (!isLow) return;

    const interval = setInterval(() => {
      setShakeTick(s => s + 1);
    }, 100);

    return () => clearInterval(interval);
  }, [isLow]);

  const shakeOffsetX = isLow ? Math.sin(shakeTick * Math.PI * 0.2) * 5 : 0;
  const shakeOffsetY = isLow ? Math.cos(shakeTick * Math.PI * 0.3) * 2 : 0;

  let scale = 1;
  if (isLow) {
    const scalePhase = (shakeTick % 10) / 10;
    if (scalePhase < 0.3) {
      scale = 1 + scalePhase / 0.3 * 0.05;
    } else if (scalePhase < 0.5) {
      scale = 1.05 - (scalePhase - 0.3) / 0.2 * 0.05;
    } else {
      scale = 1;
    }
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = Math.floor(timeLeft % 60);
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div
      style={{
        fontFamily: "'Fira Code', 'Courier New', monospace",
        fontSize: '18px',
        fontWeight: 400,
        color: isLow ? '#EF4444' : '#CDD6F4',
        transform: `translate(${shakeOffsetX}px, ${shakeOffsetY}px) scale(${scale})`,
        transition: 'color 0.3s ease',
        userSelect: 'none',
        textShadow: isLow ? '0 0 10px rgba(239, 68, 68, 0.5)' : 'none',
      }}
    >
      {timeStr}
    </div>
  );
}

interface StepCounterProps {
  steps: number;
}

export function StepCounter({ steps }: StepCounterProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: '#313244',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#CDD6F4',
          fontSize: '12px',
          fontWeight: 600,
        }}
      >
        👟
      </div>
      <span style={{ color: '#CDD6F4', fontSize: '14px' }}>
        {steps} 步
      </span>
    </div>
  );
}

interface RatingBadgeProps {
  rating: Rating;
  visible: boolean;
  onAnimationEnd?: () => void;
}

export function RatingBadge({ rating, visible, onAnimationEnd }: RatingBadgeProps) {
  const [phase, setPhase] = useState<'hidden' | 'fadingIn' | 'swinging' | 'static'>('hidden');
  const [swingAngle, setSwingAngle] = useState(0);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (visible) {
      setPhase('fadingIn');
      startTimeRef.current = performance.now();

      const animate = (time: number) => {
        const elapsed = time - startTimeRef.current;

        if (phase === 'fadingIn') {
          if (elapsed >= 300) {
            setPhase('swinging');
            startTimeRef.current = time;
          }
        } else if (phase === 'swinging') {
          const swingElapsed = elapsed;
          const swingDuration = 200;
          const totalSwings = 3;
          const totalDuration = swingDuration * totalSwings * 2;

          if (swingElapsed >= totalDuration) {
            setPhase('static');
            setSwingAngle(0);
            if (onAnimationEnd) {
              onAnimationEnd();
            }
            return;
          }

          const currentSwing = Math.floor(swingElapsed / swingDuration);
          const swingProgress = (swingElapsed % swingDuration) / swingDuration;
          const direction = currentSwing % 2 === 0 ? 1 : -1;
          const angle = direction * 20 * (currentSwing < totalSwings * 2 - 1 ? 1 : 0) * Math.sin(swingProgress * Math.PI);

          setSwingAngle(angle);
        }

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(animationRef.current);
      };
    } else {
      setPhase('hidden');
      setSwingAngle(0);
    }
  }, [visible, phase, onAnimationEnd]);

  if (!visible && phase === 'hidden') return null;

  const color = RATING_COLORS[rating];
  const opacity = phase === 'fadingIn'
    ? Math.min(1, (performance.now() - startTimeRef.current) / 300)
    : phase === 'hidden' ? 0 : 1;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) rotate(${swingAngle}deg)`,
        opacity,
        zIndex: 100,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          border: `4px solid ${color}`,
          backgroundColor: `${color}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 20px ${color}44`,
          animation: phase === 'static' ? 'pulse-glow 1.5s ease-in-out infinite' : 'none',
        }}
      >
        <span
          style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: color,
            textShadow: `0 0 10px ${color}`,
          }}
        >
          {rating}
        </span>
      </div>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px ${color}44; }
          50% { box-shadow: 0 0 40px ${color}88; }
        }
      `}</style>
    </div>
  );
}

interface HistoryListProps {
  records: LevelRecord[];
}

export function HistoryList({ records }: HistoryListProps) {
  return (
    <div style={{ width: '180px' }}>
      <h3
        style={{
          color: '#CDD6F4',
          fontSize: '14px',
          margin: '0 0 12px 0',
          fontWeight: 600,
        }}
      >
        历史记录
      </h3>
      <div
        style={{
          maxHeight: '400px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          paddingRight: '4px',
        }}
      >
        {records.length === 0 ? (
          <p style={{ color: '#6B7280', fontSize: '12px', margin: 0 }}>
            暂无记录
          </p>
        ) : (
          records.map((record, index) => (
            <div
              key={index}
              style={{
                height: '40px',
                backgroundColor: '#313244',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 12px',
                flexShrink: 0,
              }}
            >
              <span style={{ color: '#CDD6F4', fontSize: '13px' }}>
                第 {record.level} 关
              </span>
              <span
                style={{
                  color: RATING_COLORS[record.rating],
                  fontWeight: 'bold',
                  fontSize: '16px',
                }}
              >
                {record.rating}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface RegeneratingNoticeProps {
  visible: boolean;
}

export function RegeneratingNotice({ visible }: RegeneratingNoticeProps) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (visible) {
      setOpacity(1);
    } else {
      const timer = setTimeout(() => setOpacity(0), 1200);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible && opacity === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        padding: '6px 12px',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        border: '1px solid #3B82F6',
        borderRadius: '6px',
        color: '#3B82F6',
        fontSize: '12px',
        opacity,
        transition: 'opacity 0.3s ease',
        pointerEvents: 'none',
      }}
    >
      重新生成中...
    </div>
  );
}
