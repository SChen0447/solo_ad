import {
  CELL_SIZE,
  GRID_WIDTH,
  GRID_HEIGHT,
  CellType,
  getCurrentMap,
  setCell,
  getCell
} from './mazeData';

import { forceRender, resetPlayer, resetGame } from './game';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let cellTypePanel: HTMLElement;
let onMapChange: (() => void) | null = null;

let selectedGridX: number = -1;
let selectedGridY: number = -1;

const cellColors: Record<number, string> = {
  [CellType.EMPTY]: '#e0e0e0',
  [CellType.WALL]: '#444',
  [CellType.EXIT]: '#0f0',
  [CellType.GEM]: '#e53e3e'
};

export function initEditor(canvasElement: HTMLCanvasElement): void {
  canvas = canvasElement;
  ctx = canvas.getContext('2d')!;
  cellTypePanel = document.getElementById('cellTypePanel')!;

  canvas.addEventListener('click', handleCanvasClick);

  cellTypePanel.querySelectorAll('.cell-type-btn').forEach((btn) => {
    btn.addEventListener('click', handleTypeSelect);
  });

  document.addEventListener('click', (e) => {
    if (!cellTypePanel.contains(e.target as Node) && e.target !== canvas) {
      hideCellTypePanel();
    }
  });

  render();
}

export function setOnMapChange(callback: () => void): void {
  onMapChange = callback;
}

export function render(): void {
  const map = getCurrentMap();

  ctx.fillStyle = '#2d3748';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const cellValue = map[y][x];
      const px = x * CELL_SIZE;
      const py = y * CELL_SIZE;

      ctx.fillStyle = cellColors[cellValue] || '#e0e0e0';
      ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);

      if (cellValue === CellType.GEM) {
        const cx = px + CELL_SIZE / 2;
        const cy = py + CELL_SIZE / 2;
        const gemRadius = CELL_SIZE * 0.3;

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, gemRadius);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(0.6, '#e53e3e');
        gradient.addColorStop(1, '#c53030');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, gemRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (cellValue === CellType.WALL) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, 3);
        ctx.fillRect(px + 1, py + 1, 3, CELL_SIZE - 2);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(px + 1, py + CELL_SIZE - 4, CELL_SIZE - 2, 3);
        ctx.fillRect(px + CELL_SIZE - 4, py + 1, 3, CELL_SIZE - 2);
      }

      if (cellValue === CellType.EXIT) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, 4);
        ctx.fillRect(px + 1, py + 1, 4, CELL_SIZE - 2);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(px + 1, py + CELL_SIZE - 5, CELL_SIZE - 2, 4);
        ctx.fillRect(px + CELL_SIZE - 5, py + 1, 4, CELL_SIZE - 2);
      }

      if (x === selectedGridX && y === selectedGridY) {
        ctx.strokeStyle = '#ff7f50';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      }
    }
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;

  for (let x = 0; x <= GRID_WIDTH; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL_SIZE, 0);
    ctx.lineTo(x * CELL_SIZE, GRID_HEIGHT * CELL_SIZE);
    ctx.stroke();
  }

  for (let y = 0; y <= GRID_HEIGHT; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL_SIZE);
    ctx.lineTo(GRID_WIDTH * CELL_SIZE, y * CELL_SIZE);
    ctx.stroke();
  }
}

function handleCanvasClick(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;

  const gridX = Math.floor(clickX / CELL_SIZE);
  const gridY = Math.floor(clickY / CELL_SIZE);

  if (gridX >= 0 && gridX < GRID_WIDTH && gridY >= 0 && gridY < GRID_HEIGHT) {
    selectedGridX = gridX;
    selectedGridY = gridY;
    render();
    showCellTypePanel(e.clientX, e.clientY, rect);
  } else {
    hideCellTypePanel();
  }
}

function showCellTypePanel(clientX: number, clientY: number, canvasRect: DOMRect): void {
  const wrapperRect = canvas.parentElement!.getBoundingClientRect();
  const panelWidth = 200;
  const panelHeight = 60;

  let left = clientX - wrapperRect.left + CELL_SIZE / 2;
  let top = clientY - wrapperRect.top - panelHeight - 10;

  if (left + panelWidth > wrapperRect.width) {
    left = wrapperRect.width - panelWidth - 10;
  }
  if (left < 10) left = 10;

  if (top < 10) {
    top = clientY - wrapperRect.top + CELL_SIZE + 10;
  }

  cellTypePanel.style.left = left + 'px';
  cellTypePanel.style.top = top + 'px';
  cellTypePanel.classList.add('show');
}

function hideCellTypePanel(): void {
  cellTypePanel.classList.remove('show');
  selectedGridX = -1;
  selectedGridY = -1;
  render();
}

function handleTypeSelect(e: Event): void {
  const target = e.target as HTMLElement;
  const cellType = parseInt(target.dataset.type || '0', 10);

  if (selectedGridX >= 0 && selectedGridY >= 0) {
    setCellValue(selectedGridX, selectedGridY, cellType);
    render();
    forceRender();
    resetPlayer();
    resetGame();

    if (onMapChange) {
      onMapChange();
    }
  }

  hideCellTypePanel();
}

function setCellValue(x: number, y: number, value: number): void {
  setCell(x, y, value);
}

export function refreshEditor(): void {
  hideCellTypePanel();
  render();
}
