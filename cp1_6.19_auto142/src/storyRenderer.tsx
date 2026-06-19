import React, { useEffect, useRef, useState } from 'react';
import { Story, StoryChapter, ChartConfig, ChartType } from './templateEngine';

interface ChartCanvasProps {
  config: ChartConfig;
  width?: number;
  height?: number;
}

const DEFAULT_COLORS = ['#4a90d9', '#50e3c2', '#f5a623', '#d0021b', '#9b59b6', '#2ecc71', '#e74c3c', '#3498db'];

function getColor(datasets: ChartConfig['datasets'], i: number): string {
  return datasets[i]?.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const ChartCanvas: React.FC<ChartCanvasProps> = ({ config, width = 720, height = 360 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string; visible: boolean }>({
    x: 0, y: 0, content: '', visible: false
  });
  const [dimensions, setDimensions] = useState({ w: width, h: height });

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = Math.min(width, containerRef.current.clientWidth);
        const h = (w / width) * height;
        setDimensions({ w, h });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.w * dpr;
    canvas.height = dimensions.h * dpr;
    canvas.style.width = dimensions.w + 'px';
    canvas.style.height = dimensions.h + 'px';
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, dimensions.w, dimensions.h);

    const padding = { top: 30, right: 30, bottom: 60, left: 60 };
    const chartW = dimensions.w - padding.left - padding.right;
    const chartH = dimensions.h - padding.top - padding.bottom;

    switch (config.type) {
      case 'bar':
        drawBar(ctx, config, padding, chartW, chartH, dimensions);
        break;
      case 'line':
        drawLine(ctx, config, padding, chartW, chartH, dimensions);
        break;
      case 'pie':
        drawPie(ctx, config, dimensions);
        break;
    }
  }, [config, dimensions]);

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (dimensions.w / rect.width);
    const y = (e.clientY - rect.top) * (dimensions.h / rect.height);
    const info = detectHover(config, x, y, dimensions, width, height);
    if (info) {
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        content: info,
        visible: true
      });
    } else {
      setTooltip(t => ({ ...t, visible: false }));
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: width }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', cursor: 'crosshair' }}
        onMouseMove={handleMove}
        onMouseLeave={() => setTooltip(t => ({ ...t, visible: false }))}
      />
      <div
        style={{
          position: 'absolute',
          left: tooltip.x + 12,
          top: tooltip.y - 8,
          transform: 'translateY(-100%)',
          background: 'rgba(44,62,80,0.92)',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: 6,
          fontSize: 12,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          opacity: tooltip.visible ? 1 : 0,
          transformOrigin: 'bottom left',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          ...(!tooltip.visible ? { transform: 'translateY(-100%) translateY(6px)' } : {})
        }}
      >
        {tooltip.content}
      </div>
    </div>
  );
};

