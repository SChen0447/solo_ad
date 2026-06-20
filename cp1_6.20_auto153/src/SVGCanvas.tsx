import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Shape, AnchorPoint, Keyframe, Point, KeyframeProperty } from './types';

interface Props {
  shapes: Shape[];
  selectedShapeId: string | null;
  onSelectShape: (id: string | null) => void;
  onUpdateShape: (id: string, updater: (s: Shape) => Shape) => void;
  onDeleteShape: (id: string) => void;
  currentTime: number;
  keyframes: Keyframe[];
  duration: number;
}

function generateShapePath(shape: Shape): string {
  const { type, anchors } = shape;
  switch (type) {
    case 'circle': {
      const center = anchors.find(a => a.type === 'move')!;
      const radius = anchors.find(a => a.type === 'radius')!;
      const r = Math.hypot(radius.x - center.x, radius.y - center.y);
      return `M ${center.x + r} ${center.y} A ${r} ${r} 0 1 1 ${center.x - r} ${center.y} A ${r} ${r} 0 1 1 ${center.x + r} ${center.y} Z`;
    }
    case 'rectangle': {
      const pts = anchors;
      if (pts.length < 4) return '';
      return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y} L ${pts[2].x} ${pts[2].y} L ${pts[3].x} ${pts[3].y} Z`;
    }
    case 'star': {
      if (anchors.length < 2) return '';
      let d = `M ${anchors[0].x} ${anchors[0].y}`;
      for (let i = 1; i < anchors.length; i++) {
        d += ` L ${anchors[i].x} ${anchors[i].y}`;
      }
      return d + ' Z';
    }
    case 'bezier': {
      if (anchors.length < 4) return '';
      const [s, c1, c2, e] = anchors;
      return `M ${s.x} ${s.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${e.x} ${e.y}`;
    }
    default:
      return '';
  }
}

function getPathLength(path: string): number {
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', path);
    svg.appendChild(p);
    document.body.appendChild(svg);
    const len = p.getTotalLength();
    document.body.removeChild(svg);
    return len;
  } catch {
    return 1000;
  }
}

function interpolateKeyframes<T extends number | Point>(
  keyframes: Keyframe[],
  property: KeyframeProperty,
  time: number,
  defaultValue: T,
): T {
  const relevant = keyframes
    .filter(k => k.property === property)
    .sort((a, b) => a.time - b.time);

  if (relevant.length === 0) return defaultValue;
  if (time <= relevant[0].time) return relevant[0].value as T;
  if (time >= relevant[relevant.length - 1].time) return relevant[relevant.length - 1].value as T;

  for (let i = 0; i < relevant.length - 1; i++) {
    const a = relevant[i];
    const b = relevant[i + 1];
    if (time >= a.time && time <= b.time) {
      const t = (time - a.time) / (b.time - a.time);
      if (typeof a.value === 'number' && typeof b.value === 'number') {
        return (a.value + (b.value - a.value) * t) as T;
      }
      const av = a.value as Point;
      const bv = b.value as Point;
      return {
        x: av.x + (bv.x - av.x) * t,
        y: av.y + (bv.y - av.y) * t,
      } as T;
    }
  }
  return defaultValue;
}

export default function SVGCanvas({
  shapes,
  selectedShapeId,
  onSelectShape,
  onUpdateShape,
  onDeleteShape,
  currentTime,
  keyframes,
  duration,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{ shapeId: string; anchorId: string; offset: Point } | null>(null);
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);
  const pathLengthsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    shapes.forEach(s => {
      const path = generateShapePath(s);
      if (!pathLengthsRef.current[s.id] || pathLengthsRef.current[s.id] === 0) {
        pathLengthsRef.current[s.id] = getPathLength(path);
      }
    });
  }, [shapes]);

  const getSvgPoint = useCallback((e: { clientX: number; clientY: number }): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleAnchorMouseDown = useCallback((e: React.MouseEvent, shapeId: string, anchor: AnchorPoint) => {
    e.stopPropagation();
    const pt = getSvgPoint(e);
    setDragging({
      shapeId,
      anchorId: anchor.id,
      offset: { x: pt.x - anchor.x, y: pt.y - anchor.y },
    });
    onSelectShape(shapeId);
  }, [getSvgPoint, onSelectShape]);

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent) => {
      const pt = getSvgPoint(e);
      const newX = pt.x - dragging.offset.x;
      const newY = pt.y - dragging.offset.y;

      onUpdateShape(dragging.shapeId, shape => {
        const anchors = shape.anchors.map(a =>
          a.id === dragging.anchorId ? { ...a, x: newX, y: newY } : a,
        );

        if (shape.type === 'circle') {
          const center = anchors.find(a => a.type === 'move');
          const radiusAnchor = anchors.find(a => a.type === 'radius');
          if (center && radiusAnchor && dragging.anchorId === center.id) {
            const oldCenter = shape.anchors.find(a => a.type === 'move')!;
            const r = Math.hypot(radiusAnchor.x - oldCenter.x, radiusAnchor.y - oldCenter.y);
            const idx = anchors.findIndex(a => a.id === radiusAnchor.id);
            if (idx >= 0) {
              anchors[idx] = { ...anchors[idx], x: newX + r, y: newY };
            }
          }
        }

        if (shape.type === 'rectangle') {
          const types = ['-tl', '-tr', '-br', '-bl'];
          const indices = [0, 1, 2, 3];
          const draggedIdx = types.findIndex(t => dragging.anchorId.includes(t));
          if (draggedIdx >= 0) {
            const oppIdx = (draggedIdx + 2) % 4;
            const opposite = anchors[oppIdx];
            if (draggedIdx === 0) { anchors[1].y = newY; anchors[3].x = newX; }
            if (draggedIdx === 1) { anchors[0].y = newY; anchors[2].x = newX; }
            if (draggedIdx === 2) { anchors[1].x = newX; anchors[3].y = newY; }
            if (draggedIdx === 3) { anchors[0].x = newX; anchors[2].y = newY; }
          }
        }

        return { ...shape, anchors };
      });
    };

    const handleUp = () => setDragging(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, getSvgPoint, onUpdateShape]);

  const renderedShapes = useMemo(() => {
    return shapes.map(shape => {
      const shapeKfs = keyframes.filter(k => k.shapeId === shape.id);
      const pos = interpolateKeyframes<Point>(shapeKfs, 'position', currentTime, {
        x: shape.transform.x,
        y: shape.transform.y,
      });
      const rot = interpolateKeyframes<number>(shapeKfs, 'rotation', currentTime, shape.transform.rotation);
      const sc = interpolateKeyframes<number>(shapeKfs, 'scale', currentTime, shape.transform.scale);
      const strokeLen = interpolateKeyframes<number>(shapeKfs, 'strokeLength', currentTime, 1);
      const path = generateShapePath(shape);
      const totalLen = pathLengthsRef.current[shape.id] || getPathLength(path);
      pathLengthsRef.current[shape.id] = totalLen;

      return { shape, pos, rot, sc, strokeLen, path, totalLen };
    });
  }, [shapes, keyframes, currentTime]);

  const selectedShape = shapes.find(s => s.id === selectedShapeId);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#f8fafc',
      backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
      backgroundSize: '20px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
    }}
      onClick={() => onSelectShape(null)}
    >
      <div style={{
        position: 'absolute',
        top: 16,
        left: 24,
        fontSize: 11,
        color: '#94a3b8',
        pointerEvents: 'none',
      }}>
        画布 800 × 500
      </div>

      <svg
        ref={svgRef}
        width={800}
        height={500}
        style={{
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0',
          cursor: dragging ? 'grabbing' : 'default',
          userSelect: 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
          </marker>
        </defs>

        {renderedShapes.map(({ shape, pos, rot, sc, strokeLen, path, totalLen }) => {
          const isSelected = shape.id === selectedShapeId;
          const isHovered = shape.id === hoveredShapeId;
          const anchor = shape.anchors.find(a => a.type === 'move' || a.type === 'point') || shape.anchors[0];
          const cx = anchor ? anchor.x : 400;
          const cy = anchor ? anchor.y : 250;
          const offset = totalLen * (1 - strokeLen);

          return (
            <g
              key={shape.id}
              style={{
                cursor: 'pointer',
              }}
              transform={`translate(${pos.x}, ${pos.y}) rotate(${rot}, ${cx}, ${cy}) scale(${sc})`}
              onClick={e => { e.stopPropagation(); onSelectShape(shape.id); }}
              onMouseEnter={() => setHoveredShapeId(shape.id)}
              onMouseLeave={() => setHoveredShapeId(null)}
            >
              <path
                d={path}
                fill={shape.fill}
                stroke={shape.stroke}
                strokeWidth={shape.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={totalLen}
                strokeDashoffset={offset}
                style={{
                  filter: isSelected ? 'drop-shadow(0 0 4px rgba(59,130,246,0.5))' :
                    isHovered ? 'drop-shadow(0 0 2px rgba(59,130,246,0.3))' : 'none',
                }}
              />

              {shape.type === 'bezier' && isSelected && (
                <>
                  <line
                    x1={shape.anchors[0].x} y1={shape.anchors[0].y}
                    x2={shape.anchors[1].x} y2={shape.anchors[1].y}
                    stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4"
                  />
                  <line
                    x1={shape.anchors[3].x} y1={shape.anchors[3].y}
                    x2={shape.anchors[2].x} y2={shape.anchors[2].y}
                    stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 4"
                  />
                </>
              )}
            </g>
          );
        })}

        {selectedShape && (
          <g
            transform={`translate(${
              interpolateKeyframes<Point>(
                keyframes.filter(k => k.shapeId === selectedShape.id),
                'position', currentTime,
                { x: selectedShape.transform.x, y: selectedShape.transform.y }
              ).x
            }, ${
              interpolateKeyframes<Point>(
                keyframes.filter(k => k.shapeId === selectedShape.id),
                'position', currentTime,
                { x: selectedShape.transform.x, y: selectedShape.transform.y }
              ).y
            })`}
          >
            {selectedShape.anchors.map(anchor => (
              <motion.circle
                key={anchor.id}
                cx={anchor.x}
                cy={anchor.y}
                r={4}
                fill="#ffffff"
                stroke="#3b82f6"
                strokeWidth={2}
                style={{ cursor: 'grab', pointerEvents: 'auto' }}
                animate={{
                  cx: anchor.x,
                  cy: anchor.y,
                  transition: dragging ? { duration: 0 } : { duration: 0.1, ease: 'easeOut' },
                }}
                onMouseDown={(e) => handleAnchorMouseDown(e, selectedShape.id, anchor)}
              />
            ))}
          </g>
        )}
      </svg>

      <AnimatePresence>
        {selectedShape && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: 40,
              right: 40,
              background: '#ffffff',
              borderRadius: 10,
              padding: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              border: '1px solid #e2e8f0',
              minWidth: 180,
              fontSize: 12,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 8, fontSize: 13 }}>
              {selectedShape.name}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#64748b' }}>描边颜色</span>
                <input
                  type="color"
                  value={selectedShape.stroke}
                  onChange={e => onUpdateShape(selectedShape.id, s => ({ ...s, stroke: e.target.value }))}
                  style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                />
              </label>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#64748b' }}>描边宽</span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={selectedShape.strokeWidth}
                  onChange={e => onUpdateShape(selectedShape.id, s => ({ ...s, strokeWidth: Number(e.target.value) }))}
                  style={{ width: 60, padding: '2px 6px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 12 }}
                />
              </label>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#64748b' }}>填充颜色</span>
                <input
                  type="color"
                  value={selectedShape.fill === 'none' ? '#ffffff' : selectedShape.fill.startsWith('rgba') ? '#3b82f6' : selectedShape.fill}
                  onChange={e => {
                    const v = e.target.value;
                    const r = parseInt(v.slice(1, 3), 16);
                    const g = parseInt(v.slice(3, 5), 16);
                    const b = parseInt(v.slice(5, 7), 16);
                    onUpdateShape(selectedShape.id, s => ({ ...s, fill: `rgba(${r},${g},${b},0.15)` }));
                  }}
                  style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                />
              </label>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onDeleteShape(selectedShape.id)}
                style={{
                  marginTop: 4,
                  padding: '6px 0',
                  borderRadius: 6,
                  background: '#fee2e2',
                  color: '#dc2626',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                删除图形
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
