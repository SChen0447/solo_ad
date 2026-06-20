import React, { useState, useEffect, useRef } from 'react';
import './StatsPanel.css';

interface StatsPanelProps {
  eventCount: number;
  maxMagnitude: number;
  averageDepth: number;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  eventCount,
  maxMagnitude,
  averageDepth
}) => {
  const [animatedCount, setAnimatedCount] = useState(eventCount);
  const [animatedMag, setAnimatedMag] = useState(maxMagnitude);
  const [animatedDepth, setAnimatedDepth] = useState(averageDepth);
  const [countScale, setCountScale] = useState(1);
  const [magScale, setMagScale] = useState(1);
  const [depthScale, setDepthScale] = useState(1);
  const prevCountRef = useRef(eventCount);
  const prevMagRef = useRef(maxMagnitude);
  const prevDepthRef = useRef(averageDepth);

  useEffect(() => {
    if (prevCountRef.current !== eventCount) {
      setCountScale(1.2);
      setTimeout(() => setCountScale(1), 200);
      prevCountRef.current = eventCount;
    }
    setAnimatedCount(eventCount);
  }, [eventCount]);

  useEffect(() => {
    if (prevMagRef.current !== maxMagnitude) {
      setMagScale(1.2);
      setTimeout(() => setMagScale(1), 200);
      prevMagRef.current = maxMagnitude;
    }
    setAnimatedMag(maxMagnitude);
  }, [maxMagnitude]);

  useEffect(() => {
    if (prevDepthRef.current !== averageDepth) {
      setDepthScale(1.2);
      setTimeout(() => setDepthScale(1), 200);
      prevDepthRef.current = averageDepth;
    }
    setAnimatedDepth(averageDepth);
  }, [averageDepth]);

  const formatNumber = (num: number, decimals: number = 1) => {
    return num.toFixed(decimals);
  };

  return (
    <div className="stats-panel">
      <h3 className="stats-title">数据统计</h3>
      
      <div className="stats-item">
        <span className="stats-label">地震事件</span>
        <span 
          className="stats-value"
          style={{ transform: `scale(${countScale})` }}
        >
          {animatedCount}
        </span>
      </div>
      
      <div className="stats-item">
        <span className="stats-label">最大震级</span>
        <span 
          className="stats-value mag-value"
          style={{ transform: `scale(${magScale})` }}
        >
          {formatNumber(animatedMag)}
        </span>
      </div>
      
      <div className="stats-item">
        <span className="stats-label">平均深度</span>
        <span 
          className="stats-value depth-value"
          style={{ transform: `scale(${depthScale})` }}
        >
          {formatNumber(animatedDepth)} km
        </span>
      </div>
    </div>
  );
};
