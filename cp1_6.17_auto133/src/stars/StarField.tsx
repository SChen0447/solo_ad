import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Star, Constellation, CustomLine, StarProjected, ViewState, Season } from '../utils/types';

interface StarFieldProps {
  stars: Star[];
  constellations: Constellation[];
  customLines: CustomLine[];
  selectedDate: Date;
  viewState: ViewState;
  onViewChange: (view: ViewState) => void;
  onStarClick: (star: Star | null) => void;
  onStarHover: (star: Star | null) => void;
  onAddCustomLine: (fromId: string, toId: string, name: string) => void;
  lineEditingMode: boolean;
  onExitLineMode: () => void;
}

const SEASON_COLORS: Record<Season, { start: string; end: string }> = {
  spring: { start: '#ff9ec4', end: '#ff6fa3' },
  summer: { start: '#ffd66b', end: '#ff9f43' },
  autumn: { start: '#8cc8ff', end: '#6bb3ff' },
  winter: { start: '#e8e8f0', end: '#c0c0d0' },
};

function getSeasonFromDate(date: Date): Season {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

function rgbStr(r: number, g: number, b: number, a: number = 1): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function projectStars(
  stars: Star[],
  view: ViewState,
  date: Date,
  width: number,
  height: number,
  dateOffset: number
): StarProjected[] {
  const cx = width / 2;
  const cy = height / 2;
  const rad = Math.PI / 180;

  const rotX = view.rotationX * rad;
  const rotY = view.rotationY * rad;
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);

  const focalLength = 500 * view.zoom;
  const sphereR = Math.min(width, height) * 0.42;

  return stars.map((s) => {
    const raRad = (s.ra + dateOffset) * rad;
    const decRad = s.dec * rad;

    let x = Math.cos(decRad) * Math.sin(raRad);
    let y = Math.sin(decRad);
    let z = Math.cos(decRad) * Math.cos(raRad);

    let y1 = y * cosX - z * sinX;
    let z1 = y * sinX + z * cosX;
    let x1 = x * cosY + z1 * sinY;
    let z2 = -x * sinY + z1 * cosY;

    const visible = z2 > -0.15;

    const scale = focalLength / (focalLength + z2 * sphereR);
    const screenX = cx + x1 * sphereR * scale;
    const screenY = cy - y1 * sphereR * scale;

    const minMag = -1;
    const maxMag = 7;
    const normMag = Math.max(0, Math.min(1, (maxMag - s.magnitude) / (maxMag - minMag)));
    const baseSize = 0.6 + normMag * 4.5;
    const size = baseSize * Math.max(0.3, view.zoom);
    const alpha = 0.25 + normMag * 0.75;

    return {
      ...s,
      x: x1,
      y: y1,
      z: z2,
      screenX,
      screenY,
      size,
      alpha,
      visible,
    };
  });
}

