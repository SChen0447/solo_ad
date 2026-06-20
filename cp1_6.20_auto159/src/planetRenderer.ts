import type { Planet, Cell, MineralRarity } from './planetEngine';
import { getCellColor, getMineralColor } from './planetEngine';
import type { DrillingState, FloatingText, DrillLevel } from './drillLogic';
import { drawDrillProgressBar, drawFloatingText, getDrillColor } from './drillLogic';

export interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface RendererState {
  stars: Star[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  hoveredCell: { x: number; y: number } | null;
  fadeInTime: number;
  shipX: number;
  shipY: number;
  shipHovered: boolean;
  shipDragging: boolean;
  shipSize: number;
}

const STAR_COUNT = 200;
const FADE_IN_DURATION = 500;
const SHIP_SIZE = 64;

export function createRendererState(canvasWidth: number, canvasHeight: number): RendererState {
  const stars: Star[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      size: 1 + Math.random() * 2,
      alpha: 0.2 + Math.random() * 0.6,
      twinkleSpeed: 0.5 + Math.random() * 1.5,
      twinklePhase: Math.random() * Math.PI * 2,
    });
  }

  return {
    stars,
    particles: [],
    floatingTexts: [],
    hoveredCell: null,
    fadeInTime: 0,
    shipX: 0,
    shipY: 0,
    shipHovered: false,
    shipDragging: false,
    shipSize: SHIP_SIZE,
  };
}

export function addParticles(
  state: RendererState,
  x: number,
  y: number,
  color: string,
  count: number
): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 100;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5,
      maxLife: 0.5,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

export function updateParticles(state: RendererState, deltaTime: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life -= deltaTime;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }
}

export function updateStars(stars: Star[], deltaTime: number): void {
  for (const star of stars) {
    star.twinklePhase += star.twinkleSpeed * deltaTime;
  }
}

