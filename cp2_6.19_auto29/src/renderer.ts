import type { Grid, CellPosition, CellWithEmoji } from './grid';

export interface Theme {
  name: string;
  backgroundColor: string;
  borderColor: string;
  emojiBorderColor: string;
  emojiShadowColor?: string;
}

export const THEMES: Theme[] = [
  {
    name: 'cyberpunk',
    backgroundColor: '#0f0f23',
    borderColor: '#00fff5',
    emojiBorderColor: '#ff00ff',
    emojiShadowColor: '#ff00ff'
  },
  {
    name: 'retro',
    backgroundColor: '#2b2b2b',
    borderColor: '#9bbc0f',
    emojiBorderColor: '#306230'
  },
  {
    name: 'strawberry',
    backgroundColor: '#fff5f5',
    borderColor: '#ff6b9d',
    emojiBorderColor: '#c92a2a'
  }
];

export type ToolMode = 'brush' | 'fill';

export class Renderer {
  private container: HTMLElement;
  private gridElement: HTMLElement | null = null;
  private cellElements: HTMLElement[][] = [];
  private gridSize: number;
  private currentTheme: Theme;
  private animationPromises: Map<string, Promise<void>> = new Map();

  constructor(container: HTMLElement, gridSize: number, initialTheme: Theme) {
    this.container = container;
    this.gridSize = gridSize;
    this.currentTheme = initialTheme;
  }

  createGridElement(): HTMLElement {
    const grid = document.createElement('div');
    grid.className = 'emoji-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${this.gridSize}, 1fr)`;
    grid.style.gap = '1px';
    grid.style.padding = '8px';
    grid.style.borderRadius = '12px';
    grid.style.border = '3px solid var(--border-color)';
    grid.style.backgroundColor = 'var(--border-color)';
    grid.style.aspectRatio = '1 / 1';
    grid.style.width = '100%';
    grid.style.maxWidth = '500px';

    this.cellElements = [];

    for (let row = 0; row < this.gridSize; row++) {
      const rowElements: HTMLElement[] = [];
      for (let col = 0; col < this.gridSize; col++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        cell.style.backgroundColor = 'var(--bg-color)';
        cell.style.borderRadius = '4px';
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.justifyContent = 'center';
        cell.style.fontSize = 'clamp(12px, 2vw, 24px)';
        cell.style.cursor = 'pointer';
        cell.style.transition = 'transform 0.1s ease, box-shadow 0.2s ease';
        cell.style.userSelect = 'none';
        cell.style.overflow = 'hidden';
        cell.style.position = 'relative';

        const emojiSpan = document.createElement('span');
        emojiSpan.className = 'emoji-content';
        emojiSpan.style.display = 'inline-block';
        emojiSpan.style.transform = 'scale(0)';
        emojiSpan.style.transition = 'transform 0.2s ease';
        cell.appendChild(emojiSpan);

        cell.addEventListener('mouseenter', () => {
          cell.style.transform = 'scale(1.05)';
        });
        cell.addEventListener('mouseleave', () => {
          cell.style.transform = 'scale(1)';
        });

        grid.appendChild(cell);
        rowElements.push(cell);
      }
      this.cellElements.push(rowElements);
    }

    this.gridElement = grid;
    this.container.appendChild(grid);
    this.applyTheme(this.currentTheme);

    return grid;
  }

