import { useState, useEffect, useRef } from 'react';
import { useSimulationStore } from '../store/store';
import './InfoOverlay.css';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(targetValue: number, duration: number = 500): number {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const startValueRef = useRef(targetValue);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startValueRef.current = displayValue;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const currentValue =
        startValueRef.current + (targetValue - startValueRef.current) * easedProgress;
      setDisplayValue(currentValue);

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
  }, [targetValue, duration]);

  return displayValue;
}

export function InfoOverlay() {
  const statistics = useSimulationStore((state) => state.statistics);

  const activeDrones = useCountUp(statistics.activeDrones);
  const deliveredPackages = useCountUp(statistics.deliveredPackages);
  const totalDistance = useCountUp(statistics.totalDistance);

  const timeProgress = Math.min(
    (statistics.simulationTime / statistics.totalSimulationTime) * 100,
    100
  );

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return Math.floor(num).toString();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="info-overlay">
      <h2 className="overlay-title">实时数据</h2>

      <div className="stats-container">
        <div className="stat-item">
          <span className="stat-label">活跃无人机</span>
          <span className="stat-value active-drones">
            {Math.floor(activeDrones)}
          </span>
          <span className="stat-unit">架</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">已送达包裹</span>
          <span className="stat-value delivered">{Math.floor(deliveredPackages)}</span>
          <span className="stat-unit">个</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">总飞行里程</span>
          <span className="stat-value distance">{formatNumber(totalDistance)}</span>
          <span className="stat-unit">单位</span>
        </div>
      </div>

      <div className="timeline-section">
        <div className="timeline-header">
          <span className="timeline-label">模拟时间</span>
          <span className="timeline-time">
            {formatTime(statistics.simulationTime)}
          </span>
        </div>
        <div className="timeline-bar">
          <div
            className="timeline-fill"
            style={{ width: `${timeProgress}%` }}
          />
        </div>
        <div className="timeline-footer">
          <span>00:00</span>
          <span>{formatTime(statistics.totalSimulationTime)}</span>
        </div>
      </div>
    </div>
  );
}
