import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from './store';
import { TAG_COLORS } from './types';
import type { Inspiration, Connection } from './types';

interface BubbleState {
  id: string;
  opacity: number;
  targetOpacity: number;
  scale: number;
  targetScale: number;
}

function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    inspirations,
    connections,
    selectedTags,
    connectingFromId,
    openModal,
    addConnection,
    deleteConnection,
    updateInspiration,
    startConnecting,
    cancelConnecting
  } = useStore();

  const viewportRef = useRef({ x: 0, y: 0, scale: 1 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const draggingBubbleRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const hoveredBubbleRef = useRef<string | null>(null);
  const mouseWorldRef = useRef({ x: 0, y: 0 });
  const bubbleStatesRef = useRef<Map<string, BubbleState>>(new Map());
  const animFrameRef = useRef<number>(0);
  const pulseTimeRef = useRef(0);
  const lastFrameRef = useRef(performance.now());

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    inspirationId: string;
  } | null>(null);

  const getBubbleRadius = (content: string) => {
    const len = Math.min(content.length, 100);
    return 10 + (len / 100) * 50;
  };

  const ensureBubbleState = (id: string) => {
    if (!bubbleStatesRef.current.has(id)) {
      bubbleStatesRef.current.set(id, {
        id,
        opacity: 0,
        targetOpacity: 1,
        scale: 0.8,
        targetScale: 1
      });
    }
    return bubbleStatesRef.current.get(id)!;
  };

  const worldToScreen = (wx: number, wy: number) => {
    const v = viewportRef.current;
    return {
      x: (wx - v.x) * v.scale + (canvasRef.current?.width || 0) / 2,
      y: (wy - v.y) * v.scale + (canvasRef.current?.height || 0) / 2
    };
  };

  const screenToWorld = (sx: number, sy: number) => {
    const v = viewportRef.current;
    return {
      x: (sx - (canvasRef.current?.width || 0) / 2) / v.scale + v.x,
      y: (sy - (canvasRef.current?.height || 0) / 2) / v.scale + v.y
    };
  };

  const isInViewport = (wx: number, wy: number, r: number) => {
    const s = worldToScreen(wx, wy);
    const cw = canvasRef.current?.width || 0;
    const ch = canvasRef.current?.height || 0;
    const pad = r * viewportRef.current.scale + 50;
    return s.x > -pad && s.x < cw + pad && s.y > -pad && s.y < ch + pad;
  };

  const hexToRgb = (hex: string) => {
    const m = hex.replace('#', '');
    return {
      r: parseInt(m.substring(0, 2), 16),
      g: parseInt(m.substring(2, 4), 16),
      b: parseInt(m.substring(4, 6), 16)
    };
  };

  const mixColors = (c1: string, c2: string, t: number) => {
    const a = hexToRgb(c1);
    const b = hexToRgb(c2);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bv = Math.round(a.b + (b.b - a.b) * t);
    return `rgb(${r},${g},${bv})`;
  };

  const hitTestBubble = (wx: number, wy: number): Inspiration | null => {
    for (let i = inspirations.length - 1; i >= 0; i--) {
      const insp = inspirations[i];
      const r = getBubbleRadius(insp.content);
      const dx = wx - insp.x;
      const dy = wy - insp.y;
      if (dx * dx + dy * dy <= r * r) {
        return insp;
      }
    }
    return null;
  };

  const hitTestConnection = (
    wx: number,
    wy: number,
    conn: Connection
  ): boolean => {
    const from = inspirations.find((i) => i.id === conn.from);
    const to = inspirations.find((i) => i.id === conn.to);
    if (!from || !to) return false;

    const r1 = getBubbleRadius(from.content);
    const r2 = getBubbleRadius(to.content);

    const cx1 = from.x;
    const cy1 = from.y;
    const cx2 = to.x;
    const cy2 = to.y;

    const dx = cx2 - cx1;
    const dy = cy2 - cy1;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    const startX = cx1 + nx * r1;
    const startY = cy1 + ny * r1;
    const endX = cx2 - nx * r2;
    const endY = cy2 - ny * r2;

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const ctrl1X = startX + (midX - startX) * 0.5 + ny * 30;
    const ctrl1Y = startY + (midY - startY) * 0.5 - nx * 30;
    const ctrl2X = midX + (endX - midX) * 0.5 + ny * 30;
    const ctrl2Y = midY + (endY - midY) * 0.5 - nx * 30;

    for (let t = 0; t <= 1; t += 0.02) {
      const mt = 1 - t;
      const px =
        mt * mt * mt * startX +
        3 * mt * mt * t * ctrl1X +
        3 * mt * t * t * ctrl2X +
        t * t * t * endX;
      const py =
        mt * mt * mt * startY +
        3 * mt * mt * t * ctrl1Y +
        3 * mt * t * t * ctrl2Y +
        t * t * t * endY;
      const ddx = wx - px;
      const ddy = wy - py;
      if (ddx * ddx + ddy * ddy <= 100) return true;
    }
    return false;
  };

  const drawBackground = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.6, '#16213e');
    grad.addColorStop(1, '#0f3460');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const v = viewportRef.current;
    const gridSize = 50 * v.scale;
    const offsetX = ((-v.x * v.scale + w / 2) % gridSize + gridSize) % gridSize;
    const offsetY = ((-v.y * v.scale + h / 2) % gridSize + gridSize) % gridSize;

    ctx.strokeStyle = 'rgba(100, 120, 180, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = offsetX; x < w; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = offsetY; y < h; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  };

  const drawConnection = (
    ctx: CanvasRenderingContext2D,
    conn: Connection,
    pulseTime: number
  ) => {
    const from = inspirations.find((i) => i.id === conn.from);
    const to = inspirations.find((i) => i.id === conn.to);
    if (!from || !to) return;

    const fromFiltered =
      selectedTags.length > 0 && !selectedTags.includes(from.tag);
    const toFiltered =
      selectedTags.length > 0 && !selectedTags.includes(to.tag);
    if (fromFiltered || toFiltered) return;

    const r1 = getBubbleRadius(from.content);
    const r2 = getBubbleRadius(to.content);

    const s1 = worldToScreen(from.x, from.y);
    const s2 = worldToScreen(to.x, to.y);
    const sc = viewportRef.current.scale;

    const sr1 = r1 * sc;
    const sr2 = r2 * sc;

    const dx = s2.x - s1.x;
    const dy = s2.y - s1.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    const startX = s1.x + nx * sr1;
    const startY = s1.y + ny * sr1;
    const endX = s2.x - nx * sr2;
    const endY = s2.y - ny * sr2;

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const perpX = -ny;
    const perpY = nx;
    const curve = Math.min(dist * 0.15, 60);
    const ctrl1X = startX + (midX - startX) * 0.5 + perpX * curve;
    const ctrl1Y = startY + (midY - startY) * 0.5 + perpY * curve;
    const ctrl2X = midX + (endX - midX) * 0.5 + perpX * curve;
    const ctrl2Y = midY + (endY - midY) * 0.5 + perpY * curve;

    const c1 = TAG_COLORS[from.tag].bg;
    const c2 = TAG_COLORS[to.tag].bg;

    ctx.save();
    ctx.lineCap = 'round';

    ctx.lineWidth = 3 * sc;
    ctx.strokeStyle = mixColors(c1, c2, 0.3);
    ctx.globalAlpha = 0.15;
    ctx.shadowColor = mixColors(c1, c2, 0.5);
    ctx.shadowBlur = 15 * sc;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, endX, endY);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    const grad = ctx.createLinearGradient(startX, startY, endX, endY);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.lineWidth = 2 * sc;
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, endX, endY);
    ctx.stroke();

    const pulseOffset = (pulseTime * 0.0008) % 1;
    for (let i = 0; i < 3; i++) {
      const t = (pulseOffset + i * 0.33) % 1;
      const mt = 1 - t;
      const px =
        mt * mt * mt * startX +
        3 * mt * mt * t * ctrl1X +
        3 * mt * t * t * ctrl2X +
        t * t * t * endX;
      const py =
        mt * mt * mt * startY +
        3 * mt * mt * t * ctrl1Y +
        3 * mt * t * t * ctrl2Y +
        t * t * t * endY;
      const pulseAlpha = Math.sin(t * Math.PI) * 0.6;
      ctx.beginPath();
      ctx.arc(px, py, 3 * sc, 0, Math.PI * 2);
      ctx.fillStyle = mixColors(c1, c2, t);
      ctx.globalAlpha = pulseAlpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const arrowT = 0.95;
    const amt = 1 - arrowT;
    const arrowBaseX =
      amt * amt * amt * startX +
      3 * amt * amt * arrowT * ctrl1X +
      3 * amt * arrowT * arrowT * ctrl2X +
      arrowT * arrowT * arrowT * endX;
    const arrowBaseY =
      amt * amt * amt * startY +
      3 * amt * amt * arrowT * ctrl1Y +
      3 * amt * arrowT * arrowT * ctrl2Y +
      arrowT * arrowT * arrowT * endY;

    const angle = Math.atan2(endY - arrowBaseY, endX - arrowBaseX);
    const arrowSize = 8 * sc;

    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      arrowBaseX - Math.cos(angle - Math.PI / 6) * arrowSize,
      arrowBaseY - Math.sin(angle - Math.PI / 6) * arrowSize
    );
    ctx.lineTo(
      arrowBaseX - Math.cos(angle + Math.PI / 6) * arrowSize,
      arrowBaseY - Math.sin(angle + Math.PI / 6) * arrowSize
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  const drawBubble = (
    ctx: CanvasRenderingContext2D,
    insp: Inspiration,
    state: BubbleState,
    pulseTime: number
  ) => {
    const isFiltered =
      selectedTags.length > 0 && !selectedTags.includes(insp.tag);
    const isHovered = hoveredBubbleRef.current === insp.id;
    const isConnecting = connectingFromId === insp.id;
    const isConnectingMode = connectingFromId !== null && !isConnecting;

    const baseR = getBubbleRadius(insp.content);
    const scale = state.scale + (isHovered ? 0.2 : 0);
    const r = baseR * scale;

    const targetOpacity = isFiltered ? 0.2 : 1;
    state.targetOpacity = targetOpacity;
    state.targetScale = isConnecting ? 1.1 : 1;

    const color = TAG_COLORS[insp.tag].bg;
    const glowColor = TAG_COLORS[insp.tag].glow;

    const inView = isInViewport(insp.x, insp.y, r);
    const useLowDetail = inspirations.length > 50 && !inView;

    const s = worldToScreen(insp.x, insp.y);
    const sc = viewportRef.current.scale;
    const sr = r * sc;
    const sbr = baseR * sc;

    if (useLowDetail) {
      ctx.save();
      ctx.globalAlpha = state.opacity * 0.7;
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(4, sbr * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
      return;
    }

    const pulse = isConnecting ? 1 + Math.sin(pulseTime * 0.006) * 0.08 : 1;
    const finalR = sr * pulse;
    const finalBR = sbr * pulse;

    ctx.save();

    ctx.globalAlpha = state.opacity * (isConnectingMode ? 0.5 : 1);

    const glowR = isHovered || isConnecting ? 30 : 15;
    const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, finalBR + glowR * sc);
    glow.addColorStop(0, glowColor);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(s.x, s.y, finalBR + glowR * sc, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    const bodyGrad = ctx.createRadialGradient(
      s.x - finalR * 0.3,
      s.y - finalR * 0.3,
      0,
      s.x,
      s.y,
      finalR
    );
    const rgb = hexToRgb(color);
    bodyGrad.addColorStop(0, `rgba(${Math.min(255, rgb.r + 50)},${Math.min(255, rgb.g + 50)},${Math.min(255, rgb.b + 50)},1)`);
    bodyGrad.addColorStop(0.7, color);
    bodyGrad.addColorStop(1, `rgba(${Math.max(0, rgb.r - 40)},${Math.max(0, rgb.g - 40)},${Math.max(0, rgb.b - 40)},1)`);

    ctx.beginPath();
    ctx.arc(s.x, s.y, finalR, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(s.x, s.y, finalR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5 * sc;
    ctx.stroke();

    const hg = ctx.createRadialGradient(
      s.x - finalR * 0.35,
      s.y - finalR * 0.35,
      0,
      s.x - finalR * 0.35,
      s.y - finalR * 0.35,
      finalR * 0.5
    );
    hg.addColorStop(0, 'rgba(255,255,255,0.45)');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(s.x, s.y, finalR, 0, Math.PI * 2);
    ctx.fillStyle = hg;
    ctx.fill();

    if (!isFiltered && finalR > 25) {
      const maxChars = Math.max(3, Math.floor(finalR / 6));
      let text = insp.content;
      if (text.length > maxChars) {
        text = text.substring(0, maxChars - 1) + '…';
      }
      const fontSize = Math.max(9, Math.min(16, finalR / 3.5));
      ctx.font = `${fontSize}px -apple-system, 'PingFang SC', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 2;
      ctx.fillText(text, s.x, s.y);
      ctx.shadowBlur = 0;
    }

    if (isHovered && !isFiltered) {
      const previewText =
        insp.content.length > 20
          ? insp.content.substring(0, 20) + '…'
          : insp.content;

      const tooltipFontSize = 13;
      ctx.font = `${tooltipFontSize}px -apple-system, 'PingFang SC', sans-serif`;
      const paddingX = 12;
      const paddingY = 8;
      const tw = ctx.measureText(previewText).width + paddingX * 2;
      const th = tooltipFontSize + paddingY * 2;
      let tx = s.x - tw / 2;
      let ty = s.y - finalR - th - 12;
      const cw = canvasRef.current?.width || 0;
      const ch = canvasRef.current?.height || 0;
      tx = Math.max(8, Math.min(cw - tw - 8, tx));
      ty = Math.max(8, Math.min(ch - th - 8, ty));

      ctx.fillStyle = 'rgba(22, 33, 62, 0.95)';
      ctx.strokeStyle = `${color}66`;
      ctx.lineWidth = 1;
      const rr = 8;
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, th, rr);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${tooltipFontSize}px -apple-system, 'PingFang SC', sans-serif`;
      ctx.fillText(previewText, tx + tw / 2, ty + th / 2 + 1);
    }

    if (isConnecting) {
      ctx.setLineDash([4 * sc, 4 * sc]);
      ctx.lineDashOffset = -pulseTime * 0.05;
      ctx.beginPath();
      ctx.arc(s.x, s.y, finalR + 8 * sc, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 * sc;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  };

  const drawConnectingLine = (ctx: CanvasRenderingContext2D) => {
    if (!connectingFromId) return;
    const from = inspirations.find((i) => i.id === connectingFromId);
    if (!from) return;

    const s1 = worldToScreen(from.x, from.y);
    const s2 = {
      x: mouseWorldRef.current.x,
      y: mouseWorldRef.current.y
    };
    const screen2 = worldToScreen(s2.x, s2.y);

    const color = TAG_COLORS[from.tag].bg;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -pulseTimeRef.current * 0.05;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(screen2.x, screen2.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(screen2.x, screen2.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.restore();
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = performance.now();
    const dt = now - lastFrameRef.current;
    lastFrameRef.current = now;
    pulseTimeRef.current += dt;

    const w = canvas.width;
    const h = canvas.height;

    drawBackground(ctx, w, h);

    const ids = new Set(inspirations.map((i) => i.id));
    for (const [id] of bubbleStatesRef.current) {
      if (!ids.has(id)) bubbleStatesRef.current.delete(id);
    }

    connections.forEach((conn) => {
      drawConnection(ctx, conn, pulseTimeRef.current);
    });

    drawConnectingLine(ctx);

    inspirations.forEach((insp, idx) => {
      const state = ensureBubbleState(insp.id);
      const fadeOffset = idx * 0.03;
      state.opacity += (state.targetOpacity - state.opacity) * Math.min(1, dt * 0.006 + fadeOffset * 0.01);
      state.scale += (state.targetScale - state.scale) * Math.min(1, dt * 0.008);
      drawBubble(ctx, insp, state, pulseTimeRef.current);
    });

    animFrameRef.current = requestAnimationFrame(render);
  }, [inspirations, connections, selectedTags, connectingFromId]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const getEventCoords = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setContextMenu(null);

    const { x, y } = getEventCoords(e);
    const world = screenToWorld(x, y);
    mouseWorldRef.current = world;

    if (connectingFromId) {
      const hit = hitTestBubble(world.x, world.y);
      if (hit && hit.id !== connectingFromId) {
        createConnection(connectingFromId, hit.id);
      } else {
        cancelConnecting();
      }
      return;
    }

    const hit = hitTestBubble(world.x, world.y);
    if (hit) {
      const filtered =
        selectedTags.length > 0 && !selectedTags.includes(hit.tag);
      if (filtered) return;
      draggingBubbleRef.current = hit.id;
      dragOffsetRef.current = { x: world.x - hit.x, y: world.y - hit.y };
      return;
    }

    isPanningRef.current = true;
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      vx: viewportRef.current.x,
      vy: viewportRef.current.y
    };
  };

  const createConnection = async (from: string, to: string) => {
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to })
      });
      if (res.ok) {
        const conn = await res.json();
        addConnection(conn);
      }
    } catch (err) {
      console.error(err);
    }
    cancelConnecting();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getEventCoords(e);
    const world = screenToWorld(x, y);
    mouseWorldRef.current = world;

    if (draggingBubbleRef.current) {
      const id = draggingBubbleRef.current;
      const newX = world.x - dragOffsetRef.current.x;
      const newY = world.y - dragOffsetRef.current.y;
      updateInspiration(id, { x: newX, y: newY });
      return;
    }

    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      viewportRef.current.x =
        panStartRef.current.vx - dx / viewportRef.current.scale;
      viewportRef.current.y =
        panStartRef.current.vy - dy / viewportRef.current.scale;
      return;
    }

    const hit = hitTestBubble(world.x, world.y);
    hoveredBubbleRef.current = hit?.id || null;
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
    draggingBubbleRef.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (connectingFromId) return;
    const { x, y } = getEventCoords(e);
    const world = screenToWorld(x, y);
    const hit = hitTestBubble(world.x, world.y);
    if (hit) {
      const filtered =
        selectedTags.length > 0 && !selectedTags.includes(hit.tag);
      if (filtered) return;
      openModal(hit.id);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const { x, y } = getEventCoords(e);
    const world = screenToWorld(x, y);
    for (const conn of connections) {
      if (hitTestConnection(world.x, world.y, conn)) {
        fetch(`/api/connections/${conn.id}`, { method: 'DELETE' })
          .then(() => deleteConnection(conn.id))
          .catch(console.error);
        return;
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const { x, y } = getEventCoords(e);
    const worldBefore = screenToWorld(x, y);
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    viewportRef.current.scale = Math.max(
      0.2,
      Math.min(5, viewportRef.current.scale * factor)
    );
    const worldAfter = screenToWorld(x, y);
    viewportRef.current.x += worldBefore.x - worldAfter.x;
    viewportRef.current.y += worldBefore.y - worldAfter.y;
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const { x, y } = getEventCoords(e);
    const world = screenToWorld(x, y);
    const hit = hitTestBubble(world.x, world.y);
    if (hit) {
      const filtered =
        selectedTags.length > 0 && !selectedTags.includes(hit.tag);
      if (filtered) return;
      setContextMenu({ x: e.clientX, y: e.clientY, inspirationId: hit.id });
    } else {
      setContextMenu(null);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        cursor: connectingFromId
          ? 'crosshair'
          : hoveredBubbleRef.current
          ? 'pointer'
          : isPanningRef.current
          ? 'grabbing'
          : 'grab'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />

      {contextMenu && (
        <div
          className="context-menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'rgba(22, 33, 62, 0.98)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(233, 69, 96, 0.2)',
            borderRadius: 10,
            padding: 6,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            zIndex: 200,
            minWidth: 140,
            animation: 'menuIn 0.15s ease'
          }}
        >
          <button
            onClick={() => {
              startConnecting(contextMenu.inspirationId);
              setContextMenu(null);
            }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 14px',
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: '#e0e0f0',
              cursor: 'pointer',
              fontSize: 13,
              transition: 'all 0.1s ease'
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(233, 69, 96, 0.15)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'transparent')
            }
          >
            🔗 关联到...
          </button>
          <button
            onClick={() => {
              openModal(contextMenu.inspirationId);
              setContextMenu(null);
            }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 14px',
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: '#e0e0f0',
              cursor: 'pointer',
              fontSize: 13,
              transition: 'all 0.1s ease'
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(52, 152, 219, 0.15)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'transparent')
            }
          >
            ✏️ 查看/编辑
          </button>
          <button
            onClick={() => setContextMenu(null)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 14px',
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: '#888',
              cursor: 'pointer',
              fontSize: 13,
              transition: 'all 0.1s ease'
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(160, 160, 176, 0.1)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'transparent')
            }
          >
            取消
          </button>
        </div>
      )}
      <style>{`
        @keyframes menuIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default Canvas;
