import {
  CELL_SIZE,
  GRID_WIDTH,
  GRID_HEIGHT,
  CellType,
  getCurrentMap,
  findStartPosition,
  getCell,
  setCell
} from './mazeData';

const PLAYER_SIZE = 20;
const GEM_BASE_SIZE = 16;
const MOVE_DURATION = 150;

const GEM_BREATH_SPEED = 0.0025;
const GEM_BREATH_SCALE_MIN = 0.9;
const GEM_BREATH_SCALE_MAX = 1.1;
const GEM_BREATH_ALPHA_MIN = 0.7;
const GEM_BREATH_ALPHA_MAX = 1.0;
const GEM_GLOW_SIZE_MULTIPLIER = 2.0;
const GEM_GLOW_ALPHA_MAX = 0.5;

export interface GameState {
  score: number;
  level: number;
  time: number;
  isRunning: boolean;
  isGameOver: boolean;
}

interface Player {
  gridX: number;
  gridY: number;
  renderX: number;
  renderY: number;
  isMoving: boolean;
  moveStartX: number;
  moveStartY: number;
  moveTargetX: number;
  moveTargetY: number;
  moveStartTime: number;
}

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let player: Player;
let score: number = 0;
let timer: number = 0;
let isRunning: boolean = false;
let isGameOver: boolean = false;
let lastTime: number = 0;
let animationFrameId: number = 0;
let gemTime: number = 0;

let onScoreChange: ((score: number) => void) | null = null;
let onTimeChange: ((time: number) => void) | null = null;
let onGameOver: ((time: number, score: number) => void) | null = null;

export function initGame(canvasElement: HTMLCanvasElement): void {
  canvas = canvasElement;
  ctx = canvas.getContext('2d')!;
  resetPlayer();
}

export function resetPlayer(): void {
  const startPos = findStartPosition();
  player = {
    gridX: startPos.x,
    gridY: startPos.y,
    renderX: startPos.x * CELL_SIZE + (CELL_SIZE - PLAYER_SIZE) / 2,
    renderY: startPos.y * CELL_SIZE + (CELL_SIZE - PLAYER_SIZE) / 2,
    isMoving: false,
    moveStartX: 0,
    moveStartY: 0,
    moveTargetX: 0,
    moveTargetY: 0,
    moveStartTime: 0
  };
}

export function resetGame(): void {
  score = 0;
  timer = 0;
  isGameOver = false;
  gemTime = 0;
  resetPlayer();
  if (onScoreChange) onScoreChange(score);
  if (onTimeChange) onTimeChange(timer);
}

export function startGame(): void {
  if (!isRunning) {
    isRunning = true;
    lastTime = performance.now();
    gameLoop(lastTime);
  }
}

export function stopGame(): void {
  isRunning = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = 0;
  }
}

export function getGameState(): GameState {
  return {
    score,
    level: 0,
    time: timer,
    isRunning,
    isGameOver
  };
}

export function setOnScoreChange(callback: (score: number) => void): void {
  onScoreChange = callback;
}

export function setOnTimeChange(callback: (time: number) => void): void {
  onTimeChange = callback;
}

export function setOnGameOver(callback: (time: number, score: number) => void): void {
  onGameOver = callback;
}

function gameLoop(currentTime: number): void {
  if (!isRunning) return;

  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  if (!isGameOver) {
    timer += deltaTime / 1000;
    if (onTimeChange) onTimeChange(timer);
  }

  gemTime += deltaTime * GEM_BREATH_SPEED;

  updatePlayer(deltaTime);
  render();

  animationFrameId = requestAnimationFrame(gameLoop);
}

function updatePlayer(_deltaTime: number): void {
  if (!player.isMoving) return;

  const elapsed = performance.now() - player.moveStartTime;
  const progress = Math.min(elapsed / MOVE_DURATION, 1);
  const easeProgress = easeOutQuad(progress);

  const currentGridX = player.moveStartX + (player.moveTargetX - player.moveStartX) * easeProgress;
  const currentGridY = player.moveStartY + (player.moveTargetY - player.moveStartY) * easeProgress;

  player.renderX = currentGridX * CELL_SIZE + (CELL_SIZE - PLAYER_SIZE) / 2;
  player.renderY = currentGridY * CELL_SIZE + (CELL_SIZE - PLAYER_SIZE) / 2;

  if (progress >= 1) {
    player.isMoving = false;
    player.gridX = player.moveTargetX;
    player.gridY = player.moveTargetY;
    player.renderX = player.gridX * CELL_SIZE + (CELL_SIZE - PLAYER_SIZE) / 2;
    player.renderY = player.gridY * CELL_SIZE + (CELL_SIZE - PLAYER_SIZE) / 2;

    checkGemCollection();
    checkExit();
  }
}

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

function canMoveTo(x: number, y: number): boolean {
  if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return false;
  return getCell(x, y) !== CellType.WALL;
}

