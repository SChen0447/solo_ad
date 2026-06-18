import type {
  BoardElement,
  RectangleElement,
  CircleElement,
  LineElement,
  PenElement,
  StickyElement,
} from '../types';

const GRID_SIZE = 20;
const GRID_COLOR = '#2a2a2a';
const BACKGROUND_COLOR = '#1e1e1e';

export interface ViewTransform {
  zoom: number;
  panX: number;
  panY: number;
}

export const drawGrid = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  transform: ViewTransform
): void => {
  ctx.save();
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, width, height);

  const { zoom, panX, panY } = transform;
  const gridSize = GRID_SIZE * zoom;

  const offsetX = ((panX % gridSize) + gridSize) % gridSize;
  const offsetY = ((panY % gridSize) + gridSize) % gridSize;

  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let x = offsetX; x < width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }

  for (let y = offsetY; y < height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }

  ctx.stroke();
  ctx.restore();
};

export const screenToWorld = (
  screenX: number,
  screenY: number,
  transform: ViewTransform
): { x: number; y: number } => {
  return {
    x: (screenX - transform.panX) / transform.zoom,
    y: (screenY - transform.panY) / transform.zoom,
  };
};

export const worldToScreen = (
  worldX: number,
  worldY: number,
  transform: ViewTransform
): { x: number; y: number } => {
  return {
    x: worldX * transform.zoom + transform.panX,
    y: worldY * transform.zoom + transform.panY,
  };
};

const applyAnimation = (element: BoardElement): { opacity: number; scale: number } => {
  let opacity = element.opacity ?? 1;
  let scale = 1;

  if (element.isAnimating && element.animationStart) {
    const elapsed = Date.now() - element.animationStart;
    const duration = 300;
    const progress = Math.min(elapsed / duration, 1);

    const easeOutCubic = 1 - Math.pow(1 - progress, 3);
    opacity = easeOutCubic;
    scale = 0.5 + 0.5 * easeOutCubic;

    if (progress >= 1) {
      element.isAnimating = false;
    }
  }

  return { opacity, scale };
};

export const drawElement = (
  ctx: CanvasRenderingContext2D,
  element: BoardElement,
  transform: ViewTransform,
  isSelected: boolean = false
): boolean => {
  const { zoom } = transform;
  const { opacity, scale } = applyAnimation(element);

  if (opacity <= 0) return element.isAnimating ?? false;

  ctx.save();
  ctx.globalAlpha = opacity;

  switch (element.type) {
    case 'rectangle':
      drawRectangle(ctx, element as RectangleElement, zoom, scale, isSelected);
      break;
    case 'circle':
      drawCircle(ctx, element as CircleElement, zoom, scale, isSelected);
      break;
    case 'line':
      drawLine(ctx, element as LineElement, zoom, scale, isSelected);
      break;
    case 'pen':
      drawPen(ctx, element as PenElement, zoom, scale, isSelected);
      break;
    case 'sticky':
      drawSticky(ctx, element as StickyElement, zoom, scale, isSelected);
      break;
  }

  ctx.restore();
  return element.isAnimating ?? false;
};

const drawRectangle = (
  ctx: CanvasRenderingContext2D,
  element: RectangleElement,
  zoom: number,
  scale: number,
  isSelected: boolean
): void => {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const w = element.width * scale;
  const h = element.height * scale;
  const x = cx - w / 2;
  const y = cy - h / 2;

  ctx.strokeStyle = element.color;
  ctx.lineWidth = element.strokeWidth * zoom;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeRect(x * zoom, y * zoom, w * zoom, h * zoom);

  if (isSelected) {
    drawSelectionHandles(ctx, x, y, w, h, zoom);
  }
};

const drawCircle = (
  ctx: CanvasRenderingContext2D,
  element: CircleElement,
  zoom: number,
  scale: number,
  isSelected: boolean
): void => {
  const rx = element.radiusX * scale;
  const ry = element.radiusY * scale;

  ctx.strokeStyle = element.color;
  ctx.lineWidth = element.strokeWidth * zoom;
  ctx.beginPath();
  ctx.ellipse(
    element.x * zoom,
    element.y * zoom,
    rx * zoom,
    ry * zoom,
    0,
    0,
    Math.PI * 2
  );
  ctx.stroke();

  if (isSelected) {
    drawSelectionHandles(
      ctx,
      element.x - rx,
      element.y - ry,
      rx * 2,
      ry * 2,
      zoom
    );
  }
};

