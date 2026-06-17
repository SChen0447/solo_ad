import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef, useMemo } from 'react';
import { LineData, Point, canvasApi, LikeResult } from '../api/canvasApi';

export interface CanvasProps {
  toolColor: string;
  brushSize: number;
  remoteLines: LineData[];
  localLines: LineData[];
  onLocalLineComplete: (line: LineData) => void;
  onUndoRequest?: () => void;
  onRedoRequest?: () => void;
  isTimeTravel?: boolean;
  timeTravelLines?: LineData[];
}

export interface CanvasHandle {
  getLocalLinesForPublish: () => { points: Point[]; color: string; size: number }[];
  clearLocalLines: () => void;
  addRemoteLines: (lines: LineData[]) => void;
  focusLine: (lineId: string) => void;
}

interface LikeBubble {
  lineId: string;
  x: number;
  y: number;
  likes: number;
  liked: boolean;
}

interface FadeEntry {
  id: string;
  startTime: number;
  duration: number;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 10;
const DAMPING = 0.85;
const FADE_DURATION = 500;

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  { toolColor, brushSize, remoteLines, localLines, onLocalLineComplete, isTimeTravel, timeTravelLines },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dprRef = useRef(1);

  const viewRef = useRef({ x: 0, y: 0, scale: 1 });
  const targetViewRef = useRef({ x: 0, y: 0, scale: 1 });
  const velocityRef = useRef({ x: 0, y: 0 });

  const isPanningRef = useRef(false);
  const isDrawingRef = useRef(false);
  const lastPanStartRef = useRef({ x: 0, y: 0 });
  const currentStrokeRef = useRef<Point[]>([]);
  const lastDrawPointRef = useRef<Point | null>(null);
  const lastDrawTimeRef = useRef<number | null>(null);
  const renderFrameRef = useRef<number | null>(null);

  const remoteLinesRef = useRef<LineData[]>([]);
  const localLinesRef = useRef<LineData[]>([]);
  const timeTravelLinesRef = useRef<LineData[]>([]);
  const fadeEntriesRef = useRef<Map<string, FadeEntry>>(new Map());
  const pendingFadeIdsRef = useRef<Set<string>>(new Set());

  const [likeBubble, setLikeBubble] = useState<LikeBubble | null>(null);
  const likeBubbleRef = useRef<LikeBubble | null>(null);

  const pinchRef = useRef<{
    active: boolean;
    initialDistance: number;
    initialScale: number;
    midpoint: { x: number; y: number };
  }>({ active: false, initialDistance: 1, initialScale: 1, midpoint: { x: 0, y: 0 } });

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useImperativeHandle(ref, () => ({
    getLocalLinesForPublish: () => {
      return localLinesRef.current.map((l) => ({
        points: l.points,
        color: l.color,
        size: l.size,
      }));
    },
    clearLocalLines: () => {
      localLinesRef.current = [];
    },
    addRemoteLines: (lines: LineData[]) => {
      const existingIds = new Set(remoteLinesRef.current.map((l) => l.id));
      const newLines = lines.filter((l) => !existingIds.has(l.id));
      newLines.forEach((l) => {
        if (!fadeEntriesRef.current.has(l.id) && !pendingFadeIdsRef.current.has(l.id)) {
          pendingFadeIdsRef.current.add(l.id);
          fadeEntriesRef.current.set(l.id, {
            id: l.id, startTime: performance.now(), duration: FADE_DURATION });
        }
      });
      remoteLinesRef.current = [...remoteLinesRef.current, ...newLines];
    },
    focusLine: (lineId: string) => {
      const all = [...remoteLinesRef.current, ...localLinesRef.current];
      const line = all.find((l) => l.id === lineId);
      if (line && line.points.length > 0) {
        const p = line.points[Math.floor(line.points.length / 2)];
        targetViewRef.current.x = -p.x;
        targetViewRef.current.y = -p.y;
      }
    },
  }));

  useEffect(() => {
    remoteLinesRef.current = remoteLines;
    remoteLines.forEach((l) => {
      if (!fadeEntriesRef.current.has(l.id) && !pendingFadeIdsRef.current.has(l.id)) {
        pendingFadeIdsRef.current.add(l.id);
        fadeEntriesRef.current.set(l.id, { id: l.id, startTime: performance.now(), duration: FADE_DURATION });
      }
    });
  }, [remoteLines]);

