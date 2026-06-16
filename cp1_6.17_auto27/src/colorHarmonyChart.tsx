import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Palette, HarmonySegment } from './types';

interface ColorHarmonyChartProps {
  palette: Palette;
  selectedIndex: number | null;
  onSegmentHover: (index: number | null) => void;
}

const ColorHarmonyChart: React.FC<ColorHarmonyChartProps> = ({
  palette,
  selectedIndex,
  onSegmentHover
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    segment: HarmonySegment | null;
  }>({ visible: false, x: 0, y: 0, segment: null });
  const segmentsRef = useRef<HarmonySegment[]>([]);

  const buildSegments = useCallback((p: Palette): HarmonySegment[] => {
    const total = p.reduce((sum, c) => sum + c.percentage, 0);
    if (total === 0) return [];

    const segs: HarmonySegment[] = [];
    let currentAngle = -Math.PI / 2;

    p.forEach((color, index) => {
      const normalizedPct = color.percentage / total;
      const arcLength = normalizedPct * 2 * Math.PI * 0.95;
      segs.push({
        color,
        startAngle: currentAngle,
        endAngle: currentAngle + arcLength,
        index
      });
      currentAngle += arcLength + (2 * Math.PI * 0.01);
    });

    return segs;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 300;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const outerRadius = 130;
    const innerRadius = 80;
    const hoverExpand = hoveredIndex !== null ? 5 : 0;

    ctx.clearRect(0, 0, size, size);

    for (let angle = 0; angle < 360; angle += 1) {
      const startRad = (angle * Math.PI) / 180 - Math.PI / 2;
      const endRad = ((angle + 1) * Math.PI) / 180 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius + 10, startRad, endRad);
      ctx.arc(centerX, centerY, innerRadius - 5, endRad, startRad, true);
      ctx.closePath();
      ctx.fillStyle = `hsl(${angle}, 80%, 55%)`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius - 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    const segments = buildSegments(palette);
    segmentsRef.current = segments;

    segments.forEach((seg, idx) => {
      const expand = hoveredIndex === idx ? hoverExpand : 0;
      const or = outerRadius + expand;
      const ir = innerRadius;

      ctx.beginPath();
      ctx.arc(centerX, centerY, or, seg.startAngle, seg.endAngle);
      ctx.arc(centerX, centerY, ir, seg.endAngle, seg.startAngle, true);
      ctx.closePath();
      ctx.fillStyle = seg.color.hex;
      ctx.fill();

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    const tickLabels = [
      { angle: 0, label: '0°', tx: centerX, ty: centerY - outerRadius - 20 },
      { angle: 90, label: '90°', tx: centerX + outerRadius + 25, ty: centerY + 5 },
      { angle: 180, label: '180°', tx: centerX, ty: centerY + outerRadius + 25 },
      { angle: 270, label: '270°', tx: centerX - outerRadius - 30, ty: centerY + 5 }
    ];

    tickLabels.forEach(t => {
      const rad = (t.angle * Math.PI) / 180 - Math.PI / 2;
      const sx = centerX + Math.cos(rad) * (outerRadius + 12);
      const sy = centerY + Math.sin(rad) * (outerRadius + 12);
      const ex = centerX + Math.cos(rad) * (outerRadius + 16);
      const ey = centerY + Math.sin(rad) * (outerRadius + 16);

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#555';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.label, t.tx, t.ty);
    });

    if (selectedIndex !== null && palette[selectedIndex]) {
      const c = palette[selectedIndex];
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
      ctx.fillStyle = c.hex;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }, [palette, hoveredIndex, selectedIndex, buildSegments]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = 300;
    const centerX = size / 2;
    const centerY = size / 2;
    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 80 || dist > 140) {
      if (hoveredIndex !== null) {
        setHoveredIndex(null);
        onSegmentHover(null);
      }
      setTooltip(prev => ({ ...prev, visible: false }));
      return;
    }

    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) angle += 2 * Math.PI;

    let found: number | null = null;
    segmentsRef.current.forEach((seg, idx) => {
      if (angle >= seg.startAngle && angle <= seg.endAngle) {
        found = idx;
      }
    });

    if (found !== hoveredIndex) {
      setHoveredIndex(found);
      onSegmentHover(found);
    }

    if (found !== null) {
      setTooltip({
        visible: true,
        x: e.clientX - rect.left + 15,
        y: e.clientY - rect.top + 15,
        segment: segmentsRef.current[found]
      });
    } else {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    onSegmentHover(null);
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  return (
    <div className="harmony-chart-container">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {tooltip.visible && tooltip.segment && (
        <div
          className="harmony-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div
            className="tooltip-swatch"
            style={{ backgroundColor: tooltip.segment.color.hex }}
          />
          <div className="tooltip-content">
            <div className="tooltip-name">{tooltip.segment.color.name}</div>
            <div className="tooltip-hex">{tooltip.segment.color.hex}</div>
            <div className="tooltip-pct">
              占比 {tooltip.segment.color.percentage.toFixed(1)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorHarmonyChart;