function drawBar(
  ctx: CanvasRenderingContext2D,
  config: ChartConfig,
  padding: { top: number; right: number; bottom: number; left: number },
  chartW: number,
  chartH: number,
  dim: { w: number; h: number }
) {
  const { labels, datasets } = config;
  if (labels.length === 0 || datasets.length === 0) return;

  let max = 0;
  datasets.forEach(d => d.data.forEach(v => { if (v > max) max = v; }));
  max = Math.ceil(max * 1.1);
  if (max === 0) max = 1;

  ctx.strokeStyle = '#e8ecf0';
  ctx.lineWidth = 1;
  ctx.font = '11px -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = '#8c96a1';

  const gridCount = 5;
  for (let i = 0; i <= gridCount; i++) {
    const y = padding.top + (chartH / gridCount) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartW, y);
    ctx.stroke();
    const val = max * (1 - i / gridCount);
    ctx.textAlign = 'right';
    ctx.fillText(formatShort(val), padding.left - 8, y + 4);
  }

  const barGroupWidth = chartW / labels.length;
  const barCount = datasets.length;
  const barWidth = (barGroupWidth * 0.7) / barCount;
  const groupOffset = barGroupWidth * 0.15;

  datasets.forEach((ds, di) => {
    const color = getColor(datasets, di);
    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    grad.addColorStop(0, color);
    grad.addColorStop(1, hexToRgba(color, 0.6));
    ds.data.forEach((v, li) => {
      const barX = padding.left + li * barGroupWidth + groupOffset + di * barWidth;
      const barH = (v / max) * chartH;
      const barY = padding.top + chartH - barH;
      const r = Math.min(4, barWidth / 2);
      ctx.fillStyle = grad;
      roundRect(ctx, barX, barY, barWidth, barH, { tl: r, tr: r, bl: 0, br: 0 });
      ctx.fill();
    });
  });

  ctx.fillStyle = '#5a6573';
  ctx.textAlign = 'center';
  labels.forEach((lb, i) => {
    const x = padding.left + i * barGroupWidth + barGroupWidth / 2;
    const y = dim.h - padding.bottom + 18;
    ctx.save();
    if (labels.length > 10) {
      ctx.translate(x, y);
      ctx.rotate(-0.4);
      ctx.fillText(truncate(lb, 8), 0, 0);
    } else {
      ctx.fillText(truncate(lb, 12), x, y);
    }
    ctx.restore();
  });

  drawLegend(ctx, datasets, padding, dim);
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  config: ChartConfig,
  padding: { top: number; right: number; bottom: number; left: number },
  chartW: number,
  chartH: number,
  dim: { w: number; h: number }
) {
  const { labels, datasets } = config;
  if (labels.length === 0 || datasets.length === 0) return;

  let max = -Infinity, min = Infinity;
  datasets.forEach(d => d.data.forEach(v => {
    if (v > max) max = v;
    if (v < min) min = v;
  }));
  if (!isFinite(max)) max = 1;
  if (!isFinite(min)) min = 0;
  const range = max - min || 1;
  max = max + range * 0.1;
  min = Math.min(0, min - range * 0.1);
  const span = max - min;

  ctx.strokeStyle = '#e8ecf0';
  ctx.lineWidth = 1;
  ctx.font = '11px -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = '#8c96a1';
  ctx.textAlign = 'right';
  const gridCount = 5;
  for (let i = 0; i <= gridCount; i++) {
    const y = padding.top + (chartH / gridCount) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartW, y);
    ctx.stroke();
    const val = max - (span / gridCount) * i;
    ctx.fillText(formatShort(val), padding.left - 8, y + 4);
  }

  const stepX = labels.length > 1 ? chartW / (labels.length - 1) : chartW;

  datasets.forEach((ds, di) => {
    const color = getColor(datasets, di);
    const points: { x: number; y: number }[] = [];
    ds.data.forEach((v, i) => {
      const x = padding.left + stepX * i;
      const y = padding.top + ((max - v) / span) * chartH;
      points.push({ x, y });
    });

    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const cur = points[i];
        const cpx = (prev.x + cur.x) / 2;
        ctx.bezierCurveTo(cpx, prev.y, cpx, cur.y, cur.x, cur.y);
      }
      ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
      ctx.lineTo(points[0].x, padding.top + chartH);
      ctx.closePath();
      ctx.fillStyle = hexToRgba(color, 0.12);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const cur = points[i];
        const cpx = (prev.x + cur.x) / 2;
        ctx.bezierCurveTo(cpx, prev.y, cpx, cur.y, cur.x, cur.y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  });

  ctx.fillStyle = '#5a6573';
  ctx.textAlign = 'center';
  const labelStep = Math.max(1, Math.ceil(labels.length / 8));
  labels.forEach((lb, i) => {
    if (i % labelStep !== 0 && i !== labels.length - 1) return;
    const x = padding.left + stepX * i;
    const y = dim.h - padding.bottom + 18;
    ctx.fillText(truncate(lb, 10), x, y);
  });

  drawLegend(ctx, datasets, padding, dim);
}

