import type { Cell, MineralRarity } from './planetEngine';
import { getMineralColor } from './planetEngine';

export type DrillLevel = 'copper' | 'silver' | 'gold';

export interface DrillingState {
  active: boolean;
  cell: Cell | null;
  progress: number;
  lastStepTime: number;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  opacity: number;
  offsetY: number;
  scale: number;
}

export interface CollapseAnimation {
  cellX: number;
  cellY: number;
  progress: number;
}

const DRILL_SPEEDS: Record<DrillLevel, number> = {
  copper: 0.05,
  silver: 0.08,
  gold: 0.12,
};

const DRILL_COLORS: Record<DrillLevel, string> = {
  copper: '#B87333',
  silver: '#C0C0C0',
  gold: '#FFD700',
};

export function getDrillColor(level: DrillLevel): string {
  return DRILL_COLORS[level];
}

export function getDrillSpeed(level: DrillLevel): number {
  return DRILL_SPEEDS[level];
}

export function getDrillName(level: DrillLevel): string {
  switch (level) {
    case 'copper':
      return '铜钻';
    case 'silver':
      return '银钻';
    case 'gold':
      return '金钻';
  }
}

export function createDrillingState(): DrillingState {
  return {
    active: false,
    cell: null,
    progress: 0,
    lastStepTime: 0,
  };
}

export function startDrilling(state: DrillingState, cell: Cell): boolean {
  if (cell.mined || state.active) {
    return false;
  }
  state.active = true;
  state.cell = cell;
  state.progress = 0;
  state.lastStepTime = performance.now();
  return true;
}

export function updateDrilling(
  state: DrillingState,
  drillLevel: DrillLevel,
  deltaTime: number
): boolean {
  if (!state.active || !state.cell) {
    return false;
  }

  const speed = getDrillSpeed(drillLevel);
  state.progress += speed * deltaTime * 60;

  if (state.progress >= 1) {
    state.progress = 1;
    return true;
  }

  return false;
}

export function completeDrilling(state: DrillingState): {
  rarity: MineralRarity | null;
  amount: number;
} {
  if (!state.cell) {
    return { rarity: null, amount: 0 };
  }

  const cell = state.cell;
  cell.mined = true;

  const result = {
    rarity: cell.mineral,
    amount: cell.mineralAmount,
  };

  state.active = false;
  state.cell = null;
  state.progress = 0;

  return result;
}

let floatingTextIdCounter = 0;

export function createFloatingText(
  x: number,
  y: number,
  text: string,
  color: string
): FloatingText {
  return {
    id: floatingTextIdCounter++,
    x,
    y,
    text,
    color,
    opacity: 1,
    offsetY: 0,
    scale: 0.5,
  };
}

export function updateFloatingText(ft: FloatingText, deltaTime: number): boolean {
  ft.offsetY += 30 * deltaTime;
  ft.opacity -= 0.8 * deltaTime;
  ft.scale = Math.min(1, ft.scale + 2 * deltaTime);
  return ft.opacity > 0;
}

export function drawDrillProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
  rarity: MineralRarity | null
): void {
  const barWidth = 64;
  const barHeight = 8;
  const borderRadius = 4;

  const barX = x - barWidth / 2;
  const barY = y - barHeight / 2;

  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, borderRadius);
  ctx.fill();

  const fillWidth = Math.max(0, Math.min(barWidth, barWidth * progress));
  const fillColor = rarity ? getMineralColor(rarity) : '#FFD700';

  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.roundRect(barX, barY, fillWidth, barHeight, borderRadius);
  ctx.fill();
}

export function drawFloatingText(ctx: CanvasRenderingContext2D, ft: FloatingText): void {
  ctx.save();
  ctx.globalAlpha = ft.opacity;
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.shadowColor = ft.color;
  ctx.shadowBlur = 10;
  ctx.fillStyle = ft.color;

  const drawY = ft.y + ft.offsetY;
  ctx.setTransform(ft.scale, 0, 0, ft.scale, ft.x, drawY);
  ctx.fillText(ft.text, 0, 0);

  ctx.restore();
}