export function movePlayer(dx: number, dy: number): void {
  if (!isRunning || isGameOver || player.isMoving) return;

  const newX = player.gridX + dx;
  const newY = player.gridY + dy;

  if (canMoveTo(newX, newY)) {
    player.isMoving = true;
    player.moveStartX = player.gridX;
    player.moveStartY = player.gridY;
    player.moveTargetX = newX;
    player.moveTargetY = newY;
    player.moveStartTime = performance.now();
  }
}

function checkGemCollection(): void {
  const cellValue = getCell(player.gridX, player.gridY);
  if (cellValue === CellType.GEM) {
    setCell(player.gridX, player.gridY, CellType.EMPTY);
    score += 10;
    if (onScoreChange) onScoreChange(score);
  }
}

function checkExit(): void {
  const cellValue = getCell(player.gridX, player.gridY);
  if (cellValue === CellType.EXIT) {
    isGameOver = true;
    if (onGameOver) onGameOver(timer, score);
  }
}

function render(): void {
  const map = getCurrentMap();

  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const cell = map[y][x];
      const px = x * CELL_SIZE;
      const py = y * CELL_SIZE;

      if (cell === CellType.WALL) {
        ctx.fillStyle = '#444';
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(px, py, CELL_SIZE, 2);
        ctx.fillRect(px, py, 2, CELL_SIZE);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(px, py + CELL_SIZE - 2, CELL_SIZE, 2);
        ctx.fillRect(px + CELL_SIZE - 2, py, 2, CELL_SIZE);
      } else if (cell === CellType.EXIT) {
        ctx.fillStyle = '#0f0';
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(px, py, CELL_SIZE, 3);
        ctx.fillRect(px, py, 3, CELL_SIZE);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(px, py + CELL_SIZE - 3, CELL_SIZE, 3);
        ctx.fillRect(px + CELL_SIZE - 3, py, 3, CELL_SIZE);
      }
    }
  }

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (map[y][x] === CellType.GEM) {
        const px = x * CELL_SIZE + CELL_SIZE / 2;
        const py = y * CELL_SIZE + CELL_SIZE / 2;
        const phaseOffset = x * 0.5 + y * 0.3;
        const sinValue = Math.sin(gemTime + phaseOffset);

        const breathScale = GEM_BREATH_SCALE_MIN + (sinValue + 1) / 2 * (GEM_BREATH_SCALE_MAX - GEM_BREATH_SCALE_MIN);
        const breathAlpha = GEM_BREATH_ALPHA_MIN + (sinValue + 1) / 2 * (GEM_BREATH_ALPHA_MAX - GEM_BREATH_ALPHA_MIN);
        const glowAlpha = (sinValue + 1) / 2 * GEM_GLOW_ALPHA_MAX;

        const gemSize = GEM_BASE_SIZE * breathScale;
        const glowSize = GEM_BASE_SIZE * GEM_GLOW_SIZE_MULTIPLIER * breathScale;

        ctx.save();
        ctx.globalAlpha = glowAlpha;
        const glowGradient = ctx.createRadialGradient(px, py, 0, px, py, glowSize / 2);
        glowGradient.addColorStop(0, 'rgba(255, 107, 107, 0.8)');
        glowGradient.addColorStop(0.5, 'rgba(229, 62, 62, 0.3)');
        glowGradient.addColorStop(1, 'rgba(229, 62, 62, 0)');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(px, py, glowSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = breathAlpha;
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, gemSize / 2);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(0.5, '#e53e3e');
        gradient.addColorStop(1, '#c53030');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, gemSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = breathAlpha * 0.6;
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.beginPath();
        ctx.arc(px - gemSize / 6, py - gemSize / 6, gemSize / 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  const playerPx = player.renderX;
  const playerPy = player.renderY;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(playerPx + 2, playerPy + 2, PLAYER_SIZE, PLAYER_SIZE);

  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(playerPx, playerPy, PLAYER_SIZE, PLAYER_SIZE);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(playerPx, playerPy, PLAYER_SIZE, 3);
  ctx.fillRect(playerPx, playerPy, 3, PLAYER_SIZE);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(playerPx, playerPy + PLAYER_SIZE - 3, PLAYER_SIZE, 3);
  ctx.fillRect(playerPx + PLAYER_SIZE - 3, playerPy, 3, PLAYER_SIZE);
}

export function forceRender(): void {
  render();
}

export function handleKeyDown(e: KeyboardEvent): void {
  if (!isRunning || isGameOver) return;

  switch (e.key.toLowerCase()) {
    case 'w':
    case 'arrowup':
      movePlayer(0, -1);
      e.preventDefault();
      break;
    case 's':
    case 'arrowdown':
      movePlayer(0, 1);
      e.preventDefault();
      break;
    case 'a':
    case 'arrowleft':
      movePlayer(-1, 0);
      e.preventDefault();
      break;
    case 'd':
    case 'arrowright':
      movePlayer(1, 0);
      e.preventDefault();
      break;
  }
}