export const StarField: React.FC<StarFieldProps> = ({
  stars,
  constellations,
  customLines,
  selectedDate,
  viewState,
  onViewChange,
  onStarClick,
  onStarHover,
  onAddCustomLine,
  lineEditingMode,
  onExitLineMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const projectedStarsRef = useRef<StarProjected[]>([]);
  const animationRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);
  const draggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoveredStar, setHoveredStar] = useState<StarProjected | null>(null);
  const [clickedStar, setClickedStar] = useState<Star | null>(null);
  const [lineStartStar, setLineStartStar] = useState<StarProjected | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [animatingStars, setAnimatingStars] = useState(false);
  const [dateAnimProgress, setDateAnimProgress] = useState(1);
  const animStartRef = useRef<{ prevOffset: number; newOffset: number; startTime: number } | null>(null);
  const newLineInputRef = useRef<{ midX: number; midY: number; fromId: string; toId: string } | null>(null);
  const [pendingLineInput, setPendingLineInput] = useState<{ midX: number; midY: number; fromId: string; toId: string } | null>(null);
  const inputValueRef = useRef('');
  const inputRef = useRef<HTMLInputElement>(null);

  const dayOfYear = useCallback((d: Date) => {
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d.getTime() - start.getTime();
    return Math.floor(diff / 86400000);
  }, []);

  const getDateOffset = useCallback((d: Date) => {
    return (dayOfYear(d) / 365) * 360 - 180;
  }, [dayOfYear]);

  useEffect(() => {
    const oldOffset = animStartRef.current ? animStartRef.current.newOffset : getDateOffset(new Date(selectedDate.getFullYear(), 0, 1));
    const newOffset = getDateOffset(selectedDate);
    animStartRef.current = {
      prevOffset: dateAnimProgress < 1 ? lerp(animStartRef.current!.prevOffset, animStartRef.current!.newOffset, dateAnimProgress) : oldOffset,
      newOffset,
      startTime: performance.now(),
    };
    setAnimatingStars(true);
    setDateAnimProgress(0);
    const duration = 2000;
    const startTime = performance.now();
    const tick = () => {
      const now = performance.now();
      const t = Math.min(1, (now - startTime) / duration);
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setDateAnimProgress(easeT);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        setAnimatingStars(false);
      }
    };
    requestAnimationFrame(tick);
  }, [selectedDate, getDateOffset]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setSize({ width: clientWidth, height: clientHeight });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const season = getSeasonFromDate(selectedDate);
  const seasonColors = SEASON_COLORS[season];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = size.width + 'px';
    canvas.style.height = size.height + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let rafId = 0;

    const render = (now: number) => {
      const dt = now - lastFrameRef.current;
      lastFrameRef.current = now;
      void dt;

      let currentOffset: number;
      if (animatingStars && animStartRef.current) {
        currentOffset = lerp(animStartRef.current.prevOffset, animStartRef.current.newOffset, dateAnimProgress);
      } else {
        currentOffset = getDateOffset(selectedDate);
      }

      const projected = projectStars(stars, viewState, selectedDate, size.width, size.height, currentOffset);
      projectedStarsRef.current = projected;

      const bg = ctx.createLinearGradient(0, 0, 0, size.height);
      bg.addColorStop(0, '#0b0e2a');
      bg.addColorStop(1, '#1a2040');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size.width, size.height);

      const nebulaGrad1 = ctx.createRadialGradient(size.width * 0.2, size.height * 0.3, 0, size.width * 0.2, size.height * 0.3, size.width * 0.4);
      nebulaGrad1.addColorStop(0, 'rgba(100, 120, 200, 0.06)');
      nebulaGrad1.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = nebulaGrad1;
      ctx.fillRect(0, 0, size.width, size.height);

      const nebulaGrad2 = ctx.createRadialGradient(size.width * 0.8, size.height * 0.7, 0, size.width * 0.8, size.height * 0.7, size.width * 0.5);
      nebulaGrad2.addColorStop(0, 'rgba(180, 100, 160, 0.05)');
      nebulaGrad2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = nebulaGrad2;
      ctx.fillRect(0, 0, size.width, size.height);

      const starMap = new Map<string, StarProjected>();
      projected.forEach((p) => starMap.set(p.id, p));

      const constellationCenters: Map<string, { x: number; y: number; count: number; constellation: Constellation; visible: boolean }> = new Map();
      constellations.forEach((c) => {
        let sx = 0, sy = 0, count = 0, vis = false;
        c.starIds.forEach((sid) => {
          const st = starMap.get(sid);
          if (st && st.visible) {
            sx += st.screenX;
            sy += st.screenY;
            count++;
            vis = true;
          }
        });
        if (count > 0) {
          constellationCenters.set(c.id, { x: sx / count, y: sy / count, count, constellation: c, visible: vis });
        }
      });

      constellationCenters.forEach(({ constellation: c }) => {
        const cStart = hexToRgb(seasonColors.start);
        const cEnd = hexToRgb(seasonColors.end);

        c.lines.forEach((line) => {
          const a = starMap.get(line.from);
          const b = starMap.get(line.to);
          if (a && b && a.visible && b.visible) {
            const grad = ctx.createLinearGradient(a.screenX, a.screenY, b.screenX, b.screenY);
            grad.addColorStop(0, rgbStr(cStart[0], cStart[1], cStart[2], 0.55));
            grad.addColorStop(1, rgbStr(cEnd[0], cEnd[1], cEnd[2], 0.55));
            ctx.strokeStyle = grad;
            ctx.lineWidth = Math.max(0.8, 1.4 * viewState.zoom);
            ctx.shadowColor = rgbStr(cStart[0], cStart[1], cStart[2], 0.8);
            ctx.shadowBlur = 6 * viewState.zoom;
            ctx.beginPath();
            ctx.moveTo(a.screenX, a.screenY);
            ctx.lineTo(b.screenX, b.screenY);
            ctx.stroke();
          }
        });
        ctx.shadowBlur = 0;
      });

      customLines.forEach((cl) => {
        const a = starMap.get(cl.fromStarId);
        const b = starMap.get(cl.toStarId);
        if (a && b && a.visible && b.visible) {
          ctx.strokeStyle = 'rgba(255,255,255,0.75)';
          ctx.lineWidth = Math.max(1, 2 * viewState.zoom);
          ctx.setLineDash([4 * viewState.zoom, 4 * viewState.zoom]);
          ctx.beginPath();
          ctx.moveTo(a.screenX, a.screenY);
          ctx.lineTo(b.screenX, b.screenY);
          ctx.stroke();
          ctx.setLineDash([]);

          const midX = (a.screenX + b.screenX) / 2;
          const midY = (a.screenY + b.screenY) / 2;
          if (pendingLineInput && pendingLineInput.fromId === cl.fromStarId && pendingLineInput.toId === cl.toStarId) {
          } else {
            ctx.font = '300 12px "Noto Serif SC", serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const pad = 6;
            const tw = ctx.measureText(cl.name).width;
            ctx.fillStyle = 'rgba(15, 18, 48, 0.7)';
            ctx.fillRect(midX - tw / 2 - pad, midY - 8, tw + pad * 2, 16);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(midX - tw / 2 - pad, midY - 8, tw + pad * 2, 16);
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fillText(cl.name, midX, midY + 1);
          }
        }
      });

      if (lineEditingMode && lineStartStar && mousePos) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(lineStartStar.screenX, lineStartStar.screenY);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      projected.forEach((p) => {
        if (!p.visible) return;

        if (p.size > 1.8) {
          const glowR = p.size * 3;
          const col = hexToRgb(p.color || '#ffffff');
          const gg = ctx.createRadialGradient(p.screenX, p.screenY, 0, p.screenX, p.screenY, glowR);
          gg.addColorStop(0, rgbStr(col[0], col[1], col[2], 0.35 * p.alpha));
          gg.addColorStop(1, rgbStr(col[0], col[1], col[2], 0));
          ctx.fillStyle = gg;
          ctx.beginPath();
          ctx.arc(p.screenX, p.screenY, glowR, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = p.color || '#ffffff';
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.screenX, p.screenY, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (p.size > 2.5) {
          ctx.strokeStyle = p.color || '#ffffff';
          ctx.globalAlpha = p.alpha * 0.35;
          ctx.lineWidth = 0.6;
          const sp = p.size * 4;
          ctx.beginPath();
          ctx.moveTo(p.screenX - sp, p.screenY);
          ctx.lineTo(p.screenX + sp, p.screenY);
          ctx.moveTo(p.screenX, p.screenY - sp);
          ctx.lineTo(p.screenX, p.screenY + sp);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      });

      if (hoveredStar && hoveredStar.visible) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(hoveredStar.screenX, hoveredStar.screenY, hoveredStar.size + 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (lineStartStar && lineStartStar.visible) {
        ctx.strokeStyle = 'rgba(255,220,120,0.95)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(lineStartStar.screenX, lineStartStar.screenY, lineStartStar.size + 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      constellationCenters.forEach(({ x, y, constellation: c, visible: vis }) => {
        if (!vis) return;
        if (dateAnimProgress < 1) {
          ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(now * 0.003 + c.id.charCodeAt(0)));
        }
        ctx.font = '400 13px "Cinzel", "Noto Serif SC", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const labelY = y - 18;
        const name = c.name;
        const en = c.englishName;
        const enFont = '400 10px "Cinzel", serif';
        const tw1 = ctx.measureText(name).width;
        ctx.font = enFont;
        const tw2 = ctx.measureText(en).width;
        const maxW = Math.max(tw1, tw2);
        const padX = 8;
        const padY = 4;
        const bx = x - maxW / 2 - padX;
        const by = labelY - 22;
        const bw = maxW + padX * 2;
        const bh = 22;
        ctx.fillStyle = 'rgba(11, 14, 42, 0.55)';
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 0.5;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.font = '400 13px "Cinzel", "Noto Serif SC", serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(name, x, labelY - 10);
        ctx.font = enFont;
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText(en, x, labelY);
        ctx.globalAlpha = 1;
      });

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    animationRef.current = rafId;
    return () => cancelAnimationFrame(rafId);
  }, [stars, constellations, customLines, viewState, size, season, seasonColors, animatingStars, dateAnimProgress, selectedDate, hoveredStar, lineEditingMode, lineStartStar, mousePos, pendingLineInput, getDateOffset]);

  const findStarAt = useCallback((mx: number, my: number): StarProjected | null => {
    const projected = projectedStarsRef.current;
    let found: StarProjected | null = null;
    let bestDist = Infinity;
    for (const p of projected) {
      if (!p.visible) continue;
      if (p.id.startsWith('bg-')) continue;
      const dx = p.screenX - mx;
      const dy = p.screenY - my;
      const d = Math.sqrt(dx * dx + dy * dy);
      const hitR = Math.max(p.size + 4, 10);
      if (d < hitR && d < bestDist) {
        bestDist = d;
        found = p;
      }
    }
    return found;
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (lineEditingMode) return;
    if (pendingLineInput) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const s = findStarAt(mx, my);
    if (s) return;
    draggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY, rx: viewState.rotationX, ry: viewState.rotationY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setMousePos({ x: mx, y: my });

    if (draggingRef.current && dragStartRef.current && !lineEditingMode) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      onViewChange({
        ...viewState,
        rotationY: dragStartRef.current.ry + dx * 0.25,
        rotationX: Math.max(-80, Math.min(80, dragStartRef.current.rx + dy * 0.25)),
      });
      return;
    }

    const s = findStarAt(mx, my);
    setHoveredStar(s);
    onStarHover(s);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = s || lineEditingMode ? 'pointer' : draggingRef.current ? 'grabbing' : 'grab';
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (lineEditingMode && !pendingLineInput) {
      const s = findStarAt(mx, my);
      if (s) {
        if (!lineStartStar) {
          setLineStartStar(s);
        } else if (lineStartStar.id !== s.id) {
          const fromId = lineStartStar.id;
          const toId = s.id;
          const midX = (lineStartStar.screenX + s.screenX) / 2;
          const midY = (lineStartStar.screenY + s.screenY) / 2;
          newLineInputRef.current = { midX, midY, fromId, toId };
          setPendingLineInput({ midX, midY, fromId, toId });
          inputValueRef.current = '';
          setLineStartStar(null);
          setTimeout(() => {
            if (inputRef.current) inputRef.current.focus();
          }, 0);
        } else {
          setLineStartStar(null);
        }
      }
      draggingRef.current = false;
      dragStartRef.current = null;
      return;
    }

    if (draggingRef.current && dragStartRef.current) {
      const dragDx = Math.abs(e.clientX - dragStartRef.current.x);
      const dragDy = Math.abs(e.clientY - dragStartRef.current.y);
      if (dragDx < 3 && dragDy < 3) {
        const s = findStarAt(mx, my);
        setClickedStar(s);
        onStarClick(s);
      }
    } else if (!draggingRef.current) {
      const s = findStarAt(mx, my);
      setClickedStar(s);
      onStarClick(s);
    }

    draggingRef.current = false;
    dragStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const newZoom = Math.max(0.4, Math.min(3.5, viewState.zoom * (1 + delta)));
    onViewChange({ ...viewState, zoom: newZoom });
  };

  const submitNewLine = () => {
    if (pendingLineInput) {
      const name = inputValueRef.current.trim() || '自定义连线';
      onAddCustomLine(pendingLineInput.fromId, pendingLineInput.toId, name);
      setPendingLineInput(null);
      newLineInputRef.current = null;
    }
  };

  const cancelNewLine = () => {
    setPendingLineInput(null);
    newLineInputRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      id="starfield-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: lineEditingMode ? 'crosshair' : 'grab',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        draggingRef.current = false;
        dragStartRef.current = null;
        setHoveredStar(null);
        setMousePos(null);
      }}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} />

      {clickedStar && !lineEditingMode && !pendingLineInput && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(Math.max(10, (projectedStarsRef.current.find(p => p.id === clickedStar.id)?.screenX || 0) + 18), size.width - 240),
            top: Math.min(Math.max(10, (projectedStarsRef.current.find(p => p.id === clickedStar.id)?.screenY || 0) - 40), size.height - 180),
            width: 220,
            padding: '14px 16px',
            background: 'rgba(20, 24, 60, 0.65)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            color: '#fff',
            fontFamily: '"Noto Serif SC", serif',
            fontSize: 13,
            lineHeight: 1.7,
            pointerEvents: 'auto',
            zIndex: 10,
          }}
        >
          <div style={{
            fontFamily: '"Cinzel", "Noto Serif SC", serif',
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 2,
            color: clickedStar.color || '#fff',
          }}>
            {clickedStar.name}
          </div>
          {clickedStar.englishName && (
            <div style={{ fontFamily: '"Cinzel", serif', fontSize: 11, opacity: 0.6, marginBottom: 10, letterSpacing: 1 }}>
              {clickedStar.englishName.toUpperCase()}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
            <span style={{ opacity: 0.55 }}>视星等</span>
            <span>{clickedStar.magnitude.toFixed(2)} mag</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ opacity: 0.55 }}>距离</span>
            <span>{clickedStar.distance} 光年</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ opacity: 0.55 }}>光谱型</span>
            <span>{clickedStar.spectralType}</span>
          </div>
          <button
            onClick={() => { setClickedStar(null); onStarClick(null); }}
            style={{
              position: 'absolute',
              top: 8,
              right: 10,
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 16,
              cursor: 'pointer',
              padding: '2px 6px',
            }}
          >×</button>
        </div>
      )}

      {lineEditingMode && !pendingLineInput && (
        <div style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 18px',
          background: 'rgba(255, 200, 80, 0.15)',
          border: '1px solid rgba(255, 220, 120, 0.5)',
          borderRadius: 20,
          color: '#ffdd88',
          fontFamily: '"Noto Serif SC", serif',
          fontSize: 13,
          pointerEvents: 'none',
        }}>
          {lineStartStar ? `再点击一颗恒星完成连线（${lineStartStar.name} → ?）` : '请点击一颗恒星作为连线起点'}
        </div>
      )}

      {lineEditingMode && !lineStartStar && !pendingLineInput && (
        <button onClick={onExitLineMode} style={{
          position: 'absolute',
          top: 16,
          right: 16,
          padding: '6px 14px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 16,
          color: 'rgba(255,255,255,0.8)',
          cursor: 'pointer',
          fontFamily: '"Noto Serif SC", serif',
          fontSize: 12,
        }}>
          取消模式
        </button>
      )}

      {pendingLineInput && (
        <div
          style={{
            position: 'absolute',
            left: pendingLineInput.midX - 110,
            top: pendingLineInput.midY + 12,
            width: 220,
            padding: 10,
            background: 'rgba(20, 24, 60, 0.85)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,220,120,0.5)',
            borderRadius: 8,
            zIndex: 20,
          }}
        >
          <div style={{ color: '#ffdd88', fontSize: 11, fontFamily: '"Noto Serif SC", serif', marginBottom: 6 }}>
            请输入连线名称：
          </div>
          <form onSubmit={(e) => { e.preventDefault(); submitNewLine(); }}>
            <input
              ref={inputRef}
              type="text"
              defaultValue=""
              onChange={(e) => { inputValueRef.current = e.target.value; }}
              placeholder="例如：我的猎户腰带"
              style={{
                width: '100%',
                padding: '6px 8px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 4,
                color: '#fff',
                fontFamily: '"Noto Serif SC", serif',
                fontSize: 12,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button type="submit" style={{
                flex: 1,
                padding: '5px 0',
                background: 'rgba(255, 200, 80, 0.3)',
                border: '1px solid rgba(255, 220, 120, 0.6)',
                borderRadius: 4,
                color: '#ffdd88',
                cursor: 'pointer',
                fontFamily: '"Noto Serif SC", serif',
                fontSize: 12,
              }}>确定</button>
              <button type="button" onClick={cancelNewLine} style={{
                flex: 1,
                padding: '5px 0',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 4,
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                fontFamily: '"Noto Serif SC", serif',
                fontSize: 12,
              }}>取消</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
