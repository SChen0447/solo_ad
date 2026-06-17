import type { CanvasPoint, Rect, ViewState } from './types';

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export const easeOut = easeOutCubic;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: number | null = null;
  return function (this: unknown, ...args: Parameters<T>) {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => fn.apply(this, args), delay);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      window.setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

export function generateId(): string {
  return `ann_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function canvasToImageCoords(
  canvasPoint: CanvasPoint,
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number,
  imageWidth: number,
  imageHeight: number
): CanvasPoint {
  const { scale, offsetX, offsetY } = viewState;
  const imageDisplayWidth = imageWidth * scale;
  const imageDisplayHeight = imageHeight * scale;
  const imageLeft = (canvasWidth - imageDisplayWidth) / 2 + offsetX;
  const imageTop = (canvasHeight - imageDisplayHeight) / 2 + offsetY;

  const x = (canvasPoint.x - imageLeft) / scale;
  const y = (canvasPoint.y - imageTop) / scale;

  return { x, y };
}

export function imageToCanvasCoords(
  imagePoint: CanvasPoint,
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number,
  imageWidth: number,
  imageHeight: number
): CanvasPoint {
  const { scale, offsetX, offsetY } = viewState;
  const imageDisplayWidth = imageWidth * scale;
  const imageDisplayHeight = imageHeight * scale;
  const imageLeft = (canvasWidth - imageDisplayWidth) / 2 + offsetX;
  const imageTop = (canvasHeight - imageDisplayHeight) / 2 + offsetY;

  const x = imagePoint.x * scale + imageLeft;
  const y = imagePoint.y * scale + imageTop;

  return { x, y };
}

export function imageRectToCanvasRect(
  xRatio: number,
  yRatio: number,
  widthRatio: number,
  heightRatio: number,
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number,
  imageWidth: number,
  imageHeight: number
): Rect {
  const topLeft = imageToCanvasCoords(
    { x: xRatio * imageWidth, y: yRatio * imageHeight },
    viewState,
    canvasWidth,
    canvasHeight,
    imageWidth,
    imageHeight
  );
  const bottomRight = imageToCanvasCoords(
    {
      x: (xRatio + widthRatio) * imageWidth,
      y: (yRatio + heightRatio) * imageHeight,
    },
    viewState,
    canvasWidth,
    canvasHeight,
    imageWidth,
    imageHeight
  );

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

export function canvasRectToImageRatios(
  rect: Rect,
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number,
  imageWidth: number,
  imageHeight: number
): { x_ratio: number; y_ratio: number; width_ratio: number; height_ratio: number } {
  const topLeft = canvasToImageCoords(
    { x: rect.x, y: rect.y },
    viewState,
    canvasWidth,
    canvasHeight,
    imageWidth,
    imageHeight
  );
  const bottomRight = canvasToImageCoords(
    { x: rect.x + rect.width, y: rect.y + rect.height },
    viewState,
    canvasWidth,
    canvasHeight,
    imageWidth,
    imageHeight
  );

  const clampedTL = {
    x: clamp(topLeft.x, 0, imageWidth),
    y: clamp(topLeft.y, 0, imageHeight),
  };
  const clampedBR = {
    x: clamp(bottomRight.x, 0, imageWidth),
    y: clamp(bottomRight.y, 0, imageHeight),
  };

  const x = Math.min(clampedTL.x, clampedBR.x);
  const y = Math.min(clampedTL.y, clampedBR.y);
  const w = Math.abs(clampedBR.x - clampedTL.x);
  const h = Math.abs(clampedBR.y - clampedTL.y);

  return {
    x_ratio: x / imageWidth,
    y_ratio: y / imageHeight,
    width_ratio: w / imageWidth,
    height_ratio: h / imageHeight,
  };
}

export function normalizeRect(x1: number, y1: number, x2: number, y2: number): Rect {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  return { x, y, width, height };
}

export function isPointInRect(px: number, py: number, rect: Rect, padding = 0): boolean {
  return (
    px >= rect.x - padding &&
    px <= rect.x + rect.width + padding &&
    py >= rect.y - padding &&
    py <= rect.y + rect.height + padding
  );
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function getImageDisplayBounds(
  viewState: ViewState,
  canvasWidth: number,
  canvasHeight: number,
  imageWidth: number,
  imageHeight: number
): Rect {
  const { scale, offsetX, offsetY } = viewState;
  const imageDisplayWidth = imageWidth * scale;
  const imageDisplayHeight = imageHeight * scale;
  const imageLeft = (canvasWidth - imageDisplayWidth) / 2 + offsetX;
  const imageTop = (canvasHeight - imageDisplayHeight) / 2 + offsetY;
  return {
    x: imageLeft,
    y: imageTop,
    width: imageDisplayWidth,
    height: imageDisplayHeight,
  };
}
