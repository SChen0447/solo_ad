import React, { useRef, useEffect, useCallback, useState } from 'react';
import { analyzeStrokes, type Stroke, type StrokePoint } from './Analyzer';
import { mapToEmotion, type EmotionResult } from './EmotionMapper';
import { ParticleEngine } from './ParticleEngine';

interface CanvasBoardProps {
  onEmotionChange: (emotion: EmotionResult | null) => void;
  onClear: () => void;
  emotion: EmotionResult | null;
}

const GRID_SPACING = 20;
const MIN_WIDTH = 2;
const MAX_WIDTH = 6;
const IDLE_TIMEOUT = 1500;

const CanvasBoard: React.FC<CanvasBoardProps> = ({ onEmotionChange, onClear, emotion }) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const glowCanvasRef = useRef<HTMLCanvasElement>(null);

  const particleEngineRef = useRef<ParticleEngine | null>(null);

  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<StrokePoint[]>([]);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<StrokePoint | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPointsRef = useRef<StrokePoint[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const glowAnimRef = useRef<number | null>(null);

  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const [glowActive, setGlowActive] = useState(false);

  const pressureToWidth = (pressure: number): number => {
    const p = Math.max(0, Math.min(1, pressure));
    return MIN_WIDTH + (MAX_WIDTH - MIN_WIDTH) * p;
  };

  const initCanvases = useCallback(() => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height);
    setBoardSize({ width, height });

    for (const ref of [drawCanvasRef, particleCanvasRef, glowCanvasRef]) {
      const canvas = ref.current;
      if (!canvas) continue;
      canvas.width = width;
      canvas.height = height;
    }

    if (particleEngineRef.current) {
      particleEngineRef.current.resize(width, height);
    }
  }, []);

  const drawGrid = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    for (let x = 0; x <= canvas.width; x += GRID_SPACING) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += GRID_SPACING) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }, []);

  const redrawStrokes = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawGrid();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2b2b44';

    for (const stroke of strokesRef.current) {
      const points = stroke.points;
      if (points.length < 2) continue;

      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const width = pressureToWidth((prev.pressure + curr.pressure) / 2);
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
      }
    }
  }, [drawGrid]);

  const triggerGlow = useCallback(() => {
    const canvas = glowCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setGlowActive(true);
    const startTime = performance.now();
    const duration = 600;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const radius = 50 * (0.3 + progress * 0.7);
      const alpha = (1 - progress) * 0.6;

      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height)
      );
      gradient.addColorStop(0, `rgba(108, 99, 255, 0)`);
      gradient.addColorStop(0.7, `rgba(108, 99, 255, 0)`);
      gradient.addColorStop(0.85, `rgba(108, 99, 255, ${alpha})`);
      gradient.addColorStop(0.92, `rgba(108, 99, 255, ${alpha * 0.6})`);
      gradient.addColorStop(1, `rgba(108, 99, 255, 0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const borderGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      borderGradient.addColorStop(0, `rgba(108, 99, 255, ${alpha})`);
      borderGradient.addColorStop(0.5, `rgba(78, 205, 196, ${alpha})`);
      borderGradient.addColorStop(1, `rgba(108, 99, 255, ${alpha})`);

      ctx.strokeStyle = borderGradient;
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

      if (progress < 1) {
        glowAnimRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setGlowActive(false);
      }
    };

    if (glowAnimRef.current) cancelAnimationFrame(glowAnimRef.current);
    glowAnimRef.current = requestAnimationFrame(animate);
  }, []);

  const processPoints = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const points = pendingPointsRef.current;
    if (points.length === 0) {
      rafIdRef.current = null;
      return;
    }

    const maxProcess = Math.min(10, points.length);
    const toProcess = points.splice(0, maxProcess);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2b2b44';

    for (const curr of toProcess) {
      const prev = lastPointRef.current;
      if (prev) {
        const width = pressureToWidth((prev.pressure + curr.pressure) / 2);
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
      }
      currentStrokeRef.current.push(curr);
      lastPointRef.current = curr;
    }

    if (points.length > 0) {
      rafIdRef.current = requestAnimationFrame(processPoints);
    } else {
      rafIdRef.current = null;
    }
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): { x: number; y: number; pressure: number } => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0, clientY = 0, pressure = 0.5;

    if ('touches' in e && e.touches.length > 0) {
      const touch = e.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
      pressure = (touch as any).force && (touch as any).force > 0 ? (touch as any).force : 0.5;
    } else if ('changedTouches' in e && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
      pressure = (touch as any).force && (touch as any).force > 0 ? (touch as any).force : 0.5;
    } else if ('clientX' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
      pressure = 0.5;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      pressure
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    isDrawingRef.current = true;
    currentStrokeRef.current = [];
    lastPointRef.current = null;

    const pos = getPos(e);
    pendingPointsRef.current.push({
      x: pos.x,
      y: pos.y,
      pressure: pos.pressure,
      timestamp: performance.now()
    });

    triggerGlow();

    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(processPoints);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();

    const pos = getPos(e);
    pendingPointsRef.current.push({
      x: pos.x,
      y: pos.y,
      pressure: pos.pressure,
      timestamp: performance.now()
    });

    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(processPoints);
    }
  };

  const analyzeAndEmit = useCallback(() => {
    if (strokesRef.current.length === 0) return;

    const features = analyzeStrokes(strokesRef.current);
    const emotion = mapToEmotion(features);
    onEmotionChange(emotion);

    const lastStroke = strokesRef.current[strokesRef.current.length - 1];
    if (lastStroke && lastStroke.points.length > 0 && particleEngineRef.current) {
      const lastPoint = lastStroke.points[lastStroke.points.length - 1];
      particleEngineRef.current.trigger(emotion, lastPoint.x, lastPoint.y);
    }
  }, [onEmotionChange]);

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();

    isDrawingRef.current = false;

    const pos = getPos(e);
    if (currentStrokeRef.current.length === 0) {
      pendingPointsRef.current.push({
        x: pos.x,
        y: pos.y,
        pressure: pos.pressure,
        timestamp: performance.now()
      });
    }

    setTimeout(() => {
      if (currentStrokeRef.current.length > 0) {
        strokesRef.current.push({ points: [...currentStrokeRef.current] });
        currentStrokeRef.current = [];
      }
      lastPointRef.current = null;
    }, 50);

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      analyzeAndEmit();
    }, IDLE_TIMEOUT);
  };

  const clearBoard = useCallback(() => {
    strokesRef.current = [];
    currentStrokeRef.current = [];
    pendingPointsRef.current = [];
    lastPointRef.current = null;
    isDrawingRef.current = false;

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    drawGrid();
    if (particleEngineRef.current) {
      particleEngineRef.current.reset();
    }
    onEmotionChange(null);
    onClear();
  }, [drawGrid, onEmotionChange, onClear]);

  useEffect(() => {
    initCanvases();
    drawGrid();

    if (particleCanvasRef.current) {
      particleEngineRef.current = new ParticleEngine(particleCanvasRef.current);
      particleEngineRef.current.resize(boardSize.width || particleCanvasRef.current.width, boardSize.height || particleCanvasRef.current.height);
    }

    const handleResize = () => initCanvases();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (glowAnimRef.current) cancelAnimationFrame(glowAnimRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (particleEngineRef.current) particleEngineRef.current.destroy();
    };
  }, []);

  useEffect(() => {
    if (boardSize.width > 0) {
      redrawStrokes();
    }
  }, [boardSize, redrawStrokes]);

  useEffect(() => {
    (window as any).__clearEmotionBoard = clearBoard;
  }, [clearBoard]);

  return (
    <div
      ref={boardRef}
      style={{
        position: 'relative',
        width: '60%',
        height: '480px',
        margin: '0 auto',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: glowActive
          ? '0 0 40px rgba(108, 99, 255, 0.5), 0 8px 32px rgba(0,0,0,0.3)'
          : '0 8px 32px rgba(0,0,0,0.2)',
        transition: 'box-shadow 0.3s ease'
      }}
    >
      <canvas
        ref={drawCanvasRef}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
          touchAction: 'none'
        }}
      />
      <canvas
        ref={particleCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      />
      <canvas
        ref={glowCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          borderRadius: '12px'
        }}
      />

      {emotion && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '20px',
            fontSize: '28px',
            fontWeight: 700,
            color: emotion.color,
            textShadow: `0 0 20px ${emotion.color}40, 0 2px 8px rgba(0,0,0,0.3)`,
            letterSpacing: '2px',
            zIndex: 10,
            animation: 'emotionFadeIn 0.5s ease-out'
          }}
        >
          {emotion.label}
        </div>
      )}
    </div>
  );
};

export default CanvasBoard;