  useEffect(() => {
    localLinesRef.current = localLines;
  }, [localLines]);

  useEffect(() => {
    timeTravelLinesRef.current = timeTravelLines || [];
  }, [timeTravelLines]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const v = viewRef.current;
    return {
      x: (sx - v.x) / v.scale,
      y: (sy - v.y) / v.scale,
    };
  }, []);

  const worldToScreen = useCallback((wx: number, wy: number) => {
    const v = viewRef.current;
    return {
      x: wx * v.scale + v.x,
      y: wy * v.scale + v.y,
    };
  }, []);

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const drawLineStrip = useCallback((
    ctx: CanvasRenderingContext2D,
    points: Point[],
    color: string,
    baseSize: number,
    globalAlpha = 1
  ) => {
    if (points.length < 2) {
      if (points.length === 1) {
        const p = points[0];
        const pressure = p.p ?? 0.85;
        const size = baseSize * (0.5 + pressure * 0.5);
        const alpha = 0.4 + pressure * 0.6;
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.globalAlpha = globalAlpha * alpha;
        ctx.arc(p.x, p.y, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const prevP = prev.p ?? 0.85;
      const currP = curr.p ?? 0.85;

      const prevSize = baseSize * (0.5 + prevP * 0.5);
      const currSize = baseSize * (0.5 + currP * 0.5);
      const avgSize = (prevSize + currSize) * 0.5;

      const prevAlpha = 0.35 + prevP * 0.65;
      const currAlpha = 0.35 + currP * 0.65;
      const avgAlpha = (prevAlpha + currAlpha) * 0.5;

      const steps = Math.max(1, Math.ceil(Math.hypot(curr.x - prev.x, curr.y - prev.y) / 0.8));
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const x = prev.x + (curr.x - prev.x) * t;
        const y = prev.y + (curr.y - prev.y) * t;
        const interpP = prevP + (currP - prevP) * t;
        const dotSize = baseSize * (0.5 + interpP * 0.5);
        const dotAlpha = (0.35 + interpP * 0.65) * globalAlpha;

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.globalAlpha = dotAlpha * 0.8;
        ctx.arc(x, y, dotSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = color;
      ctx.globalAlpha = globalAlpha * avgAlpha * 0.55;
      ctx.lineWidth = avgSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }
  }, []);

  const renderAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(1, '#f5f0e8');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const v = viewRef.current;
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.scale(v.scale, v.scale);

    const now = performance.now();
    const effectiveRemote = isTimeTravel ? timeTravelLinesRef.current : remoteLinesRef.current;
    const fadeMap = fadeEntriesRef.current;

    for (const line of effectiveRemote) {
      let alpha = 1;
      const fade = fadeMap.get(line.id);
      if (fade) {
        const elapsed = now - fade.startTime;
        if (elapsed < fade.duration) {
          alpha = Math.max(0, Math.min(1, elapsed / fade.duration));
        } else {
          fadeMap.delete(line.id);
          pendingFadeIdsRef.current.delete(line.id);
        }
      }
      drawLineStrip(ctx, line.points, line.color, line.size, alpha);
    }

    for (const line of localLinesRef.current) {
      drawLineStrip(ctx, line.points, line.color, line.size, 1);
    }

    if (isDrawingRef.current && currentStrokeRef.current.length > 0) {
      const pts = currentStrokeRef.current;
      drawLineStrip(ctx, pts, toolColor, brushSize, 1);
    }

    ctx.restore();

    ctx.globalAlpha = 1;
  }, [drawLineStrip, isTimeTravel, toolColor, brushSize]);

  const renderLoop = useCallback(() => {
    const tv = targetViewRef.current;
    const cv = viewRef.current;
    const vel = velocityRef.current;

    cv.x += vel.x;
    cv.y += vel.y;
    vel.x *= DAMPING;
    vel.y *= DAMPING;

    const dx = tv.x - cv.x;
    const dy = tv.y - cv.y;
    const ds = tv.scale - cv.scale;

    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
      cv.x += dx * (1 - DAMPING);
      cv.y += dy * (1 - DAMPING);
    } else {
      cv.x = tv.x;
      cv.y = tv.y;
    }

    if (Math.abs(ds) > 0.0001) {
      cv.scale += ds * (1 - DAMPING);
    } else {
      cv.scale = tv.scale;
    }

    renderAll();
    renderFrameRef.current = requestAnimationFrame(renderLoop);
  }, [renderAll]);

  useEffect(() => {
    renderFrameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (renderFrameRef.current) {
        cancelAnimationFrame(renderFrameRef.current);
      }
    };
  }, [renderLoop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      dprRef.current = window.devicePixelRatio || 1;
      const dpr = dprRef.current;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    window.addEventListener('resize', resize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  const hitTestLine = useCallback((worldX: number, worldY: number): LineData | null => {
    const allLines = [...localLinesRef.current, ...remoteLinesRef.current];
    const tolerance = 8 / viewRef.current.scale;
    let best: LineData | null = null;
    let bestDist = Infinity;

    for (const line of allLines) {
      for (let i = 1; i < line.points.length; i++) {
        const a = line.points[i - 1];
        const b = line.points[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len2 = dx * dx + dy * dy;
        let t = 0;
        if (len2 > 0) {
          t = ((worldX - a.x) * dx + (worldY - a.y) * dy) / len2;
          t = Math.max(0, Math.min(1, t));
        }
        const px = a.x + t * dx;
        const py = a.y + t * dy;
        const d = Math.hypot(px - worldX, py - worldY);
        const effective = tolerance + line.size * 0.5;
        if (d < effective && d < bestDist) {
          bestDist = d;
          best = line;
        }
      }
      if (line.points.length === 1) {
        const p = line.points[0];
        const d = Math.hypot(p.x - worldX, p.y - worldY);
        if (d < tolerance && d < bestDist) {
          bestDist = d;
          best = line;
        }
      }
    }
    return best;
  }, []);

  const performLike = useCallback(async (line: LineData, sx: number, sy: number) => {
    const existing = likeBubbleRef.current;
    const alreadyLiked = !!(existing && existing.lineId === line.id && existing.liked);
    try {
      let result: LikeResult;
      try {
        result = await canvasApi.likeLine(line.id);
      } catch {
        result = { success: true, liked: !alreadyLiked, likes: Math.max(0, line.likes + (!alreadyLiked ? 1 : -1)) } as LikeResult;
      }
      const remoteIndex = remoteLinesRef.current.findIndex((l) => l.id === line.id);
      if (remoteIndex >= 0) {
        remoteLinesRef.current[remoteIndex] = { ...remoteLinesRef.current[remoteIndex], likes: result.likes };
      }
      const localIndex = localLinesRef.current.findIndex((l) => l.id === line.id);
      if (localIndex >= 0) {
        localLinesRef.current[localIndex] = { ...localLinesRef.current[localIndex], likes: result.likes };
      }
      setLikeBubble({
        lineId: line.id,
        x: sx,
        y: sy,
        likes: result.likes,
        liked: result.liked,
      });
      likeBubbleRef.current = {
        lineId: line.id,
        x: sx,
        y: sy,
        likes: result.likes,
        liked: result.liked,
      };
      setTimeout(() => {
        setLikeBubble(null);
        likeBubbleRef.current = null;
      }, 2500);
    } catch (e) {
      console.error('点赞失败', e);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const worldBefore = screenToWorld(mx, my);
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      targetViewRef.current.scale = clampScale(targetViewRef.current.scale * factor);
      const worldAfter = screenToWorld(mx, my);
      targetViewRef.current.x += (worldAfter.x - worldBefore.x) * targetViewRef.current.scale;
      targetViewRef.current.y += (worldAfter.y - worldBefore.y) * targetViewRef.current.scale;
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [screenToWorld]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 && e.button !== 1) return;
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (e.shiftKey || e.button === 1) {
        isPanningRef.current = true;
        isDrawingRef.current = false;
        lastPanStartRef.current = { x: e.clientX, y: e.clientY };
        velocityRef.current = { x: 0, y: 0 };
        return;
      }

      const hit = hitTestLine(sx, sy);
      if (hit && e.altKey) {
        performLike(hit, sx, sy);
        return;
      }

      const world = screenToWorld(sx, sy);
      isDrawingRef.current = true;
      isPanningRef.current = false;
      currentStrokeRef.current = [{ x: world.x, y: world.y, p: 0.95 }];
      lastDrawPointRef.current = { x: world.x, y: world.y, p: 0.95 };
      lastDrawTimeRef.current = performance.now();
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      if (isPanningRef.current) {
        const dx = e.clientX - lastPanStartRef.current.x;
        const dy = e.clientY - lastPanStartRef.current.y;
        velocityRef.current.x = dx * 0.2;
        velocityRef.current.y = dy * 0.2;
        targetViewRef.current.x += dx;
        targetViewRef.current.y += dy;
        lastPanStartRef.current = { x: e.clientX, y: e.clientY };
        return;
      }

      if (isDrawingRef.current) {
        const world = screenToWorld(sx, sy);
        const last = lastDrawPointRef.current;
        const now = performance.now();
        if (last && Math.hypot(last.x - world.x, last.y - world.y) > 0.4) {
          const dist = Math.hypot(last.x - world.x, last.y - world.y);
          const dt = lastDrawTimeRef.current ? (now - lastDrawTimeRef.current) : 16;
          const speed = dist / Math.max(1, dt) * 16;
          const rawPressure = 1 - Math.min(Math.max(0, (speed - 0.5) / 20), 1);
          const smoothedPressure = last.p !== undefined
            ? last.p * 0.65 + rawPressure * 0.35
            : rawPressure;
          const finalPressure = Math.max(0.25, Math.min(1, smoothedPressure));

          currentStrokeRef.current.push({ x: world.x, y: world.y, p: finalPressure });
          lastDrawPointRef.current = { x: world.x, y: world.y, p: finalPressure };
          lastDrawTimeRef.current = now;
        }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        return;
      }

      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        const stroke = currentStrokeRef.current;
        if (stroke.length >= 1) {
          const world0 = stroke[0];
          let lastDraw = lastDrawPointRef.current;
          if (stroke.length === 1 && lastDraw) {
            stroke.push({ x: world0.x + 0.1, y: world0.y + 0.1, p: world0.p ?? 0.9 });
          }
          const newLine: LineData = {
            id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            points: stroke,
            color: toolColor,
            size: brushSize,
            author: '',
            timestamp: Date.now() / 1000,
            likes: 0,
          };
          onLocalLineComplete(newLine);
        }
        currentStrokeRef.current = [];
        lastDrawPointRef.current = null;
      }
    };

    const onMouseLeave = () => {
      if (isDrawingRef.current) {
        onMouseUp(new MouseEvent('mouseup'));
      }
      isPanningRef.current = false;
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mouseleave', onMouseLeave);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [screenToWorld, hitTestLine, performLike, toolColor, brushSize, onLocalLineComplete]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const getTouchPoint = (t: Touch) => {
      const rect = el.getBoundingClientRect();
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    };

    const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y);

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const t0 = getTouchPoint(e.touches[0]);
        const t1 = getTouchPoint(e.touches[1]);
        pinchRef.current = {
          active: true,
          initialDistance: distance(t0, t1),
          initialScale: targetViewRef.current.scale,
          midpoint: { x: (t0.x + t1.x) / 2, y: (t0.y + t1.y) / 2 },
        };
        isDrawingRef.current = false;
        isPanningRef.current = false;
        return;
      }

      if (e.touches.length === 1) {
        const t = e.touches[0];
        const sp = getTouchPoint(t);
        touchStartRef.current = { x: sp.x, y: sp.y, time: Date.now() };

        const hit = hitTestLine(sp.x, sp.y);
        if (hit) {
          performLike(hit, sp.x, sp.y);
          return;
        }

        const world = screenToWorld(sp.x, sp.y);
        isDrawingRef.current = true;
        currentStrokeRef.current = [{ x: world.x, y: world.y, p: 0.9 }];
        lastDrawPointRef.current = { x: world.x, y: world.y, p: 0.9 };
        lastDrawTimeRef.current = performance.now();
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();

      if (pinchRef.current.active && e.touches.length === 2) {
        const t0 = getTouchPoint(e.touches[0]);
        const t1 = getTouchPoint(e.touches[1]);
        const d = distance(t0, t1);
        const ratio = d / pinchRef.current.initialDistance;
        const newScale = clampScale(pinchRef.current.initialScale * ratio);

        const mp = { x: (t0.x + t1.x) / 2, y: (t0.y + t1.y) / 2 };
        const worldBefore = screenToWorld(pinchRef.current.midpoint.x, pinchRef.current.midpoint.y);
        targetViewRef.current.scale = newScale;
        const worldAfter = screenToWorld(pinchRef.current.midpoint.x, pinchRef.current.midpoint.y);
        targetViewRef.current.x += (worldAfter.x - worldBefore.x) * newScale;
        targetViewRef.current.y += (worldAfter.y - worldBefore.y) * newScale;
        targetViewRef.current.x += (mp.x - pinchRef.current.midpoint.x);
        targetViewRef.current.y += (mp.y - pinchRef.current.midpoint.y);
        return;
      }

      if (isDrawingRef.current && e.touches.length === 1) {
        const t = e.touches[0];
        const sp = getTouchPoint(t);
        const world = screenToWorld(sp.x, sp.y);
        const last = lastDrawPointRef.current;
        const now = performance.now();
        if (last && Math.hypot(last.x - world.x, last.y - world.y) > 0.4) {
          const dist = Math.hypot(last.x - world.x, last.y - world.y);
          const dt = lastDrawTimeRef.current ? (now - lastDrawTimeRef.current) : 16;
          const speed = dist / Math.max(1, dt) * 16;
          const rawPressure = 1 - Math.min(Math.max(0, (speed - 0.5) / 20), 1);
          const smoothedPressure = last.p !== undefined
            ? last.p * 0.65 + rawPressure * 0.35
            : rawPressure;
          const finalPressure = Math.max(0.25, Math.min(1, smoothedPressure));

          currentStrokeRef.current.push({ x: world.x, y: world.y, p: finalPressure });
          lastDrawPointRef.current = { x: world.x, y: world.y, p: finalPressure };
          lastDrawTimeRef.current = now;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchRef.current.active = false;
      }

      if (isDrawingRef.current && e.touches.length === 0) {
        isDrawingRef.current = false;
        const stroke = currentStrokeRef.current;
        if (stroke.length >= 1) {
          if (stroke.length === 1) {
            const w0 = stroke[0];
            stroke.push({ x: w0.x + 0.1, y: w0.y + 0.1, p: w0.p ?? 0.9 });
          }
          const newLine: LineData = {
            id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            points: stroke,
            color: toolColor,
            size: brushSize,
            author: '',
            timestamp: Date.now() / 1000,
            likes: 0,
          };
          onLocalLineComplete(newLine);
        }
        currentStrokeRef.current = [];
        lastDrawPointRef.current = null;
      }
      touchStartRef.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    el.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchEnd);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [screenToWorld, hitTestLine, performLike, toolColor, brushSize, onLocalLineComplete]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        cursor: isPanningRef.current ? 'grabbing' : 'crosshair',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />

      {likeBubble && (
        <div
          style={{
            position: 'absolute',
            left: likeBubble.x,
            top: likeBubble.y - 48,
            transform: 'translateX(-50%)',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(139, 90, 43, 0.2)',
            borderRadius: '20px',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            animation: 'likeBubbleIn 0.25s ease-out',
            pointerEvents: 'none',
            zIndex: 100,
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={likeBubble.liked ? '#e74c3c' : 'none'}
            stroke={likeBubble.liked ? '#e74c3c' : '#666'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              animation: likeBubble.liked ? 'heartPop 0.35s ease-out' : undefined,
            }}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span style={{ fontWeight: 600, color: '#333', fontSize: '14px' }}>{likeBubble.likes}</span>
        </div>
      )}

      <style>{`
        @keyframes likeBubbleIn {
          from { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.9); }
          to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes heartPop {
          0% { transform: scale(1); }
          30% { transform: scale(1.35); }
          60% { transform: scale(0.92); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
});

export default Canvas;