export function drawStars(ctx: CanvasRenderingContext2D, stars: Star[], time: number): void {
  for (const star of stars) {
    const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;
    const alpha = star.alpha * twinkle;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPlanet(
  ctx: CanvasRenderingContext2D,
  planet: Planet,
  offsetX: number,
  offsetY: number,
  fadeProgress: number
): void {
  const totalCells = planet.gridSize * planet.gridSize;
  const visibleCells = Math.floor(totalCells * fadeProgress);

  for (let y = 0; y < planet.gridSize; y++) {
    for (let x = 0; x < planet.gridSize; x++) {
      const cellIndex = y * planet.gridSize + x;
      if (cellIndex >= visibleCells) {
        return;
      }

      const cell = planet.cells[y][x];
      const px = offsetX + x * planet.cellSize;
      const py = offsetY + y * planet.cellSize;

      const cellProgress = fadeProgress * totalCells - cellIndex;
      const alpha = Math.min(1, cellProgress * 2);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = getCellColor(cell);
      ctx.fillRect(px, py, planet.cellSize, planet.cellSize);

      if (!cell.mined && cell.mineral) {
        const mineralAlpha = alpha * 0.6;
        ctx.globalAlpha = mineralAlpha;
        ctx.fillStyle = getMineralColor(cell.mineral);
        const dotSize = planet.cellSize * 0.25;
        ctx.beginPath();
        ctx.arc(
          px + planet.cellSize / 2,
          py + planet.cellSize / 2,
          dotSize,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    }
  }
}

export function drawGridLines(
  ctx: CanvasRenderingContext2D,
  planet: Planet,
  offsetX: number,
  offsetY: number
): void {
  ctx.strokeStyle = 'rgba(0, 191, 255, 0.2)';
  ctx.lineWidth = 1;

  for (let x = 0; x <= planet.gridSize; x++) {
    const px = offsetX + x * planet.cellSize;
    ctx.beginPath();
    ctx.moveTo(px, offsetY);
    ctx.lineTo(px, offsetY + planet.gridSize * planet.cellSize);
    ctx.stroke();
  }

  for (let y = 0; y <= planet.gridSize; y++) {
    const py = offsetY + y * planet.cellSize;
    ctx.beginPath();
    ctx.moveTo(offsetX, py);
    ctx.lineTo(offsetX + planet.gridSize * planet.cellSize, py);
    ctx.stroke();
  }
}

export function drawHoveredCell(
  ctx: CanvasRenderingContext2D,
  planet: Planet,
  offsetX: number,
  offsetY: number,
  hoveredCell: { x: number; y: number } | null
): void {
  if (!hoveredCell) return;

  const cell = planet.cells[hoveredCell.y]?.[hoveredCell.x];
  if (!cell || cell.mined) return;

  const px = offsetX + hoveredCell.x * planet.cellSize;
  const py = offsetY + hoveredCell.y * planet.cellSize;

  ctx.strokeStyle = '#00BFFF';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00BFFF';
  ctx.shadowBlur = 10;
  ctx.strokeRect(px + 1, py + 1, planet.cellSize - 2, planet.cellSize - 2);
  ctx.shadowBlur = 0;
}

export function drawShip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  hovered: boolean,
  drillLevel: DrillLevel
): void {
  ctx.save();

  const scale = hovered ? 1.2 : 1;
  const actualSize = size * scale;

  ctx.translate(x, y);

  if (hovered) {
    ctx.shadowColor = '#00BFFF';
    ctx.shadowBlur = 20;
  }

  ctx.fillStyle = '#4a90d9';
  ctx.beginPath();
  ctx.moveTo(0, -actualSize * 0.4);
  ctx.lineTo(actualSize * 0.35, actualSize * 0.3);
  ctx.lineTo(actualSize * 0.15, actualSize * 0.25);
  ctx.lineTo(actualSize * 0.1, actualSize * 0.4);
  ctx.lineTo(-actualSize * 0.1, actualSize * 0.4);
  ctx.lineTo(-actualSize * 0.15, actualSize * 0.25);
  ctx.lineTo(-actualSize * 0.35, actualSize * 0.3);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#7ec8e3';
  ctx.beginPath();
  ctx.ellipse(0, -actualSize * 0.1, actualSize * 0.12, actualSize * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  const drillColor = getDrillColor(drillLevel);
  ctx.fillStyle = drillColor;
  ctx.fillRect(-actualSize * 0.08, -actualSize * 0.4, actualSize * 0.16, actualSize * 0.1);

  if (hovered) {
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function render(
  ctx: CanvasRenderingContext2D,
  state: RendererState,
  planet: Planet,
  drilling: DrillingState,
  drillLevel: DrillLevel,
  canvasWidth: number,
  canvasHeight: number,
  time: number
): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  gradient.addColorStop(0, '#0a0a1a');
  gradient.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  drawStars(ctx, state.stars, time);

  const planetWidth = planet.gridSize * planet.cellSize;
  const planetHeight = planet.gridSize * planet.cellSize;
  const offsetX = (canvasWidth - planetWidth) / 2;
  const offsetY = (canvasHeight - planetHeight) / 2;

  const fadeProgress = Math.min(1, state.fadeInTime / FADE_IN_DURATION);
  drawPlanet(ctx, planet, offsetX, offsetY, fadeProgress);
  drawGridLines(ctx, planet, offsetX, offsetY);
  drawHoveredCell(ctx, planet, offsetX, offsetY, state.hoveredCell);

  if (drilling.active && drilling.cell) {
    const cell = drilling.cell;
    const cx = offsetX + cell.x * planet.cellSize + planet.cellSize / 2;
    const cy = offsetY + cell.y * planet.cellSize - 15;
    drawDrillProgressBar(ctx, cx, cy, drilling.progress, cell.mineral);
  }

  for (const ft of state.floatingTexts) {
    drawFloatingText(ctx, ft);
  }

  drawParticles(ctx, state.particles);

  if (fadeProgress > 0.5) {
    const shipAlpha = Math.min(1, (fadeProgress - 0.5) * 2);
    ctx.globalAlpha = shipAlpha;
    drawShip(
      ctx,
      state.shipX,
      state.shipY,
      state.shipSize,
      state.shipHovered,
      drillLevel
    );
    ctx.globalAlpha = 1;
  }
}

export function screenToCell(
  sx: number,
  sy: number,
  planet: Planet,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } | null {
  const planetWidth = planet.gridSize * planet.cellSize;
  const planetHeight = planet.gridSize * planet.cellSize;
  const offsetX = (canvasWidth - planetWidth) / 2;
  const offsetY = (canvasHeight - planetHeight) / 2;

  const x = Math.floor((sx - offsetX) / planet.cellSize);
  const y = Math.floor((sy - offsetY) / planet.cellSize);

  if (x >= 0 && x < planet.gridSize && y >= 0 && y < planet.gridSize) {
    return { x, y };
  }
  return null;
}

export function isPointInShip(
  px: number,
  py: number,
  shipX: number,
  shipY: number,
  shipSize: number,
  hovered: boolean
): boolean {
  const scale = hovered ? 1.2 : 1;
  const actualSize = shipSize * scale;
  const dx = px - shipX;
  const dy = py - shipY;
  return Math.abs(dx) < actualSize * 0.4 && Math.abs(dy) < actualSize * 0.4;
}
