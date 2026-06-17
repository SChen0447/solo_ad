import { useState, useEffect, useRef } from 'react';

interface CountUpCardProps {
  title: string;
  value: number;
  gradient: string;
  icon: string;
  duration?: number;
}

export default function CountUpCard({
  title,
  value,
  gradient,
  icon,
  duration = 1500,
}: CountUpCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(easeOut * value));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, duration]);

  return (
    <div
      className={`countup-card ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="countup-card-bg" style={{ background: gradient }}></div>
      <div className="countup-card-content">
        <div className="countup-card-icon">{icon}</div>
        <div className="countup-card-info">
          <h3 className="countup-card-title">{title}</h3>
          <div className="countup-card-value">
            {displayValue.toLocaleString()}
          </div>
        </div>
      </div>
      <div className="countup-card-shine"></div>
    </div>
  );
}