const drawLine = (
  ctx: CanvasRenderingContext2D,
  element: LineElement,
  zoom: number,
  _scale: number,
  isSelected: boolean
): void => {
  ctx.strokeStyle = element.color;
  ctx.lineWidth = element.strokeWidth * zoom;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(element.x * zoom, element.y * zoom);
  ctx.lineTo(element.x2 * zoom, element.y2 * zoom);
  ctx.stroke();

  if (isSelected) {
    const minX = Math.min(element.x, element.x2);
    const minY = Math.min(element.y, element.y2);
    const maxX = Math.max(element.x, element.x2);
    const maxY = Math.max(element.y, element.y2);
    drawSelectionHandles(ctx, minX, minY, maxX - minX, maxY - minY, zoom);
  }
};

const bezierSmooth = (points: { x: number; y: number }[]): { x: number; y: number }[] => {
  if (points.length < 3) return points;

  const result: { x: number; y: number }[] = [points[0]];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    const steps = 5;
    for (let t = 1; t <= steps; t++) {
      const tt = t / steps;
      const mt = 1 - tt;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      const t2 = tt * tt;
      const t3 = t2 * tt;

      const x = mt3 * p1.x + 3 * mt2 * tt * cp1x + 3 * mt * t2 * cp2x + t3 * p2.x;
      const y = mt3 * p1.y + 3 * mt2 * tt * cp1y + 3 * mt * t2 * cp2y + t3 * p2.y;

      result.push({ x, y });
    }
  }

  return result;
};

const drawPen = (
  ctx: CanvasRenderingContext2D,
  element: PenElement,
  zoom: number,
  _scale: number,
  isSelected: boolean
): void => {
  if (element.points.length < 2) return;

  const smoothed = bezierSmooth(element.points);

  ctx.strokeStyle = element.color;
  ctx.lineWidth = element.strokeWidth * zoom;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(smoothed[0].x * zoom, smoothed[0].y * zoom);

  for (let i = 1; i < smoothed.length; i++) {
    ctx.lineTo(smoothed[i].x * zoom, smoothed[i].y * zoom);
  }
  ctx.stroke();

  if (isSelected) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    element.points.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
    drawSelectionHandles(ctx, minX, minY, maxX - minX, maxY - minY, zoom);
  }
};

const drawSticky = (
  ctx: CanvasRenderingContext2D,
  element: StickyElement,
  zoom: number,
  scale: number,
  isSelected: boolean
): void => {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const w = element.width * scale;
  const h = element.height * scale;
  const x = cx - w / 2;
  const y = cy - h / 2;

  ctx.fillStyle = element.color;
  const radius = 4 * zoom;
  const x0 = x * zoom;
  const y0 = y * zoom;
  const w0 = w * zoom;
  const h0 = h * zoom;

  ctx.beginPath();
  ctx.moveTo(x0 + radius, y0);
  ctx.lineTo(x0 + w0 - radius, y0);
  ctx.quadraticCurveTo(x0 + w0, y0, x0 + w0, y0 + radius);
  ctx.lineTo(x0 + w0, y0 + h0 - radius);
  ctx.quadraticCurveTo(x0 + w0, y0 + h0, x0 + w0 - radius, y0 + h0);
  ctx.lineTo(x0 + radius, y0 + h0);
  ctx.quadraticCurveTo(x0, y0 + h0, x0, y0 + h0 - radius);
  ctx.lineTo(x0, y0 + radius);
  ctx.quadraticCurveTo(x0, y0, x0 + radius, y0);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 4 * zoom;
  ctx.shadowOffsetX = 2 * zoom;
  ctx.shadowOffsetY = 2 * zoom;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  if (element.text) {
    ctx.fillStyle = '#333333';
    ctx.font = `${14 * zoom}px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif`;
    ctx.textBaseline = 'top';

    const padding = 12 * zoom;
    const lines = element.text.split('\n');
    let textY = y0 + padding;
    const lineHeight = 21 * zoom;

    lines.forEach((line) => {
      if (textY + lineHeight < y0 + h0 - padding) {
        ctx.fillText(line, x0 + padding, textY, w0 - padding * 2);
        textY += lineHeight;
      }
    });
  }

  if (isSelected) {
    drawSelectionHandles(ctx, x, y, w, h, zoom);
  }
};

