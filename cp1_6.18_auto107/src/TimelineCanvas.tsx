import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  useTimelineStore,
  TimelineEvent,
  EventCategory,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  RecommendedEvent,
} from './timelineStore';

const HOUR_HEIGHT = 80;
const LABEL_WIDTH = 48;
const BLOCK_LEFT = LABEL_WIDTH + 8;
const BLOCK_RADIUS = 6;
const MIN_DURATION = 0.25;

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

interface DeletingBlock {
  event: TimelineEvent;
  progress: number;
}

interface TimelineCanvasProps {
  onEditEvent: (id: string) => void;
  onContextMenu: (id: string | null, x: number, y: number) => void;
}

export default function TimelineCanvas({ onEditEvent, onContextMenu }: TimelineCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  const events = useTimelineStore((s) => s.events);
  const selectedDate = useTimelineStore((s) => s.selectedDate);
  const recommendedEvents = useTimelineStore((s) => s.recommendedEvents);
  const addEvent = useTimelineStore((s) => s.addEvent);
  const updateEvent = useTimelineStore((s) => s.updateEvent);
  const deleteEvent = useTimelineStore((s) => s.deleteEvent);
  const confirmRecommendedEvents = useTimelineStore((s) => s.confirmRecommendedEvents);

  const [canvasWidth, setCanvasWidth] = useState(800);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [deletingBlocks, setDeletingBlocks] = useState<DeletingBlock[]>([]);
  const deletingBlocksRef = useRef<DeletingBlock[]>([]);

  const dragRef = useRef<{
    eventId: string;
    offsetY: number;
    startY: number;
    isDragging: boolean;
  } | null>(null);

  const createRef = useRef<{
    startY: number;
    isCreating: boolean;
    currentY: number;
  } | null>(null);

  const hoveredIdRef = useRef<string | null>(null);
  const recHoveredRef = useRef<string | null>(null);

  const dayEvents = events.filter((e) => e.date === selectedDate);
  const dayRecommended = recommendedEvents.filter((e) => e.date === selectedDate);

  const canvasHeight = 24 * HOUR_HEIGHT;
  const blockWidth = canvasWidth - BLOCK_LEFT - 16;

  const yToHour = useCallback((y: number) => {
    return Math.max(0, Math.min(24, y / HOUR_HEIGHT));
  }, []);

  const snapHour = useCallback((h: number) => {
    return Math.round(h * 4) / 4;
  }, []);

  const findEventAtPos = useCallback(
    (x: number, y: number): TimelineEvent | null => {
      for (let i = dayEvents.length - 1; i >= 0; i--) {
        const e = dayEvents[i];
        const ey = e.startHour * HOUR_HEIGHT;
        const eh = e.duration * HOUR_HEIGHT;
        if (x >= BLOCK_LEFT && x <= BLOCK_LEFT + blockWidth && y >= ey && y <= ey + eh) {
          return e;
        }
      }
      return null;
    },
    [dayEvents, blockWidth]
  );

  const findRecommendedAtPos = useCallback(
    (x: number, y: number): RecommendedEvent | null => {
      for (let i = dayRecommended.length - 1; i >= 0; i--) {
        const r = dayRecommended[i];
        const ry = r.startHour * HOUR_HEIGHT;
        const rh = r.duration * HOUR_HEIGHT;
        if (x >= BLOCK_LEFT && x <= BLOCK_LEFT + blockWidth && y >= ry && y <= ry + rh) {
          return r;
        }
      }
      return null;
    },
    [dayRecommended, blockWidth]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasWidth(entry.contentRect.width);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [canvasWidth, canvasHeight]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    for (let h = 0; h < 24; h++) {
      const y = h * HOUR_HEIGHT;
      if (h % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(0, y, canvasWidth, HOUR_HEIGHT);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.moveTo(LABEL_WIDTH, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(`${String(h).padStart(2, '0')}:00`, LABEL_WIDTH - 8, y + 4);
    }

    const finalLineY = 24 * HOUR_HEIGHT;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(LABEL_WIDTH, finalLineY);
    ctx.lineTo(canvasWidth, finalLineY);
    ctx.stroke();

    for (const r of dayRecommended) {
      const ry = r.startHour * HOUR_HEIGHT;
      const rh = r.duration * HOUR_HEIGHT;
      const isHovered = recHoveredRef.current === r.id;
      const color = CATEGORY_COLORS[r.category];

      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = isHovered ? 0.7 : 0.45;
      roundRect(ctx, BLOCK_LEFT, ry, blockWidth, rh, BLOCK_RADIUS);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalAlpha = isHovered ? 0.2 : 0.1;
      ctx.fillStyle = color;
      roundRect(ctx, BLOCK_LEFT, ry, blockWidth, rh, BLOCK_RADIUS);
      ctx.fill();

      ctx.globalAlpha = 0.8;
      ctx.fillStyle = color;
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`推荐: ${r.title}`, BLOCK_LEFT + 10, ry + 8);
      ctx.restore();
    }

    const activeDeleting = deletingBlocksRef.current;
    const deletingIds = new Set(activeDeleting.map((d) => d.event.id));

    for (const e of dayEvents) {
      if (deletingIds.has(e.id)) continue;
      const ey = e.startHour * HOUR_HEIGHT;
      const eh = Math.max(e.duration * HOUR_HEIGHT, 8);
      const color = CATEGORY_COLORS[e.category];
      const isHovered = hoveredIdRef.current === e.id;
      const isDragging = dragRef.current?.eventId === e.id;

      ctx.save();
      ctx.globalAlpha = isDragging ? 0.85 : isHovered ? 1 : 0.9;
      ctx.fillStyle = color;
      roundRect(ctx, BLOCK_LEFT, ey, blockWidth, eh, BLOCK_RADIUS);
      ctx.fill();

      if (isHovered || isDragging) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = color;
        roundRect(ctx, BLOCK_LEFT, ey, blockWidth, eh, BLOCK_RADIUS);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      roundRect(ctx, BLOCK_LEFT, ey, blockWidth, eh, BLOCK_RADIUS);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const titleText =
        eh < 25 ? e.title.slice(0, 4) : e.title.length > 20 ? e.title.slice(0, 20) + '…' : e.title;
      ctx.fillText(titleText, BLOCK_LEFT + 10, ey + 8);

      if (eh >= 35) {
        ctx.font = '10px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        const startStr = formatHour(e.startHour);
        const endStr = formatHour(e.startHour + e.duration);
        ctx.fillText(`${startStr} - ${endStr}  ${CATEGORY_LABELS[e.category]}`, BLOCK_LEFT + 10, ey + 24);
      }

      if (isDragging) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          formatHour(e.startHour),
          BLOCK_LEFT + blockWidth / 2,
          ey + eh + 14
        );
      }

      ctx.restore();
    }

    for (const d of activeDeleting) {
      const e = d.event;
      const progress = d.progress;
      const ey = e.startHour * HOUR_HEIGHT;
      const eh = e.duration * HOUR_HEIGHT;
      const centerX = BLOCK_LEFT + blockWidth / 2;
      const centerY = ey + eh / 2;
      const scale = 1 - progress;
      const alpha = 1 - progress;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);
      ctx.fillStyle = CATEGORY_COLORS[e.category];
      roundRect(ctx, BLOCK_LEFT, ey, blockWidth, eh, BLOCK_RADIUS);
      ctx.fill();
      ctx.restore();
    }

    if (createRef.current?.isCreating) {
      const cr = createRef.current;
      const startY = cr.startY;
      const currentY = cr.currentY;
      const top = Math.min(startY, currentY);
      const height = Math.abs(currentY - startY);
      if (height > 2) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        roundRect(ctx, BLOCK_LEFT, top, blockWidth, height, BLOCK_RADIUS);
        ctx.fill();
        roundRect(ctx, BLOCK_LEFT, top, blockWidth, height, BLOCK_RADIUS);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#fff';
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        const startH = yToHour(top);
        const endH = yToHour(top + height);
        ctx.fillText(
          `${formatHour(startH)} - ${formatHour(endH)}`,
          BLOCK_LEFT + blockWidth / 2,
          top + height / 2 + 4
        );
        ctx.restore();
      }
    }

    for (const ripple of ripples) {
      ctx.save();
      ctx.globalAlpha = ripple.alpha;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }, [
    canvasWidth,
    canvasHeight,
    dayEvents,
    dayRecommended,
    blockWidth,
    yToHour,
    ripples,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    const animate = () => {
      drawFrame();
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [drawFrame]);

  useEffect(() => {
    if (deletingBlocks.length === 0) {
      deletingBlocksRef.current = [];
      return;
    }

    deletingBlocksRef.current = deletingBlocks;
    const interval = setInterval(() => {
      setDeletingBlocks((prev) => {
        const next = prev
          .map((d) => ({ ...d, progress: d.progress + 0.05 }))
          .filter((d) => d.progress < 1);
        deletingBlocksRef.current = next;
        return next;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [deletingBlocks]);

  useEffect(() => {
    if (ripples.length === 0) return;
    const interval = setInterval(() => {
      setRipples((prev) => {
        const next = prev
          .map((r) => ({
            ...r,
            radius: r.radius + 3,
            alpha: r.alpha - 0.03,
          }))
          .filter((r) => r.alpha > 0);
        return next;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [ripples.length > 0]);

  const getCanvasPos = useCallback(
    (e: React.MouseEvent): { x: number; y: number } => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const pos = getCanvasPos(e);
      const hit = findEventAtPos(pos.x, pos.y);

      if (hit) {
        dragRef.current = {
          eventId: hit.id,
          offsetY: pos.y - hit.startHour * HOUR_HEIGHT,
          startY: pos.y,
          isDragging: false,
        };
        return;
      }

      const recHit = findRecommendedAtPos(pos.x, pos.y);
      if (recHit) {
        return;
      }

      if (pos.x > LABEL_WIDTH) {
        createRef.current = {
          startY: pos.y,
          isCreating: true,
          currentY: pos.y,
        };

        setRipples((prev) => [
          ...prev,
          {
            x: pos.x,
            y: pos.y,
            radius: 0,
            maxRadius: 60,
            alpha: 0.6,
          },
        ]);
      }
    },
    [getCanvasPos, findEventAtPos, findRecommendedAtPos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = getCanvasPos(e);

      if (dragRef.current) {
        const drag = dragRef.current;
        if (!drag.isDragging && Math.abs(pos.y - drag.startY) > 4) {
          drag.isDragging = true;
        }
        if (drag.isDragging) {
          const newStartY = pos.y - drag.offsetY;
          const newHour = snapHour(yToHour(newStartY));
          updateEvent(drag.eventId, { startHour: Math.max(0, Math.min(24 - 0.25, newHour)) });
        }
        return;
      }

      if (createRef.current?.isCreating) {
        createRef.current.currentY = pos.y;
        return;
      }

      const hit = findEventAtPos(pos.x, pos.y);
      hoveredIdRef.current = hit?.id || null;

      const recHit = findRecommendedAtPos(pos.x, pos.y);
      recHoveredRef.current = recHit?.id || null;

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = hit || recHit ? 'pointer' : pos.x > LABEL_WIDTH ? 'crosshair' : 'default';
      }
    },
    [getCanvasPos, yToHour, snapHour, updateEvent, findEventAtPos, findRecommendedAtPos]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (dragRef.current) {
        dragRef.current = null;
        return;
      }

      if (createRef.current?.isCreating) {
        const cr = createRef.current;
        const top = Math.min(cr.startY, cr.currentY);
        const height = Math.abs(cr.currentY - cr.startY);

        if (height > 8) {
          const startHour = snapHour(yToHour(top));
          const endHour = snapHour(yToHour(top + height));
          const duration = Math.max(MIN_DURATION, endHour - startHour);

          addEvent({
            title: '新事件',
            note: '',
            category: 'other',
            startHour,
            duration,
            date: selectedDate,
          });
        }

        createRef.current = null;
      }
    },
    [yToHour, snapHour, addEvent, selectedDate]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const pos = getCanvasPos(e);
      const hit = findEventAtPos(pos.x, pos.y);
      if (hit) {
        onEditEvent(hit.id);
        return;
      }

      const recHit = findRecommendedAtPos(pos.x, pos.y);
      if (recHit) {
        confirmRecommendedEvents();
      }
    },
    [getCanvasPos, findEventAtPos, findRecommendedAtPos, onEditEvent, confirmRecommendedEvents]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const pos = getCanvasPos(e);
      const hit = findEventAtPos(pos.x, pos.y);
      if (hit) {
        onContextMenu(hit.id, e.clientX, e.clientY);
      } else {
        onContextMenu(null, 0, 0);
      }
    },
    [getCanvasPos, findEventAtPos, onContextMenu]
  );

  const handleDeleteWithAnimation = useCallback(
    (id: string) => {
      const event = dayEvents.find((e) => e.id === id);
      if (!event) return;
      setDeletingBlocks((prev) => [...prev, { event, progress: 0 }]);
      setTimeout(() => deleteEvent(id), 350);
    },
    [dayEvents, deleteEvent]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => e.preventDefault();
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        style={{ display: 'block' }}
      />
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function formatHour(h: number): string {
  const hours = Math.floor(h);
  const minutes = Math.round((h - hours) * 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
