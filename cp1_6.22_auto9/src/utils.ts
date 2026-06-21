import { saveAs } from 'file-saver';
import {
  PixelBoard,
  Color,
  BOARD_SIZE,
  PRESET_OFFSET,
  DEFAULT_PALETTE,
  cloneBoard,
  PresetData,
  ExportSize,
} from './types';

export interface FloodFillResult {
  newBoard: PixelBoard;
  layers: Array<Array<{ x: number; y: number }>>;
}

export function floodFill(
  board: PixelBoard,
  startX: number,
  startY: number,
  replaceColor: Color | null
): FloodFillResult {
  const targetColor = board[startY][startX];

  if (targetColor === replaceColor) {
    return { newBoard: board, layers: [] };
  }

  const newBoard = cloneBoard(board);
  const visited = new Set<string>();
  const layers: Array<Array<{ x: number; y: number }>> = [];

  let currentLayer: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
  visited.add(`${startX},${startY}`);

  while (currentLayer.length > 0) {
    layers.push(currentLayer);
    const nextLayer: Array<{ x: number; y: number }> = [];

    for (const { x, y } of currentLayer) {
      newBoard[y][x] = replaceColor;

      const neighbors = [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 },
      ];

      for (const nx of neighbors) {
        const key = `${nx.x},${nx.y}`;
        if (
          nx.x >= 0 &&
          nx.x < BOARD_SIZE &&
          nx.y >= 0 &&
          nx.y < BOARD_SIZE &&
          !visited.has(key) &&
          newBoard[nx.y][nx.x] === targetColor
        ) {
          visited.add(key);
          nextLayer.push(nx);
        }
      }
    }

    currentLayer = nextLayer;
  }

  return { newBoard, layers };
}

export function generateRandomBoard(): PixelBoard {
  const board: PixelBoard = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );

  const symmetric = Math.random() < 0.5;
  const colorCount = Math.floor(Math.random() * 8) + 5;
  const shuffledPalette = [...DEFAULT_PALETTE].sort(() => Math.random() - 0.5);
  const selectedColors = shuffledPalette.slice(0, colorCount);

  const walkSteps = Math.floor(Math.random() * 6) + 5;
  const halfWidth = symmetric ? Math.ceil(BOARD_SIZE / 2) : BOARD_SIZE;

  for (let step = 0; step < walkSteps; step++) {
    const color = selectedColors[Math.floor(Math.random() * selectedColors.length)];
    const blockSize = Math.floor(Math.random() * 6) + 3;
    const startX = Math.floor(Math.random() * halfWidth);
    const startY = Math.floor(Math.random() * BOARD_SIZE);

    for (let i = 0; i < blockSize; i++) {
      const ox = Math.floor((Math.random() - 0.5) * 4);
      const oy = Math.floor((Math.random() - 0.5) * 4);
      const x = Math.min(Math.max(startX + ox, 0), halfWidth - 1);
      const y = Math.min(Math.max(startY + oy, 0), BOARD_SIZE - 1);

      if (Math.random() < 0.7) {
        board[y][x] = color;
        if (symmetric) {
          const mirrorX = BOARD_SIZE - 1 - x;
          board[y][mirrorX] = color;
        }
      }
    }
  }

  return board;
}

export function applyPresetToBoard(board: PixelBoard, preset: PresetData): PixelBoard {
  const newBoard = cloneBoard(board);

  for (let y = 0; y < preset.pattern.length; y++) {
    for (let x = 0; x < preset.pattern[y].length; x++) {
      const targetY = PRESET_OFFSET + y;
      const targetX = PRESET_OFFSET + x;
      if (targetY < BOARD_SIZE && targetX < BOARD_SIZE) {
        const pixel = preset.pattern[y][x];
        if (pixel !== null) {
          newBoard[targetY][targetX] = pixel;
        }
      }
    }
  }

  return newBoard;
}

export function getPresetRowsByRow(preset: PresetData): Array<Array<{ x: number; y: number; color: Color | null }>> {
  const rows: Array<Array<{ x: number; y: number; color: Color | null }>> = [];

  for (let y = 0; y < preset.pattern.length; y++) {
    const row: Array<{ x: number; y: number; color: Color | null }> = [];
    for (let x = 0; x < preset.pattern[y].length; x++) {
      const pixel = preset.pattern[y][x];
      if (pixel !== null) {
        const targetY = PRESET_OFFSET + y;
        const targetX = PRESET_OFFSET + x;
        row.push({ x: targetX, y: targetY, color: pixel });
      }
    }
    rows.push(row);
  }

  return rows;
}

export function renderBoardToCanvas(
  board: PixelBoard,
  size: number,
  addBorder: boolean = false
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const pixelSize = size / BOARD_SIZE;

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const color = board[y][x];
      if (color !== null) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x * pixelSize), Math.floor(y * pixelSize), Math.ceil(pixelSize), Math.ceil(pixelSize));
      }
    }
  }

  if (addBorder) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  }

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob from canvas'));
      },
      type,
      1.0
    );
  });
}

export async function exportPNG(
  board: PixelBoard,
  size: ExportSize,
  method: 'download' | 'clipboard' = 'download'
): Promise<boolean> {
  try {
    const canvas = renderBoardToCanvas(board, size, true);
    const blob = await canvasToBlob(canvas, 'image/png');

    if (method === 'download') {
      const dateStr = formatDate(new Date());
      const filename = `pixel-avatar-${size}x${size}-${dateStr}.png`;
      saveAs(blob, filename);
      return true;
    } else {
      if (navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({
            'image/png': blob,
          }),
        ]);
        return true;
      } else {
        return false;
      }
    }
  } catch (err) {
    console.error('Export failed:', err);
    return false;
  }
}

export function generateHashTag(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `#PixelArt#16x16#${y}${m}${d}`;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}-${h}${min}`;
}

export function addRecentColor(list: Color[], color: Color, max: number): Color[] {
  const filtered = list.filter((c) => c.toLowerCase() !== color.toLowerCase());
  filtered.unshift(color);
  return filtered.slice(0, max);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? {
        r: parseInt(m[1], 16),
        g: parseInt(m[2], 16),
        b: parseInt(m[3], 16),
      }
    : null;
}

export function getContrastTextColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#fff';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#000' : '#fff';
}
