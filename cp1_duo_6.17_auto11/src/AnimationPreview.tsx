import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BezierCurve, AnimationType } from './types';

interface AnimationPreviewProps {
  curve: BezierCurve;
  animationType: AnimationType;
  speed: number;
  onAnimationEnd?: () => void;
  autoPlay?: boolean;
  onSpeedChange?: (speed: number) => void;
}

const PREVIEW_SIZE = 400;
const ELEMENT_SIZE = 100;
const ANIMATION_DURATION = 2000;

const cubicBezier = (t: number, p1x: number, p1y: number, p2x: number, p2y: number): number => {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  const sampleCurveX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleCurveY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleCurveDerivativeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  let x = t;
  for (let i = 0; i < 8; i++) {
    const currentX = sampleCurveX(x) - t;
    if (Math.abs(currentX) < 1e-6) break;
    const derivative = sampleCurveDerivativeX(x);
    if (Math.abs(derivative) < 1e-6) break;
    x = x - currentX / derivative;
  }

  return sampleCurveY(x);
};

const AnimationPreview: React.FC<AnimationPreviewProps> = ({ curve, animationType, speed, onAnimationEnd, autoPlay, onSpeedChange }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const pausedProgressRef = useRef(0);
  const hasAutoPlayedRef = useRef(false);
  const speedRef = useRef(speed);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const getElementStyle = useCallback((progress: number): React.CSSProperties => {
    const easedProgress = cubicBezier(progress, curve.p1x, curve.p1y, curve.p2x, curve.p2y);

    switch (animationType) {
      case 'translate':
        return {
          transform: `translateX(${-200 + easedProgress * 200}px)`
        };
      case 'scale':
        return {
          transform: `scale(${0.5 + easedProgress * 0.5})`
        };
      case 'rotate':
        return {
          transform: `rotate(${easedProgress * 360}deg)`
        };
      case 'opacity':
        return {
          opacity: easedProgress
        };
      default:
        return {};
    }
  }, [curve, animationType]);

  const animate = useCallback((timestamp: number) => {
    const currentSpeed = speedRef.current;
    const scaledDuration = ANIMATION_DURATION / currentSpeed;

    if (!startTimeRef.current) {
      startTimeRef.current = timestamp - pausedProgressRef.current * scaledDuration;
    }

    const elapsed = timestamp - startTimeRef.current;
    const currentProgress = Math.min(elapsed / scaledDuration, 1);

    setProgress(currentProgress);

    if (currentProgress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setIsPlaying(false);
      pausedProgressRef.current = 0;
      startTimeRef.current = undefined;
      onAnimationEnd?.();
    }
  }, [onAnimationEnd]);

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, animate]);

  useEffect(() => {
    if (autoPlay && !hasAutoPlayedRef.current) {
      hasAutoPlayedRef.current = true;
      setProgress(0);
      pausedProgressRef.current = 0;
      startTimeRef.current = undefined;
      setIsPlaying(true);
    }
  }, [autoPlay]);

  const handlePlayPause = () => {
    if (isPlaying) {
      pausedProgressRef.current = progress;
      startTimeRef.current = undefined;
      setIsPlaying(false);
    } else {
      if (progress >= 1) {
        setProgress(0);
        pausedProgressRef.current = 0;
      }
      startTimeRef.current = undefined;
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setProgress(0);
    pausedProgressRef.current = 0;
    startTimeRef.current = undefined;
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>动画预览</h3>
      <div style={styles.previewBox}>
        <div style={{ ...styles.animatedElement, ...getElementStyle(progress) }} />
      </div>
      <div style={styles.progressContainer}>
        <div style={styles.progressBarBg}>
          <div
            style={{
              ...styles.progressBarFill,
              width: `${progress * 100}%`
            }}
          />
        </div>
        <span style={styles.progressText}>{(progress * 100).toFixed(0)}%</span>
      </div>

      <div style={styles.speedControl}>
        <label style={styles.speedLabel}>播放速度</label>
        <div style={styles.speedSliderWrapper}>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={speed}
            onChange={(e) => onSpeedChange?.(parseFloat(e.target.value))}
            style={styles.speedSlider}
          />
          <span style={styles.speedValue}>{speed.toFixed(1)}x</span>
        </div>
      </div>

      <div style={styles.controls}>
        <button style={styles.playButton} onClick={handlePlayPause}>
          {isPlaying ? '暂停' : '播放'}
        </button>
        <button style={styles.resetButton} onClick={handleReset}>
          重置
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    height: '100%',
    gap: '16px'
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#e0e0e0',
    marginBottom: '8px'
  },
  previewBox: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    backgroundColor: '#0f0f23',
    borderRadius: '8px',
    border: '1px solid #2a2a4e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden'
  },
  animatedElement: {
    width: ELEMENT_SIZE,
    height: ELEMENT_SIZE,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)'
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: PREVIEW_SIZE
  },
  progressBarBg: {
    flex: 1,
    height: '6px',
    backgroundColor: '#2a2a4e',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #667eea, #764ba2)',
    borderRadius: '3px',
    transition: 'width 16ms linear'
  },
  progressText: {
    fontSize: '12px',
    color: '#a0a0c0',
    minWidth: '40px',
    textAlign: 'right',
    fontFamily: 'monospace'
  },
  speedControl: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: PREVIEW_SIZE
  },
  speedLabel: {
    fontSize: '12px',
    color: '#a0a0c0'
  },
  speedSliderWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  speedSlider: {
    flex: 1,
    height: '6px',
    appearance: 'none',
    WebkitAppearance: 'none',
    backgroundColor: '#2a2a4e',
    borderRadius: '3px',
    outline: 'none',
    cursor: 'pointer'
  },
  speedValue: {
    fontSize: '13px',
    color: '#667eea',
    fontWeight: 600,
    minWidth: '42px',
    textAlign: 'right',
    fontFamily: 'monospace'
  },
  controls: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px'
  },
  playButton: {
    padding: '10px 32px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'filter 0.2s, box-shadow 0.2s'
  },
  resetButton: {
    padding: '10px 24px',
    backgroundColor: '#2a2a4e',
    border: '1px solid #3a3a5e',
    borderRadius: '6px',
    color: '#e0e0e0',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
};

export default AnimationPreview;
