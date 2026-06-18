import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { TrajectoryPoint, RUNE_COST } from '../store/types';
import { recognizeRune } from '../utils/runeRecognizer';

const ease = 'cubic-bezier(0.4, 0, 0.2, 1)';

const RunePanel: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const pointsRef = useRef<TrajectoryPoint[]>([]);
  const lastSampleRef = useRef(0);
  const [feedback, setFeedback] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);
  const fbTimerRef = useRef<number | null>(null);

  const energy = useGameStore(s => s.energy);
  const maxEnergy = useGameStore(s => s.maxEnergy);
  const applyRune = useGameStore(s => s.applyRune);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  const showFeedback = (text: string, type: 'ok' | 'err') => {
    if (fbTimerRef.current) window.clearTimeout(fbTimerRef.current);
    setFeedback({ text, type });
    fbTimerRef.current = window.setTimeout(() => setFeedback(null), 1500);
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const pts = pointsRef.current;
    if (pts.length < 2) return;

    ctx.save();
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 15;
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.65)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
    ctx.restore();
  };

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (energy < RUNE_COST) {
      showFeedback('能量不足，至少需要20点', 'err');
      return;
    }
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pos = getPos(e);
    const now = performance.now();
    pointsRef.current = [{ ...pos, time: now }];
    lastSampleRef.current = now;
    redraw();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const now = performance.now();
    if (now - lastSampleRef.current < 8) return;
    lastSampleRef.current = now;
    const pos = getPos(e);
    const last = pointsRef.current[pointsRef.current.length - 1];
    if (!last || Math.hypot(pos.x - last.x, pos.y - last.y) >= 2) {
      pointsRef.current.push({ ...pos, time: now });
      redraw();
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try {
      (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    } catch {}
    const pts = pointsRef.current.slice();
    setTimeout(() => {
      pointsRef.current = [];
      redraw();
    }, 120);

    const rune = recognizeRune(pts);
    if (!rune) {
      showFeedback('符文识别失败，请重画', 'err');
      return;
    }
    const ok = applyRune(rune);
    if (ok) {
      const name = rune === 'growth' ? '生长符文' : rune === 'bloom' ? '开花符文' : '异变符文';
      showFeedback(`${name} ✦ 激活`, 'ok');
    }
  };

  const energyRatio = energy / maxEnergy;
  const dotColor = energyRatio > 0.6
    ? '#00ff00'
    : energyRatio > 0.3
      ? `rgb(${Math.floor(255 * (1 - energyRatio) * 2)}, ${Math.floor(255 * energyRatio * 2)}, 0)`
      : '#ff4444';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#0f3460',
        border: '2px solid #00ffcc',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0, 255, 204, 0.3)',
        }}
      >
        <div style={{ fontSize: 13, letterSpacing: 1, color: '#a0e8ff' }}>符文绘制区</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#fff',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {energy}
          </span>
          <span style={{ color: '#8ab4d6', fontSize: 12 }}>/{maxEnergy}</span>
          <span
            style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: dotColor,
              boxShadow: `0 0 8px ${dotColor}, 0 0 16px ${dotColor}`,
              animation: 'energyPulse 1.6s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      <div style={{ padding: '10px 16px 4px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { k: 'growth', label: '螺旋 = 生长', color: '#66bb6a' },
          { k: 'bloom', label: '波浪 = 开花', color: '#ff4081' },
          { k: 'mutation', label: '锯齿 = 异变', color: '#e040fb' },
        ].map(r => (
          <span
            key={r.k}
            style={{
              fontSize: 11,
              padding: '3px 8px',
              borderRadius: 10,
              background: 'rgba(0,0,0,0.25)',
              border: `1px solid ${r.color}55`,
              color: r.color,
              whiteSpace: 'nowrap',
            }}
          >
            {r.label}
          </span>
        ))}
      </div>

      <div
        style={{
          flex: 1,
          position: 'relative',
          padding: 8,
          minHeight: 0,
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            width: '100%',
            height: '100%',
            cursor: energy >= RUNE_COST ? 'crosshair' : 'not-allowed',
            touchAction: 'none',
            display: 'block',
            borderRadius: 6,
            background:
              'radial-gradient(circle at 50% 50%, rgba(0,255,204,0.04) 0%, rgba(15,52,96,0.9) 70%)',
          }}
        />
        {feedback && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 16,
              transform: 'translateX(-50%)',
              padding: '6px 14px',
              borderRadius: 16,
              background: feedback.type === 'ok'
                ? 'rgba(0, 255, 120, 0.18)'
                : 'rgba(255, 68, 68, 0.2)',
              border: `1px solid ${feedback.type === 'ok' ? '#00ff88' : '#ff6666'}`,
              color: feedback.type === 'ok' ? '#aaffcc' : '#ffaaaa',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 0.5,
              animation: `fadeSlide 0.35s ${ease}`,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {feedback.text}
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 11,
            color: 'rgba(160,200,230,0.5)',
            pointerEvents: 'none',
          }}
        >
          按住鼠标绘制符文 · 消耗 {RUNE_COST} 能量
        </div>
      </div>

      <style>{`
        @keyframes energyPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.35); opacity: 0.7; }
        }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translate(-50%, -8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
};

export default React.memo(RunePanel);
