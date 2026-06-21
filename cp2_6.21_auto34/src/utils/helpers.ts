import type { GameElement, AABB } from '../types';

export function generateId(): string {
  return 'el_' + Math.random().toString(36).slice(2, 10);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createDefaultElement(
  type: GameElement['type'],
  x: number,
  y: number
): GameElement {
  const id = generateId();
  const base = {
    id,
    type,
    name: `${type}_${Date.now().toString().slice(-4)}`,
    x,
    y,
    color: '#4A90D9',
    rotation: 0,
    zIndex: 0,
    physics: {
      enabled: false,
      gravity: 0.5,
      bounciness: 0.3,
      friction: 0.1,
      vx: 0,
      vy: 0,
      isStatic: false
    },
    script: ''
  };

  if (type === 'rect') {
    return { ...base, width: 80, height: 60, radius: 0 };
  } else if (type === 'circle') {
    return { ...base, width: 0, height: 0, radius: 30 };
  } else {
    return {
      ...base,
      width: 0,
      height: 0,
      radius: 0,
      textContent: 'Hello',
      fontSize: 24,
      color: '#FFFFFF'
    };
  }
}

export function getElementAABB(el: GameElement): AABB {
  if (el.type === 'circle') {
    return {
      minX: el.x - el.radius,
      minY: el.y - el.radius,
      maxX: el.x + el.radius,
      maxY: el.y + el.radius
    };
  }
  return {
    minX: el.x - el.width / 2,
    minY: el.y - el.height / 2,
    maxX: el.x + el.width / 2,
    maxY: el.y + el.height / 2
  };
}

export function aabbIntersect(a: AABB, b: AABB): boolean {
  return (
    a.minX < b.maxX &&
    a.maxX > b.minX &&
    a.minY < b.maxY &&
    a.maxY > b.minY
  );
}

export function resolveCollision(
  a: GameElement,
  b: GameElement
): { dx: number; dy: number } {
  const boxA = getElementAABB(a);
  const boxB = getElementAABB(b);

  const overlapX = Math.min(boxA.maxX - boxB.minX, boxB.maxX - boxA.minX);
  const overlapY = Math.min(boxA.maxY - boxB.minY, boxB.maxY - boxA.minY);

  if (overlapX < overlapY) {
    const dx = boxA.minX < boxB.minX ? -overlapX / 2 : overlapX / 2;
    return { dx, dy: 0 };
  } else {
    const dy = boxA.minY < boxB.minY ? -overlapY / 2 : overlapY / 2;
    return { dx: 0, dy };
  }
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
}

export const COLOR_PALETTE = [
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#6B7280',
  '#FFFFFF',
  '#1F2937',
  '#F97316',
  '#14B8A6',
  '#4A90D9'
];
