import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

export interface PerformanceMonitorRef {
  setTrailLength: (length: number) => void;
}

interface PerformanceMonitorProps {
  onFpsChange?: (fps: number) => void;
}

const PerformanceMonitor = forwardRef<PerformanceMonitorRef, PerformanceMonitorProps>(
  ({ onFpsChange }, ref) => {
    const [fps, setFps] = useState(60);
    const frameCountRef = useRef(0);
    const lastTimeRef = useRef(performance.now());
    const animationFrameRef = useRef<number>();

    useImperativeHandle(ref, () => ({
      setTrailLength: () => {}
    }));

    useEffect(() => {
      const updateFps = () => {
        frameCountRef.current++;
        const now = performance.now();
        const delta = now - lastTimeRef.current;

        if (delta >= 1000) {
          const currentFps = Math.round((frameCountRef.current * 1000) / delta);
          setFps(currentFps);
          onFpsChange?.(currentFps);
          frameCountRef.current = 0;
          lastTimeRef.current = now;
        }

        animationFrameRef.current = requestAnimationFrame(updateFps);
      };

      animationFrameRef.current = requestAnimationFrame(updateFps);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [onFpsChange]);

    const getFpsColor = () => {
      if (fps >= 50) return '#00ff88';
      if (fps >= 30) return '#ffcc00';
      return '#ff4444';
    };

    return (
      <div
        style={{
          ...styles.container,
          borderColor: getFpsColor() + '40'
        }}
      >
        <span style={{ ...styles.label, color: getFpsColor() }}>FPS</span>
        <span style={{ ...styles.value, color: getFpsColor() }}>{fps}</span>
      </div>
    );
  }
);

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'fixed',
    top: 80,
    left: 20,
    background: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 4,
    padding: '4px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    zIndex: 100,
    border: '1px solid',
    fontFamily: 'monospace'
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  value: {
    fontSize: 14,
    fontWeight: 700,
    minWidth: 30,
    textAlign: 'right'
  }
};

PerformanceMonitor.displayName = 'PerformanceMonitor';

export default PerformanceMonitor;
