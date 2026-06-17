import { useRef, useEffect, useCallback, useState } from 'react';
import type { Bookmark, TimeRange } from '@/data/BookmarkDataService';

interface TimelinePanelProps {
  bookmarks: Bookmark[];
  timeRange: TimeRange;
  filteredIds: Set<string> | null;
  onTimeRangeChange: (range: TimeRange) => void;
}

function interpolateColor(t: number): string {
  const r1 = 108, g1 = 99, b1 = 255;
  const r2 = 224, g2 = 64, b2 = 251;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const PADDING = 60;
const NODE_RADIUS = 3;
const NODE_HOVER_RADIUS = 5;
const AXIS_Y = 50;

export default function TimelinePanel({ bookmarks, timeRange, filteredIds, onTimeRangeChange }: TimelinePanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; title: string; time: string } | null>(null);
  const dragState = useRef<{ isDragging: boolean; startX: number; startOffset: number }>({
    isDragging: false,
    startX: 0,
    startOffset: 0,
  });
  const offsetRef = useRef(0);
  const [offset, setOffset] = useState(0);

  const timeToX = useCallback(
    (ts: number, width: number) => {
      const range = timeRange.end - timeRange.start;
      if (range === 0) return PADDING;
      return PADDING + ((ts - timeRange.start) / range) * (width - PADDING * 2);
    },
    [timeRange]
  );

  const draw = useCallback(() => {
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
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const w = rect.width;

    ctx.clearRect(0, 0, w, rect.height);
    ctx.fillStyle = '#2A2A2E';
    ctx.fillRect(0, 0, w, rect.height);

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING, AXIS_Y);
    ctx.lineTo(w - PADDING, AXIS_Y);
    ctx.stroke();

    if (bookmarks.length === 0) return;

    const sorted = [...bookmarks].sort((a, b) => a.createdAt - b.createdAt);
    const minTime = sorted[0].createdAt;
    const maxTime = sorted[sorted.length - 1].createdAt;
    const timeSpan = maxTime - minTime || 1;

    let prevX: number | null = null;
    sorted.forEach((bm) => {
      const x = timeToX(bm.createdAt, w) + offset;
      if (x < PADDING - 20 || x > w - PADDING + 20) return;

      if (prevX !== null) {
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(prevX, AXIS_Y);
        ctx.lineTo(x, AXIS_Y);
        ctx.stroke();
      }
      prevX = x;
    });

    sorted.forEach((bm) => {
      const x = timeToX(bm.createdAt, w) + offset;
      if (x < PADDING - 20 || x > w - PADDING + 20) return;

      const t = timeSpan === 0 ? 0 : (bm.createdAt - minTime) / timeSpan;
      const isFilteredOut = filteredIds && !filteredIds.has(bm.id);
      const isHovered = hoveredId === bm.id;
      const color = interpolateColor(t);
      const radius = isHovered ? NODE_HOVER_RADIUS : NODE_RADIUS;

      ctx.beginPath();
      ctx.arc(x, AXIS_Y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isFilteredOut ? '#555' : color;
      ctx.globalAlpha = isFilteredOut ? 0.3 : 1;
      ctx.fill();
      ctx.globalAlpha = 1;

      if (isHovered && !isFilteredOut) {
        ctx.beginPath();
        ctx.arc(x, AXIS_Y, radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });
  }, [bookmarks, timeToX, offset, filteredIds, hoveredId]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    dragState.current = { isDragging: true, startX: e.clientX, startOffset: offsetRef.current };
    setHoveredId(null);
    setTooltip(null);
    e.preventDefault();
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (dragState.current.isDragging) {
        const dx = e.clientX - dragState.current.startX;
        const newOffset = dragState.current.startOffset + dx;
        offsetRef.current = newOffset;
        setOffset(newOffset);
        return;
      }

      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const sorted = [...bookmarks].sort((a, b) => a.createdAt - b.createdAt);
      let found: { x: number; y: number; bm: Bookmark } | null = null;
      for (const bm of sorted) {
        const x = timeToX(bm.createdAt, rect.width) + offset;
        const dist = Math.sqrt((mx - x) ** 2 + (my - AXIS_Y) ** 2);
        if (dist <= NODE_HOVER_RADIUS + 6) {
          found = { x, y: AXIS_Y, bm };
          break;
        }
      }

      if (found) {
        setHoveredId(found.bm.id);
        setTooltip({
          x: found.x,
          y: found.y - 16,
          title: found.bm.title,
          time: formatTimestamp(found.bm.createdAt),
        });
      } else {
        setHoveredId(null);
        setTooltip(null);
      }
    },
    [bookmarks, timeToX, offset]
  );

  const handleMouseUp = useCallback(() => {
    if (dragState.current.isDragging) {
      const dx = offsetRef.current - dragState.current.startOffset;
      if (Math.abs(dx) > 5) {
        const container = containerRef.current;
        if (container) {
          const w = container.getBoundingClientRect().width;
          const range = timeRange.end - timeRange.start;
          const timeDelta = -(dx / (w - PADDING * 2)) * range;
          const newStart = timeRange.start + timeDelta;
          const newEnd = timeRange.end + timeDelta;
          onTimeRangeChange({ start: newStart, end: newEnd });
        }
      }
      dragState.current = { isDragging: false, startX: 0, startOffset: 0 };
      offsetRef.current = 0;
      setOffset(0);
    }
  }, [timeRange, onTimeRangeChange]);

  const handleMouseLeave = () => {
    setHoveredId(null);
    setTooltip(null);
    if (dragState.current.isDragging) {
      dragState.current.isDragging = false;
      offsetRef.current = 0;
      setOffset(0);
    }
  };

  return (
    <div
      ref={containerRef}
      className="timeline-container"
      style={{
        height: 100,
        position: 'relative',
        cursor: 'grab',
        userSelect: 'none',
        overflow: 'hidden',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {tooltip && hoveredId && (
        <div
          className="timeline-tooltip"
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(30,30,46,0.95)',
            border: '1px solid #6C63FF',
            borderRadius: 6,
            padding: '4px 10px',
            color: '#E0E0E0',
            fontSize: 12,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 10,
            transition: 'opacity 0.2s ease-out',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{tooltip.title}</div>
          <div style={{ color: '#aaa', fontSize: 11 }}>{tooltip.time}</div>
        </div>
      )}
    </div>
  );
}