function drawPie(
  ctx: CanvasRenderingContext2D,
  config: ChartConfig,
  dim: { w: number; h: number }
) {
  const cx = dim.w * 0.35;
  const cy = dim.h / 2;
  const r = Math.min(dim.w * 0.25, dim.h * 0.38);

  const values = config.datasets.map(d => d.data[0] || 0);
  const labels = config.labels;
  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return;

  let start = -Math.PI / 2;
  config.datasets.forEach((ds, i) => {
    const v = values[i];
    if (v <= 0) return;
    const angle = (v / total) * Math.PI * 2;
    const color = getColor(config.datasets, i);
    const end = start + angle;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    const mid = start + angle / 2;
    const tx = cx + Math.cos(mid) * (r * 0.6);
    const ty = cy + Math.sin(mid) * (r * 0.6);
    if (angle > 0.15) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${(v / total * 100).toFixed(0)}%`, tx, ty);
    }
    start = end;
  });

  ctx.textBaseline = 'alphabetic';
  const legendX = dim.w * 0.62;
  const itemH = 22;
  const startY = cy - (config.datasets.length * itemH) / 2;
  config.datasets.forEach((ds, i) => {
    const y = startY + i * itemH;
    const color = getColor(config.datasets, i);
    ctx.fillStyle = color;
    roundRect(ctx, legendX, y, 14, 14, { tl: 3, tr: 3, bl: 3, br: 3 });
    ctx.fill();
    ctx.fillStyle = '#2c3e50';
    ctx.font = '12px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    const label = `${truncate(labels[i] || ds.label, 12)}  ${formatShort(values[i])}`;
    ctx.fillText(label, legendX + 22, y + 11);
  });
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  datasets: ChartConfig['datasets'],
  padding: { top: number; right: number; bottom: number; left: number },
  dim: { w: number; h: number }
) {
  ctx.font = '12px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  const itemW = [] as number[];
  let totalW = 0;
  datasets.forEach(d => {
    const w = 16 + 6 + ctx.measureText(d.label).width;
    itemW.push(w);
    totalW += w + 16;
  });
  totalW -= 16;
  let x = dim.w / 2 - totalW / 2;
  const y = padding.top - 10;
  datasets.forEach((ds, i) => {
    const color = getColor(datasets, i);
    ctx.fillStyle = color;
    roundRect(ctx, x, y - 9, 14, 14, { tl: 3, tr: 3, bl: 3, br: 3 });
    ctx.fill();
    ctx.fillStyle = '#2c3e50';
    ctx.fillText(ds.label, x + 20, y + 2);
    x += itemW[i] + 16;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: { tl: number; tr: number; bl: number; br: number }
) {
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function formatShort(n: number): string {
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(1) + '亿';
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(1) + '万';
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  if (Math.abs(n) >= 1) return n.toFixed(1);
  return n.toFixed(2);
}

function detectHover(
  config: ChartConfig,
  x: number, y: number,
  dim: { w: number; h: number },
  baseW: number, baseH: number
): string | null {
  const padding = { top: 30, right: 30, bottom: 60, left: 60 };
  const scale = dim.w / baseW;
  const chartW = (baseW - padding.left - padding.right) * scale;
  const chartH = (baseH - padding.top - padding.bottom) * scale;
  const pLeft = padding.left * scale;
  const pTop = padding.top * scale;

  if (config.type === 'bar') {
    const labels = config.labels;
    const datasets = config.datasets;
    if (labels.length === 0) return null;
    const barGroupWidth = chartW / labels.length;
    const barCount = datasets.length;
    const barWidth = (barGroupWidth * 0.7) / barCount;
    const groupOffset = barGroupWidth * 0.15;

    let max = 0;
    datasets.forEach(d => d.data.forEach(v => { if (v > max) max = v; }));
    max = Math.ceil(max * 1.1);
    if (max === 0) max = 1;

    for (let li = 0; li < labels.length; li++) {
      for (let di = 0; di < datasets.length; di++) {
        const barX = pLeft + li * barGroupWidth + groupOffset + di * barWidth;
        const v = datasets[di].data[li] || 0;
        const barH = (v / max) * chartH;
        const barY = pTop + chartH - barH;
        if (x >= barX && x <= barX + barWidth && y >= barY && y <= pTop + chartH) {
          return `${labels[li]} · ${datasets[di].label}: ${formatShort(v)}`;
        }
      }
    }
  } else if (config.type === 'line') {
    const labels = config.labels;
    const datasets = config.datasets;
    if (labels.length < 2) return null;
    const stepX = chartW / (labels.length - 1);
    let max = -Infinity, min = Infinity;
    datasets.forEach(d => d.data.forEach(v => {
      if (v > max) max = v;
      if (v < min) min = v;
    }));
    if (!isFinite(max)) max = 1;
    if (!isFinite(min)) min = 0;
    const range = max - min || 1;
    max = max + range * 0.1;
    min = Math.min(0, min - range * 0.1);
    const span = max - min;

    for (let li = 0; li < labels.length; li++) {
      const px = pLeft + stepX * li;
      if (Math.abs(x - px) > (stepX * 0.4)) continue;
      for (let di = 0; di < datasets.length; di++) {
        const v = datasets[di].data[li];
        const py = pTop + ((max - v) / span) * chartH;
        if (Math.abs(y - py) < 30) {
          return `${labels[li]} · ${datasets[di].label}: ${formatShort(v)}`;
        }
      }
    }
  } else if (config.type === 'pie') {
    const cx = dim.w * 0.35;
    const cy = dim.h / 2;
    const r = Math.min(dim.w * 0.25, dim.h * 0.38);
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > r || dist < r * 0.1) return null;
    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) angle += Math.PI * 2;
    const values = config.datasets.map(d => d.data[0] || 0);
    const total = values.reduce((a, b) => a + b, 0) || 1;
    let start = -Math.PI / 2;
    for (let i = 0; i < config.datasets.length; i++) {
      const slice = (values[i] / total) * Math.PI * 2;
      if (angle >= start && angle < start + slice) {
        return `${config.labels[i] || config.datasets[i].label}: ${formatShort(values[i])} (${(values[i] / total * 100).toFixed(1)}%)`;
      }
      start += slice;
    }
  }
  return null;
}

interface StoryRendererProps {
  story: Story;
  onEdit?: (chapterId: string) => void;
  onReset?: (chapterId: string) => void;
  editedChapters?: Record<string, { title: string; text: string }>;
  showEdit?: boolean;
}

export const StoryRenderer: React.FC<StoryRendererProps> = ({
  story,
  onEdit,
  onReset,
  editedChapters = {},
  showEdit = true
}) => {
  return (
    <div className="story-page" style={{
      padding: '48px 40px',
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
      maxWidth: 960,
      margin: '0 auto',
      position: 'relative'
    }}>
      <header style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{
          fontSize: 36,
          fontWeight: 700,
          color: '#2c3e50',
          fontFamily: '"Noto Serif SC", "Source Han Serif SC", Georgia, "Times New Roman", serif',
          margin: 0,
          letterSpacing: 1.5,
          lineHeight: 1.3
        }}>{story.title}</h1>
        <div style={{
          width: 200,
          height: 3,
          margin: '28px auto 0',
          background: 'linear-gradient(90deg, rgba(74,144,217,0.15), rgba(80,227,194,0.45), rgba(74,144,217,0.15))',
          borderRadius: 2
        }} />
      </header>

      {story.chapters.map((ch, idx) => {
        const edited = editedChapters[ch.id];
        const title = edited?.title ?? ch.title;
        const text = edited?.text ?? ch.text;
        const isTextFirst = idx % 2 === 0;

        return (
          <section
            key={ch.id}
            style={{
              marginBottom: 56,
              padding: '24px 28px',
              background: idx % 2 === 0 ? 'rgba(74,144,217,0.03)' : 'rgba(80,227,194,0.03)',
              borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.04)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 16, gap: 12 }}>
              <span style={{
                fontFamily: '"Noto Serif SC", Georgia, serif',
                fontSize: 14,
                color: '#4a90d9',
                fontWeight: 600,
                background: 'rgba(74,144,217,0.08)',
                padding: '4px 10px',
                borderRadius: 4,
                flexShrink: 0
              }}>第 {idx + 1} 章</span>
              <h2 style={{
                fontSize: 22,
                fontWeight: 600,
                color: '#2c3e50',
                margin: 0,
                fontFamily: '"Noto Serif SC", "Source Han Serif SC", Georgia, serif',
                lineHeight: 1.4,
                flex: 1
              }}>{title}</h2>
              {showEdit && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => onEdit?.(ch.id)}
                    title="编辑章节"
                    style={{
                      background: 'transparent',
                      border: '1px solid #e1e8ee',
                      borderRadius: 6,
                      padding: '6px 10px',
                      cursor: 'pointer',
                      color: '#4a90d9',
                      fontSize: 14,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget.querySelector('.pencil') as HTMLElement | null)?.style.setProperty('transform', 'rotate(15deg)');
                      e.currentTarget.style.borderColor = '#4a90d9';
                      e.currentTarget.style.background = 'rgba(74,144,217,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget.querySelector('.pencil') as HTMLElement | null)?.style.setProperty('transform', 'rotate(0)');
                      e.currentTarget.style.borderColor = '#e1e8ee';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span className="pencil" style={{ transition: 'transform 0.25s ease', display: 'inline-block' }}>✏️</span>
                    编辑
                  </button>
                  {edited && (
                    <button
                      onClick={() => onReset?.(ch.id)}
                      title="恢复原始版本"
                      style={{
                        background: 'transparent',
                        border: '1px solid #e1e8ee',
                        borderRadius: 6,
                        padding: '6px 10px',
                        cursor: 'pointer',
                        color: '#d0021b',
                        fontSize: 14,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#d0021b';
                        e.currentTarget.style.background = 'rgba(208,2,27,0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e1e8ee';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      ↺ 重置
                    </button>
                  )}
                </div>
              )}
            </div>

            <div style={{
              display: 'flex',
              gap: 28,
              alignItems: 'flex-start',
              flexDirection: isTextFirst ? 'row' : 'row-reverse',
              flexWrap: 'wrap'
            }}>
              <div style={{
                flex: '1 1 320px',
                minWidth: 0,
                fontSize: 15,
                lineHeight: 1.9,
                color: '#2c3e50',
                fontFamily: '"Noto Serif SC", "Source Han Serif SC", Georgia, "Times New Roman", serif',
                letterSpacing: 0.3
              }}>
                <p style={{ margin: 0, textIndent: '2em', textAlign: 'justify' }}>{text}</p>
              </div>

              {ch.chart && (
                <div style={{
                  flex: '1 1 360px',
                  minWidth: 0,
                  background: '#fff',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #eef1f5'
                }}>
                  <ChartCanvas config={ch.chart} width={560} height={300} />
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export function exportStoryToHTML(story: Story, editedChapters: Record<string, { title: string; text: string }> = {}): string {
  const chaptersHTML = story.chapters.map((ch, idx) => {
    const edited = editedChapters[ch.id];
    const title = edited?.title ?? ch.title;
    const text = edited?.text ?? ch.text;
    const isTextFirst = idx % 2 === 0;
    const chartHTML = ch.chart ? buildChartHTML(ch.chart, idx) : '';
    const textDiv = `<div style="flex:1 1 320px;min-width:0;font-size:15px;line-height:1.9;color:#2c3e50;font-family:Georgia,'Times New Roman',serif;letter-spacing:0.3"><p style="margin:0;text-indent:2em;text-align:justify">${escapeHTML(text)}</p></div>`;
    const flexDir = isTextFirst ? 'row' : 'row-reverse';
    const bg = idx % 2 === 0 ? 'rgba(74,144,217,0.03)' : 'rgba(80,227,194,0.03)';
    return `
<section style="margin-bottom:56px;padding:24px 28px;background:${bg};border-radius:12px;border:1px solid rgba(0,0,0,0.04)">
  <div style="display:flex;align-items:baseline;margin-bottom:16px;gap:12">
    <span style="font-family:Georgia,serif;font-size:14px;color:#4a90d9;font-weight:600;background:rgba(74,144,217,0.08);padding:4px 10px;border-radius:4px">第 ${idx + 1} 章</span>
    <h2 style="font-size:22px;font-weight:600;color:#2c3e50;margin:0;font-family:Georgia,serif;line-height:1.4;flex:1">${escapeHTML(title)}</h2>
  </div>
  <div style="display:flex;gap:28px;align-items:flex-start;flex-direction:${flexDir};flex-wrap:wrap">
    ${textDiv}
    ${chartHTML}
  </div>
</section>`;
  }).join('\n');

  const chartDataScript = story.chapters.map((ch, idx) => {
    if (!ch.chart) return '';
    return `window.__chart_${idx} = ${JSON.stringify(ch.chart)};`;
  }).join('\n');

  const initCharts = story.chapters.map((ch, idx) => {
    if (!ch.chart) return '';
    return `
  (function(){
    var cfg = window.__chart_${idx};
    if(!cfg) return;
    var ctx = document.getElementById('chart-${idx}');
    if(!ctx) return;
    new Chart(ctx, {
      type: cfg.type === 'pie' ? 'doughnut' : cfg.type,
      data: {
        labels: cfg.labels,
        datasets: cfg.type === 'pie' ? [{
          data: cfg.datasets.map(function(d){ return d.data[0]; }),
          backgroundColor: cfg.datasets.map(function(d,i){ return d.color || ['#4a90d9','#50e3c2','#f5a623','#d0021b','#9b59b6','#2ecc71','#e74c3c','#3498db'][i%8]; }),
          borderColor: '#fff',
          borderWidth: 2
        }] : cfg.datasets.map(function(d,i){
          var c = d.color || ['#4a90d9','#50e3c2','#f5a623','#d0021b','#9b59b6','#2ecc71','#e74c3c','#3498db'][i%8];
          return {
            label: d.label,
            data: d.data,
            borderColor: c,
            backgroundColor: cfg.type === 'line' ? hexToRgba(c,0.12) : c,
            fill: cfg.type === 'line',
            tension: 0.35,
            borderWidth: cfg.type === 'line' ? 2.5 : 1,
            pointRadius: cfg.type === 'line' ? 3.5 : 0,
            pointBackgroundColor: '#fff',
            pointBorderColor: c,
            pointBorderWidth: 2,
            borderRadius: cfg.type === 'bar' ? 4 : 0,
            borderSkipped: cfg.type === 'bar' ? 'bottom' : false
          };
        })
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 16/9,
        plugins: {
          legend: { position: 'top', labels: { color: '#2c3e50', font: { size: 12 }, usePointStyle: true, padding: 16 } },
          tooltip: { backgroundColor: 'rgba(44,62,80,0.92)', titleFont: { size: 12 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 6 }
        },
        scales: cfg.type === 'pie' ? {} : {
          x: { ticks: { color: '#5a6573', font: { size: 11 }, maxRotation: cfg.labels.length > 10 ? 30 : 0, autoSkip: true }, grid: { display: false } },
          y: { ticks: { color: '#8c96a1', font: { size: 11 }, callback: function(v){ return formatShort(v); } }, grid: { color: '#eef1f5' }, beginAtZero: cfg.type === 'bar' }
        }
      }
    });
  })();`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHTML(story.title)}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 40px 20px;
    background: #f5f7fa;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    color: #2c3e50;
    -webkit-font-smoothing: antialiased;
  }
  .story-wrap {
    max-width: 960px;
    margin: 0 auto;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    padding: 48px 40px;
  }
  header { text-align: center; margin-bottom: 48px; }
  header h1 {
    font-size: 36px;
    font-weight: 700;
    color: #2c3e50;
    font-family: Georgia, 'Times New Roman', serif;
    margin: 0;
    letter-spacing: 1.5px;
    line-height: 1.3;
  }
  .divider {
    width: 200px;
    height: 3px;
    margin: 28px auto 0;
    background: linear-gradient(90deg, rgba(74,144,217,0.15), rgba(80,227,194,0.45), rgba(74,144,217,0.15));
    border-radius: 2px;
  }
  .chart-wrap {
    flex: 1 1 360px;
    min-width: 0;
    background: #fff;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid #eef1f5;
  }
  @media (max-width: 768px) {
    body { padding: 16px 8px; }
    .story-wrap { padding: 24px 16px; }
    header h1 { font-size: 26px; }
  }
</style>
</head>
<body>
  <div class="story-wrap">
    <header>
      <h1>${escapeHTML(story.title)}</h1>
      <div class="divider"></div>
    </header>
    ${chaptersHTML}
  </div>
<script>
${chartDataScript}
function hexToRgba(hex, alpha) {
  var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return 'rgba('+r+','+g+','+b+','+alpha+')';
}
function formatShort(n) {
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(1) + '亿';
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(1) + '万';
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  if (Math.abs(n) >= 1) return n.toFixed(1);
  return n.toFixed(2);
}
if (typeof Chart !== 'undefined') {
${initCharts}
}
</script>
</body>
</html>`;
}

function buildChartHTML(config: ChartConfig, idx: number): string {
  return `<div style="flex:1 1 360px;min-width:0;background:#fff;padding:12px;border-radius:8px;border:1px solid #eef1f5">
      <canvas id="chart-${idx}"></canvas>
    </div>`;
}

function escapeHTML(s: string): string {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c] as string));
}

export default StoryRenderer;
