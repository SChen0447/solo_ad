import type { IdeaCardData } from '../types';
import { CARD_WIDTH, CARD_HEIGHT } from '../types';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function checkCollision(rect1: Rect, rect2: Rect): boolean {
  return (
    rect1.x < rect2.x + rect2.w &&
    rect1.x + rect1.w > rect2.x &&
    rect1.y < rect2.y + rect2.h &&
    rect1.y + rect1.h > rect2.y
  );
}

export function pointInRect(px: number, py: number, rect: Rect): boolean {
  return (
    px >= rect.x &&
    px <= rect.x + rect.w &&
    py >= rect.y &&
    py <= rect.y + rect.h
  );
}

export function generateRandomLayout(
  existingCards: IdeaCardData[],
  containerW: number,
  containerH: number,
  cardW: number = CARD_WIDTH,
  cardH: number = CARD_HEIGHT,
  maxAttempts = 50,
): { x: number; y: number } {
  const padding = 20;
  const existingRects = existingCards.map((c) => ({
    x: c.x,
    y: c.y,
    w: cardW,
    h: cardH,
  }));

  for (let i = 0; i < maxAttempts; i++) {
    const x = padding + Math.random() * Math.max(1, containerW - cardW - padding * 2);
    const y = padding + Math.random() * Math.max(1, containerH - cardH - padding * 2);
    const newRect: Rect = { x, y, w: cardW, h: cardH };
    let overlap = false;
    for (const r of existingRects) {
      if (checkCollision(newRect, r)) {
        overlap = true;
        break;
      }
    }
    if (!overlap) return { x, y };
  }

  return {
    x: padding + Math.random() * Math.max(1, containerW - cardW - padding * 2),
    y: padding + Math.random() * Math.max(1, containerH - cardH - padding * 2),
  };
}

export function generateCardId(): string {
  return 'c_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