  getCellElement(row: number, col: number): HTMLElement | null {
    if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
      return null;
    }
    return this.cellElements[row]?.[col] ?? null;
  }

  getEmojiSpan(cell: HTMLElement): HTMLElement | null {
    return cell.querySelector('.emoji-content') as HTMLElement | null;
  }

  applyTheme(theme: Theme): void {
    this.currentTheme = theme;
    const root = document.documentElement;
    
    root.style.setProperty('--bg-color', theme.backgroundColor);
    root.style.setProperty('--border-color', theme.borderColor);
    root.style.setProperty('--emoji-border-color', theme.emojiBorderColor);
    
    if (theme.emojiShadowColor) {
      root.style.setProperty('--emoji-shadow-color', theme.emojiShadowColor);
    } else {
      root.style.removeProperty('--emoji-shadow-color');
    }

    if (this.gridElement) {
      this.gridElement.style.transition = 'border-color 0.5s ease, background-color 0.5s ease';
    }

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const cell = this.cellElements[row][col];
        cell.style.transition = 'background-color 0.5s ease, box-shadow 0.5s ease';
        cell.style.backgroundColor = 'var(--bg-color)';
      }
    }
  }

  setCellEmoji(row: number, col: number, emoji: string): void {
    const cell = this.getCellElement(row, col);
    if (!cell) return;
    
    const emojiSpan = this.getEmojiSpan(cell);
    if (emojiSpan) {
      emojiSpan.textContent = emoji;
      emojiSpan.style.transform = 'scale(1)';
    }
    
    cell.style.boxShadow = 'inset 0 0 0 2px var(--emoji-border-color)';
    if (this.currentTheme.emojiShadowColor) {
      cell.style.boxShadow += ', 0 0 8px var(--emoji-shadow-color)';
    }
  }

  clearCell(row: number, col: number): void {
    const cell = this.getCellElement(row, col);
    if (!cell) return;
    
    const emojiSpan = this.getEmojiSpan(cell);
    if (emojiSpan) {
      emojiSpan.textContent = '';
      emojiSpan.style.transform = 'scale(0)';
    }
    
    cell.style.boxShadow = 'none';
  }

  animateFill(row: number, col: number, emoji: string): Promise<void> {
    const key = `${row}-${col}`;
    const cell = this.getCellElement(row, col);
    if (!cell) return Promise.resolve();

    const emojiSpan = this.getEmojiSpan(cell);
    if (!emojiSpan) return Promise.resolve();

    cell.style.animation = 'none';
    emojiSpan.style.animation = 'none';
    void cell.offsetWidth;

    emojiSpan.textContent = emoji;
    emojiSpan.style.transform = 'scale(0)';
    
    cell.style.boxShadow = 'inset 0 0 0 2px var(--emoji-border-color)';
    if (this.currentTheme.emojiShadowColor) {
      cell.style.boxShadow += ', 0 0 8px var(--emoji-shadow-color)';
    }

    requestAnimationFrame(() => {
      emojiSpan.style.transform = 'scale(1)';
    });

    const promise = new Promise<void>((resolve) => {
      const handleTransitionEnd = (e: TransitionEvent) => {
        if (e.target === emojiSpan && e.propertyName === 'transform') {
          emojiSpan.removeEventListener('transitionend', handleTransitionEnd);
          resolve();
        }
      };
      emojiSpan.addEventListener('transitionend', handleTransitionEnd);
    });

    this.animationPromises.set(key, promise);
    return promise;
  }

  animateRotateAndReplace(row: number, col: number, newEmoji: string): Promise<void> {
    const cell = this.getCellElement(row, col);
    if (!cell) return Promise.resolve();

    const emojiSpan = this.getEmojiSpan(cell);
    if (!emojiSpan) return Promise.resolve();

    return new Promise<void>((resolve) => {
      emojiSpan.style.transition = 'transform 0.3s ease';
      emojiSpan.style.transform = 'scale(1) rotate(360deg)';

      const handleTransitionEnd = () => {
        emojiSpan.removeEventListener('transitionend', handleTransitionEnd);
        emojiSpan.textContent = newEmoji;
        emojiSpan.style.transition = 'transform 0.2s ease';
        emojiSpan.style.transform = 'scale(0.2) rotate(0deg)';
        
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            emojiSpan.style.transform = 'scale(1) rotate(0deg)';
            
            const handlePopEnd = () => {
              emojiSpan.removeEventListener('transitionend', handlePopEnd);
              resolve();
            };
            emojiSpan.addEventListener('transitionend', handlePopEnd);
          });
        });
      };

      emojiSpan.addEventListener('transitionend', handleTransitionEnd);
    });
  }

  async animateFloodFill(
    cells: CellPosition[],
    emoji: string,
    speed: number = 50
  ): Promise<void> {
    if (cells.length === 0) return;

    const delay = 1000 / speed;
    let index = 0;

    const fillBatch = () => {
      const batchSize = Math.max(1, Math.floor(speed / 60));
      const end = Math.min(index + batchSize, cells.length);
      
      for (let i = index; i < end; i++) {
        const { row, col } = cells[i];
        this.animateFill(row, col, emoji);
      }
      
      index = end;
      
      if (index < cells.length) {
        requestAnimationFrame(fillBatch);
      }
    };

    fillBatch();

    const totalTime = (cells.length / speed) * 1000 + 500;
    return new Promise(resolve => setTimeout(resolve, totalTime));
  }

  async animateRowByRowFill(
    rows: CellWithEmoji[][],
    speed: number = 100
  ): Promise<void> {
    if (rows.length === 0) return;

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const rowCells = rows[rowIdx];
      
      for (let i = 0; i < rowCells.length; i++) {
        const { row, col, emoji } = rowCells[i];
        const delay = i * (1000 / speed);
        setTimeout(() => {
          this.animateFill(row, col, emoji);
        }, delay);
      }

      const maxDelay = rowCells.length * (1000 / speed);
      
      await new Promise(resolve => setTimeout(resolve, maxDelay + 100));
      
      this.applyRowWaveEffect(rowIdx);
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  private applyRowWaveEffect(rowIndex: number): void {
    const rowElements = this.cellElements[rowIndex];
    if (!rowElements) return;

    rowElements.forEach((cell, colIndex) => {
      const delay = colIndex * 20;
      setTimeout(() => {
        cell.style.transform = 'translateY(-3px)';
        setTimeout(() => {
          cell.style.transform = 'translateY(0)';
        }, 150);
      }, delay);
    });
  }

  addCellClickListener(callback: (row: number, col: number) => void): void {
    if (!this.gridElement) return;

    this.gridElement.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const cell = target.closest('.grid-cell') as HTMLElement | null;
      
      if (cell) {
        const row = parseInt(cell.dataset.row || '0', 10);
        const col = parseInt(cell.dataset.col || '0', 10);
        callback(row, col);
      }
    });
  }

  setCursor(mode: ToolMode): void {
    if (!this.gridElement) return;
    
    if (mode === 'brush') {
      this.gridElement.style.cursor = 'crosshair';
    } else if (mode === 'fill') {
      this.gridElement.style.cursor = 'cell';
    }
  }

  renderGrid(grid: Grid): void {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const cell = grid[row][col];
        if (cell.emoji !== null) {
          this.setCellEmoji(row, col, cell.emoji);
        } else {
          this.clearCell(row, col);
        }
      }
    }
  }

  destroy(): void {
    if (this.gridElement && this.gridElement.parentNode) {
      this.gridElement.parentNode.removeChild(this.gridElement);
    }
    this.gridElement = null;
    this.cellElements = [];
    this.animationPromises.clear();
  }
}
