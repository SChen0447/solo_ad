export interface Point {
  x: number;
  y: number;
  pressure: number;
}

export type BrushType = 'hard' | 'soft' | 'marker';

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  brushSize: number;
  brushType: BrushType;
  timestamp: number;
}

const CANVAS_BG = '#f5f0e1';

function generateNoise(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imgData = ctx.createImageData(w, h);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 12;
    data[i] = Math.max(0, Math.min(255, 245 + noise));
    data[i + 1] = Math.max(0, Math.min(255, 240 + noise));
    data[i + 2] = Math.max(0, Math.min(255, 225 + noise));
    data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
}

export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = CANVAS_BG;
  ctx.fillRect(0, 0, w, h);
  generateNoise(ctx, w, h);
}

function getBrushRadius(baseSize: number, pressure: number, type: BrushType): number {
  switch (type) {
    case 'hard':
      return baseSize / 2;
    case 'soft':
      return (baseSize / 2) * (0.4 + pressure * 0.9);
    case 'marker':
      return (baseSize / 2) * (0.8 + pressure * 0.4);
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  color: string,
  brushSize: number,
  brushType: BrushType
) {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 1.5));
  const rgb = hexToRgb(color);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    const pressure = from.pressure + (to.pressure - from.pressure) * t;
    const radius = getBrushRadius(brushSize, pressure, brushType);

    ctx.beginPath();

    if (brushType === 'hard') {
      ctx.fillStyle = color;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (brushType === 'soft') {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.95)`);
      gradient.addColorStop(0.6, `rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`);
      gradient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
      ctx.fillStyle = gradient;
      ctx.arc(x, y, radius * 1.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (brushType === 'marker') {
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`;
      ctx.arc(x, y, radius * 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`;
      ctx.arc(x + 0.5, y + 0.5, radius * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  progress: number = 1
) {
  if (stroke.points.length < 2) return;
  const totalPoints = stroke.points.length;
  const endIdx = Math.max(1, Math.floor(totalPoints * progress));

  for (let i = 1; i < endIdx; i++) {
    drawLine(
      ctx,
      stroke.points[i - 1],
      stroke.points[i],
      stroke.color,
      stroke.brushSize,
      stroke.brushType
    );
  }
}

export function eraseStrokeWithAnimation(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  progress: number
) {
  const totalPoints = stroke.points.length;
  const keepCount = Math.max(0, Math.floor(totalPoints * (1 - progress)));
  return { ...stroke, points: stroke.points.slice(0, keepCount) };
}

export function redrawCanvas(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  w: number,
  h: number,
  upToIndex?: number
) {
  drawBackground(ctx, w, h);
  const limit = upToIndex !== undefined ? upToIndex : strokes.length;
  for (let i = 0; i < limit; i++) {
    drawStroke(ctx, strokes[i]);
  }
}

export function renderPartialStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  w: number,
  h: number,
  existingStrokes: Stroke[],
  progress: number
) {
  drawBackground(ctx, w, h);
  for (const s of existingStrokes) {
    drawStroke(ctx, s);
  }
  drawStroke(ctx, stroke, progress);
}
