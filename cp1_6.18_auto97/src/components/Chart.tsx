import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { DataPoint, ChartType } from '../types';

interface ChartProps {
  data: DataPoint[];
  chartType: ChartType;
  manualAnomalies: Set<number>;
  autoAnomalies: Set<number>;
  xLabel: string;
  yLabel: string;
  onBoxSelect: (indices: number[]) => void;
}

const MARGIN = { top: 30, right: 30, bottom: 50, left: 70 };

type InteractionMode = 'idle' | 'panning' | 'selecting';

interface ViewState {
  xMin: number; xMax: number; yMin: number; yMax: number;
}

const Chart: React.FC<ChartProps> = ({
  data, chartType, manualAnomalies, autoAnomalies,
  xLabel, yLabel, onBoxSelect
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 500 });
  const [fadeKey, setFadeKey] = useState(0);
  const [view, setView] = useState<ViewState | null>(null);
  const [mode, setMode] = useState<InteractionMode>('idle');
  const [selectBox, setSelectBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const selectStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        setSize({ w: Math.max(300, width), h: Math.max(300, height) });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setView(null);
    setFadeKey(k => k + 1);
  }, [chartType, data.length]);

  const bounds = useMemo(() => {
    if (data.length === 0) return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const p of data) {
      if (p.x < xMin) xMin = p.x;
      if (p.x > xMax) xMax = p.x;
      if (p.y < yMin) yMin = p.y;
      if (p.y > yMax) yMax = p.y;
    }
    if (xMin === xMax) { xMin -= 1; xMax += 1; }
    if (yMin === yMax) { yMin -= 1; yMax += 1; }
    const xPad = (xMax - xMin) * 0.05;
    const yPad = (yMax - yMin) * 0.05;
    return { xMin: xMin - xPad, xMax: xMax + xPad, yMin: yMin - yPad, yMax: yMax + yPad };
  }, [data]);

  const effectiveView = view ?? bounds;

  const innerW = size.w - MARGIN.left - MARGIN.right;
  const innerH = size.h - MARGIN.top - MARGIN.bottom;

  const scaleX = useCallback((x: number) =>
    MARGIN.left + ((x - effectiveView.xMin) / (effectiveView.xMax - effectiveView.xMin)) * innerW,
    [effectiveView, innerW]);

  const scaleY = useCallback((y: number) =>
    MARGIN.top + (1 - (y - effectiveView.yMin) / (effectiveView.yMax - effectiveView.yMin)) * innerH,
    [effectiveView, innerH]);

  const invX = useCallback((px: number) =>
    effectiveView.xMin + ((px - MARGIN.left) / innerW) * (effectiveView.xMax - effectiveView.xMin),
    [effectiveView, innerW]);

  const invY = useCallback((py: number) =>
    effectiveView.yMin + (1 - (py - MARGIN.top) / innerH) * (effectiveView.yMax - effectiveView.yMin),
    [effectiveView, innerH]);

  const ticks = useMemo(() => {
    const makeTick = (min: number, max: number, count: number) => {
      const range = max - min;
      const rawStep = range / count;
      const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
      const norm = rawStep / pow;
      let step: number;
      if (norm <= 1.5) step = 1;
      else if (norm <= 3) step = 2;
      else if (norm <= 7) step = 5;
      else step = 10;
      step *= pow;
      const start = Math.ceil(min / step) * step;
      const result: number[] = [];
      for (let v = start; v <= max + 1e-9; v += step) result.push(Number(v.toPrecision(10)));
      return result;
    };
    return {
      x: makeTick(effectiveView.xMin, effectiveView.xMax, 8),
      y: makeTick(effectiveView.yMin, effectiveView.yMax, 6)
    };
  }, [effectiveView]);

  const getSvgPoint = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const inPlot = (px: number, py: number) =>
    px >= MARGIN.left && px <= size.w - MARGIN.right &&
    py >= MARGIN.top && py <= size.h - MARGIN.bottom;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (data.length === 0) return;
    e.preventDefault();
    const pt = getSvgPoint(e);
    if (!inPlot(pt.x, pt.y)) return;
    const factor = e.deltaY < 0 ? 0.85 : 1.18;
    const cx = invX(pt.x);
    const cy = invY(pt.y);
    const newXMin = cx - (cx - effectiveView.xMin) * factor;
    const newXMax = cx + (effectiveView.xMax - cx) * factor;
    const newYMin = cy - (cy - effectiveView.yMin) * factor;
    const newYMax = cy + (effectiveView.yMax - cy) * factor;
    setView({ xMin: newXMin, xMax: newXMax, yMin: newYMin, yMax: newYMax });
  }, [effectiveView, data.length, getSvgPoint, invX, invY, size]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (data.length === 0) return;
    const pt = getSvgPoint(e);
    if (!inPlot(pt.x, pt.y)) return;
    if (e.button === 0) {
      if (e.shiftKey) {
        setMode('selecting');
        selectStart.current = pt;
        setSelectBox({ x: pt.x, y: pt.y, w: 0, h: 0 });
      } else {
        setMode('panning');
        panStart.current = { x: pt.x, y: pt.y, vx: effectiveView.xMin, vy: effectiveView.yMin };
      }
    }
  }, [data.length, getSvgPoint, size, effectiveView]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pt = getSvgPoint(e);
    if (mode === 'panning' && panStart.current) {
      const ps = panStart.current;
      const dx = (pt.x - ps.x) / innerW * (effectiveView.xMax - effectiveView.xMin);
      const dy = (ps.y - pt.y) / innerH * (effectiveView.yMax - effectiveView.yMin);
      setView({
        xMin: ps.vx - dx,
        xMax: ps.vx - dx + (effectiveView.xMax - effectiveView.xMin),
        yMin: ps.vy - dy,
        yMax: ps.vy - dy + (effectiveView.yMax - effectiveView.yMin)
      });
    } else if (mode === 'selecting' && selectStart.current) {
      const ss = selectStart.current;
      setSelectBox({
        x: Math.min(ss.x, pt.x),
        y: Math.min(ss.y, pt.y),
        w: Math.abs(pt.x - ss.x),
        h: Math.abs(pt.y - ss.y)
      });
    }
  }, [mode, innerW, innerH, effectiveView, getSvgPoint]);

  const handleMouseUp = useCallback(() => {
    if (mode === 'selecting' && selectBox && selectBox.w > 3 && selectBox.h > 3) {
      const xMinD = invX(selectBox.x);
      const xMaxD = invX(selectBox.x + selectBox.w);
      const yMaxD = invY(selectBox.y);
      const yMinD = invY(selectBox.y + selectBox.h);
      const x1 = Math.min(xMinD, xMaxD);
      const x2 = Math.max(xMinD, xMaxD);
      const y1 = Math.min(yMinD, yMaxD);
      const y2 = Math.max(yMinD, yMaxD);
      const indices: number[] = [];
      for (const p of data) {
        if (p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2) indices.push(p.index);
      }
      if (indices.length > 0) onBoxSelect(indices);
    }
    setMode('idle');
    panStart.current = null;
    selectStart.current = null;
    setSelectBox(null);
  }, [mode, selectBox, data, invX, invY, onBoxSelect]);

  const pointColor = useCallback((p: DataPoint) => {
    if (manualAnomalies.has(p.index)) return '#ff4d4d';
    if (autoAnomalies.has(p.index)) return '#ff9500';
    return '#6bb6ff';
  }, [manualAnomalies, autoAnomalies]);

  const pointRadius = useCallback((p: DataPoint) => {
    if (manualAnomalies.has(p.index)) return 5.4;
    if (autoAnomalies.has(p.index)) return 4.8;
    return 4.5;
  }, [manualAnomalies, autoAnomalies]);

  const renderScatter = () => {
    return (
      <g key={`scatter-${fadeKey}`} className="chart-fade">
        {data.map(p => {
          const cx = scaleX(p.x);
          const cy = scaleY(p.y);
          if (cx < MARGIN.left - 20 || cx > size.w - MARGIN.right + 20) return null;
          if (cy < MARGIN.top - 20 || cy > size.h - MARGIN.bottom + 20) return null;
          return (
            <circle
              key={p.index}
              cx={cx} cy={cy} r={pointRadius(p)}
              fill={pointColor(p)}
              opacity={0.92}
              style={{ transition: 'r 0.2s ease, fill 0.2s ease' }}
            />
          );
        })}
      </g>
    );
  };

  const renderLine = () => {
    if (data.length === 0) return null;
    const sorted = [...data].sort((a, b) => a.x - b.x);
    let pathD = '';
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const x = scaleX(p.x);
      const y = scaleY(p.y);
      pathD += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2) + ' ';
    }
    return (
      <g key={`line-${fadeKey}`} className="chart-fade">
        <path d={pathD} fill="none" stroke="#6bb6ff" strokeWidth={1.8} opacity={0.9} />
        {sorted.map(p => {
          const cx = scaleX(p.x);
          const cy = scaleY(p.y);
          return (
            <circle
              key={p.index}
              cx={cx} cy={cy} r={pointRadius(p) * 0.9}
              fill={pointColor(p)}
              style={{ transition: 'r 0.2s ease, fill 0.2s ease' }}
            />
          );
        })}
      </g>
    );
  };

  const renderBox = () => {
    if (data.length === 0) return null;
    const values = data.map(p => p.y).sort((a, b) => a - b);
    const n = values.length;
    const q1 = values[Math.floor(n * 0.25)];
    const median = values[Math.floor(n * 0.5)];
    const q3 = values[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    const lowerFence = Math.max(values[0], q1 - 1.5 * iqr);
    const upperFence = Math.min(values[n - 1], q3 + 1.5 * iqr);

    const cx = MARGIN.left + innerW / 2;
    const boxW = Math.min(160, innerW * 0.35);
    const x1 = cx - boxW / 2;
    const x2 = cx + boxW / 2;

    const yMedian = scaleY(median);
    const yQ1 = scaleY(q1);
    const yQ3 = scaleY(q3);
    const yLo = scaleY(lowerFence);
    const yHi = scaleY(upperFence);

    const outlierIndices: number[] = [];
    for (const p of data) {
      if (p.y < lowerFence || p.y > upperFence) outlierIndices.push(p.index);
    }

    return (
      <g key={`box-${fadeKey}`} className="chart-fade">
        <line x1={cx} y1={yHi} x2={cx} y2={yQ3} stroke="#ffffff60" strokeWidth={1.5} />
        <line x1={cx} y1={yLo} x2={cx} y2={yQ1} stroke="#ffffff60" strokeWidth={1.5} />
        <line x1={cx - boxW * 0.3} y1={yHi} x2={cx + boxW * 0.3} y2={yHi} stroke="#ffffff60" strokeWidth={1.5} />
        <line x1={cx - boxW * 0.3} y1={yLo} x2={cx + boxW * 0.3} y2={yLo} stroke="#ffffff60" strokeWidth={1.5} />
        <rect x={x1} y={yQ3} width={boxW} height={yQ1 - yQ3} fill="#00d4ff25" stroke="#00d4ffaa" strokeWidth={1.5} rx={3} />
        <line x1={x1} y1={yMedian} x2={x2} y2={yMedian} stroke="#ff9500" strokeWidth={2.5} />
        {data.map(p => {
          const isOut = p.y < lowerFence || p.y > upperFence;
          const cxp = cx + (Math.sin(p.index * 12.9898) * 43758.5453 % 1) * boxW * 0.35;
          if (!isOut) return null;
          return (
            <circle key={p.index} cx={cxp} cy={scaleY(p.y)} r={pointRadius(p)}
              fill={manualAnomalies.has(p.index) ? '#ff4d4d' : '#ff9500'} opacity={0.9} />
          );
        })}
      </g>
    );
  };

  const renderChart = () => {
    if (chartType === 'scatter') return renderScatter();
    if (chartType === 'line') return renderLine();
    return renderBox();
  };

  return (
    <div ref={containerRef} className="chart-container">
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: mode === 'panning' ? 'grabbing' : mode === 'selecting' ? 'crosshair' : 'grab', display: 'block' }}
      >
        <defs>
          <clipPath id="plotClip">
            <rect x={MARGIN.left} y={MARGIN.top} width={innerW} height={innerH} />
          </clipPath>
        </defs>
        <rect x={MARGIN.left} y={MARGIN.top} width={innerW} height={innerH} fill="#252538" rx={6} />
        <g>
          {ticks.x.map(t => {
            const px = scaleX(t);
            return (
              <line key={`xg-${t}`} x1={px} y1={MARGIN.top} x2={px} y2={size.h - MARGIN.bottom}
                stroke="#ffffff10" strokeWidth={1} />
            );
          })}
          {ticks.y.map(t => {
            const py = scaleY(t);
            return (
              <line key={`yg-${t}`} x1={MARGIN.left} y1={py} x2={size.w - MARGIN.right} y2={py}
                stroke="#ffffff10" strokeWidth={1} />
            );
          })}
        </g>
        <g clipPath="url(#plotClip)">
          {renderChart()}
        </g>
        <g>
          {ticks.x.map(t => {
            const px = scaleX(t);
            return (
              <g key={`xt-${t}`}>
                <line x1={px} y1={size.h - MARGIN.bottom} x2={px} y2={size.h - MARGIN.bottom + 5}
                  stroke="#ffffff40" strokeWidth={1} />
                <text x={px} y={size.h - MARGIN.bottom + 18} fill="#ffffffa0" fontSize={11}
                  textAnchor="middle" fontFamily="monospace">{formatNum(t)}</text>
              </g>
            );
          })}
          {ticks.y.map(t => {
            const py = scaleY(t);
            return (
              <g key={`yt-${t}`}>
                <line x1={MARGIN.left - 5} y1={py} x2={MARGIN.left} y2={py} stroke="#ffffff40" strokeWidth={1} />
                <text x={MARGIN.left - 8} y={py + 4} fill="#ffffffa0" fontSize={11}
                  textAnchor="end" fontFamily="monospace">{formatNum(t)}</text>
              </g>
            );
          })}
        </g>
        <line x1={MARGIN.left} y1={size.h - MARGIN.bottom} x2={size.w - MARGIN.right} y2={size.h - MARGIN.bottom}
          stroke="#ffffff40" strokeWidth={1.5} />
        <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={size.h - MARGIN.bottom}
          stroke="#ffffff40" strokeWidth={1.5} />
        <text x={MARGIN.left + innerW / 2} y={size.h - 10} fill="#ffffffc0" fontSize={12}
          textAnchor="middle">{xLabel}</text>
        <text transform={`translate(18, ${MARGIN.top + innerH / 2}) rotate(-90)`} fill="#ffffffc0"
          fontSize={12} textAnchor="middle">{yLabel}</text>
        {view && (
          <g>
            <text x={size.w - MARGIN.right} y={MARGIN.top - 10} fill="#00d4ff" fontSize={10}
              textAnchor="end" fontFamily="monospace">
              X: [{formatNum(effectiveView.xMin)}, {formatNum(effectiveView.xMax)}]
              &nbsp;&nbsp;Y: [{formatNum(effectiveView.yMin)}, {formatNum(effectiveView.yMax)}]
            </text>
          </g>
        )}
        {selectBox && (
          <rect x={selectBox.x} y={selectBox.y} width={selectBox.w} height={selectBox.h}
            fill="#ffffff18" stroke="#ffffffc0" strokeWidth={1.5} strokeDasharray="5,4"
            style={{ transition: 'fill 0.1s' }} />
        )}
        {data.length === 0 && (
          <text x={MARGIN.left + innerW / 2} y={MARGIN.top + innerH / 2} fill="#ffffff60"
            fontSize={16} textAnchor="middle">请先加载 CSV 数据并选择列</text>
        )}
      </svg>
      <div className="chart-hint">提示：按住 Shift + 左键拖拽框选异常点；滚轮缩放；拖拽平移</div>
    </div>
  );
};

function formatNum(v: number): string {
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e6)) return v.toExponential(2);
  if (abs < 10) return v.toFixed(2);
  if (abs < 1000) return v.toFixed(1);
  return Math.round(v).toString();
}

export default Chart;