const drawSelectionHandles = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  zoom: number
): void => {
  ctx.save();
  ctx.strokeStyle = '#4a90d9';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(x * zoom, y * zoom, w * zoom, h * zoom);
  ctx.setLineDash([]);

  ctx.fillStyle = '#4a90d9';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;

  const handleSize = 10;
  const positions = [
    { hx: x, hy: y },
    { hx: x + w / 2, hy: y },
    { hx: x + w, hy: y },
    { hx: x, hy: y + h / 2 },
    { hx: x + w, hy: y + h / 2 },
    { hx: x, hy: y + h },
    { hx: x + w / 2, hy: y + h },
    { hx: x + w, hy: y + h },
  ];

  positions.forEach(({ hx, hy }) => {
    ctx.fillRect(
      hx * zoom - handleSize / 2,
      hy * zoom - handleSize / 2,
      handleSize,
      handleSize
    );
    ctx.strokeRect(
      hx * zoom - handleSize / 2,
      hy * zoom - handleSize / 2,
      handleSize,
      handleSize
    );
  });

  ctx.restore();
};

export const drawPreview = (
  ctx: CanvasRenderingContext2D,
  tool: string,
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  color: string,
  strokeWidth: number,
  zoom: number
): void => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth * zoom;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([8, 6]);

  switch (tool) {
    case 'rectangle': {
      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const w = Math.abs(currentX - startX);
      const h = Math.abs(currentY - startY);
      ctx.strokeRect(x, y, w, h);
      break;
    }
    case 'circle': {
      const cx = (startX + currentX) / 2;
      const cy = (startY + currentY) / 2;
      const rx = Math.abs(currentX - startX) / 2;
      const ry = Math.abs(currentY - startY) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'line': {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
};

export const drawPenPoints = (
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  color: string,
  strokeWidth: number,
  zoom: number
): void => {
  if (points.length < 2) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth * zoom;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const smoothed = bezierSmooth(points);
  ctx.beginPath();
  ctx.moveTo(smoothed[0].x, smoothed[0].y);
  for (let i = 1; i < smoothed.length; i++) {
    ctx.lineTo(smoothed[i].x, smoothed[i].y);
  }
  ctx.stroke();
  ctx.restore();
};

export const hitTestElement = (
  element: BoardElement,
  worldX: number,
  worldY: number
): boolean => {
  const margin = 5;

  switch (element.type) {
    case 'rectangle':
    case 'sticky': {
      const el = element as RectangleElement | StickyElement;
      const x = Math.min(el.x, el.x + el.width);
      const y = Math.min(el.y, el.y + el.height);
      const w = Math.abs(el.width);
      const h = Math.abs(el.height);
      return (
        worldX >= x - margin &&
        worldX <= x + w + margin &&
        worldY >= y - margin &&
        worldY <= y + h + margin
      );
    }
    case 'circle': {
      const el = element as CircleElement;
      const dx = (worldX - el.x) / Math.max(el.radiusX, 1);
      const dy = (worldY - el.y) / Math.max(el.radiusY, 1);
      return dx * dx + dy * dy <= 1.1;
    }
    case 'line': {
      const el = element as LineElement;
      const lineWidth = el.strokeWidth + margin;
      const dist = pointToLineDistance(worldX, worldY, el.x, el.y, el.x2, el.y2);
      return dist <= lineWidth;
    }
    case 'pen': {
      const el = element as PenElement;
      if (el.points.length < 2) return false;
      for (let i = 0; i < el.points.length - 1; i++) {
        const p1 = el.points[i];
        const p2 = el.points[i + 1];
        const dist = pointToLineDistance(worldX, worldY, p1.x, p1.y, p2.x, p2.y);
        if (dist <= el.strokeWidth + margin) return true;
      }
      return false;
    }
  }
};

const pointToLineDistance = (
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number => {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = lenSq !== 0 ? dot / lenSq : -1;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
};
