import {
  WorldState,
  MAP_WIDTH,
  MAP_HEIGHT,
  TILE_SIZE,
  VIEW_RADIUS,
  hasItemAt,
  hasNPCAt
} from './world.js';

export type TextType = 'action' | 'dialogue' | 'environment' | 'system';

export interface TextLine {
  text: string;
  type: TextType;
  displayedChars: number;
  fullyDisplayed: boolean;
}

const COLORS = {
  bgTop: '#0d1117',
  bgBottom: '#1a202c',
  wall: '#335577',
  corridor: '#1a202c',
  room: '#2d3748',
  door: '#ecc94b',
  fog: '#111827',
  gridBorder: '#ffffff33',
  player: '#fbbf24',
  playerShadow: '#fde68a',
  npc: '#ef4444',
  item: '#22c55e',
  textAction: '#a3e635',
  textDialogue: '#93c5fd',
  textEnvironment: '#f3f4f6',
  textSystem: '#c084fc',
  treasure: '#fde047'
};

const FONT_FAMILY = 'monospace';
const FONT_SIZE = 18;
const TEXT_SPEED = 2;

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 800;
  private height: number = 600;
  private textLines: TextLine[] = [];
  private animationTime: number = 0;
  private maxTextLines: number = 12;
  private devicePixelRatio: number;
  private textPaddingX: number = 20;
  private mapAreaHeight: number = 0;
  private textAreaHeight: number = 0;
  private inputAreaHeight: number = 40;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;
    this.devicePixelRatio = window.devicePixelRatio || 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const wrapper = this.canvas.parentElement;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    this.width = Math.max(800, Math.floor(rect.width));
    this.height = Math.max(600, Math.floor(rect.height)) - this.inputAreaHeight;

    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.canvas.width = Math.floor(this.width * this.devicePixelRatio);
    this.canvas.height = Math.floor(this.height * this.devicePixelRatio);
    this.ctx.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0);

    this.mapAreaHeight = Math.floor(this.height * 0.67);
    this.textAreaHeight = this.height - this.mapAreaHeight;
  }

  addTextLine(text: string, type: TextType): void {
    const wrappedLines = this.wrapText(text);
    for (const line of wrappedLines) {
      this.textLines.push({
        text: line,
        type,
        displayedChars: 0,
        fullyDisplayed: false
      });
    }
    while (this.textLines.length > this.maxTextLines) {
      this.textLines.shift();
    }
  }

  clearText(): void {
    this.textLines = [];
  }

  private wrapText(text: string): string[] {
    const lines: string[] = [];
    const maxWidth = this.width - this.textPaddingX * 2;
    this.ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;

    const paragraphs = text.split('\n');
    for (const paragraph of paragraphs) {
      if (!paragraph) {
        lines.push('');
        continue;
      }
      let currentLine = '';
      const chars = Array.from(paragraph);
      for (const ch of chars) {
        const testLine = currentLine + ch;
        const metrics = this.ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = ch;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
    }
    return lines;
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    const charsToAdd = TEXT_SPEED;
    for (const line of this.textLines) {
      if (!line.fullyDisplayed) {
        line.displayedChars = Math.min(line.text.length, line.displayedChars + charsToAdd);
        if (line.displayedChars >= line.text.length) {
          line.fullyDisplayed = true;
        }
      }
    }
  }

  render(state: WorldState): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, COLORS.bgTop);
    gradient.addColorStop(1, COLORS.bgBottom);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.renderMap(state);
    this.renderTextArea();
  }

  private renderMap(state: WorldState): void {
    const mapWidth = MAP_WIDTH * TILE_SIZE;
    const mapHeight = MAP_HEIGHT * TILE_SIZE;
    const offsetX = Math.floor((this.width - mapWidth) / 2);
    const offsetY = Math.floor((this.mapAreaHeight - mapHeight) / 2);

    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);

    const playerX = state.player.x;
    const playerY = state.player.y;

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const dx = Math.abs(x - playerX);
        const dy = Math.abs(y - playerY);
        const inView = dx <= VIEW_RADIUS && dy <= VIEW_RADIUS;

        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (!inView) {
          this.ctx.fillStyle = COLORS.fog;
          this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        } else {
          const tile = state.map[y][x];
          let tileColor = COLORS.room;
          switch (tile.type) {
            case 'wall': tileColor = COLORS.wall; break;
            case 'corridor': tileColor = COLORS.corridor; break;
            case 'room': tileColor = COLORS.room; break;
            case 'door': tileColor = tile.locked ? COLORS.wall : COLORS.door; break;
          }
          this.ctx.fillStyle = tileColor;
          this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

          if (tile.type === 'door') {
            this.ctx.fillStyle = COLORS.door;
            this.ctx.fillRect(px + 8, py + 18, TILE_SIZE - 16, TILE_SIZE - 36);
            this.ctx.fillStyle = '#78350f';
            this.ctx.beginPath();
            this.ctx.arc(px + TILE_SIZE - 16, py + TILE_SIZE / 2, 3, 0, Math.PI * 2);
            this.ctx.fill();
            if (tile.locked) {
              this.ctx.fillStyle = '#ef4444';
              this.ctx.beginPath();
              this.ctx.arc(px + TILE_SIZE - 16, py + TILE_SIZE / 2, 5, 0, Math.PI * 2);
              this.ctx.fill();
              this.ctx.fillStyle = COLORS.door;
              this.ctx.font = 'bold 14px monospace';
              this.ctx.textAlign = 'center';
              this.ctx.textBaseline = 'middle';
              this.ctx.fillText('锁', px + TILE_SIZE / 2, py + TILE_SIZE / 2);
            }
          }

          const item = hasItemAt(state, x, y);
          if (item) {
            this.renderItem(px, py, item.id);
          }

          const npc = hasNPCAt(state, x, y);
          if (npc) {
            this.renderNPC(px, py);
          }

          if (isTreasureSpot(state, x, y)) {
            this.renderTreasure(px, py);
          }
        }

        this.ctx.strokeStyle = COLORS.gridBorder;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      }
    }

    this.renderPlayer(playerX * TILE_SIZE, playerY * TILE_SIZE);

    this.ctx.restore();

    this.renderMinimap(state);
  }

  private renderPlayer(px: number, py: number): void {
    const alpha = 0.6 + 0.4 * Math.sin((this.animationTime / 1000) * Math.PI * 2 / 0.8);
    const cx = px + TILE_SIZE / 2;
    const cy = py + TILE_SIZE / 2;

    this.ctx.save();
    this.ctx.globalAlpha = 0.3 * alpha;
    this.ctx.fillStyle = COLORS.playerShadow;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = COLORS.player;
    this.ctx.font = 'bold 36px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('@', cx, cy);
    this.ctx.restore();
  }

  private renderItem(px: number, py: number, itemId: string): void {
    const cx = px + TILE_SIZE / 2;
    const cy = py + TILE_SIZE / 2;
    const bob = Math.sin(this.animationTime / 500) * 2;

    let symbol = '?';
    let color = COLORS.item;
    switch (itemId) {
      case 'key': symbol = '🗝'; color = '#fbbf24'; break;
      case 'sword': symbol = '⚔'; color = '#94a3b8'; break;
      case 'potion': symbol = '🧪'; color = '#ef4444'; break;
      case 'coin': symbol = '💰'; color = '#f59e0b'; break;
      case 'letter': symbol = '✉'; color = '#cbd5e1'; break;
    }

    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.font = 'bold 24px serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(symbol, cx, cy + bob);
    this.ctx.restore();
  }

  private renderNPC(px: number, py: number): void {
    const cx = px + TILE_SIZE / 2;
    const cy = py + TILE_SIZE / 2;

    this.ctx.save();
    this.ctx.globalAlpha = 0.9;
    this.ctx.fillStyle = COLORS.npc;
    this.ctx.font = 'bold 30px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('N', cx, cy);
    this.ctx.restore();
  }

  private renderTreasure(px: number, py: number): void {
    const cx = px + TILE_SIZE / 2;
    const cy = py + TILE_SIZE / 2;
    const pulse = 1 + 0.2 * Math.sin(this.animationTime / 300);

    this.ctx.save();
    this.ctx.globalAlpha = 0.5;
    this.ctx.fillStyle = COLORS.treasure;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 18 * pulse, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.save();
    this.ctx.fillStyle = COLORS.treasure;
    this.ctx.font = 'bold 26px serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('★', cx, cy);
    this.ctx.restore();
  }

  private renderMinimap(state: WorldState): void {
    const mmSize = 20;
    const cellSize = Math.floor(mmSize / MAP_WIDTH);
    const mmX = this.width - mmSize - 15;
    const mmY = 15;

    this.ctx.save();
    this.ctx.fillStyle = '#00000080';
    this.ctx.fillRect(mmX - 3, mmY - 3, mmSize + 6, mmSize + 6);

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = state.map[y][x];
        let c = '#111827';
        switch (tile.type) {
          case 'wall': c = '#335577'; break;
          case 'corridor': c = '#1a202c'; break;
          case 'room': c = '#475569'; break;
          case 'door': c = tile.locked ? '#dc2626' : '#ecc94b'; break;
        }
        this.ctx.fillStyle = c;
        this.ctx.fillRect(mmX + x * cellSize, mmY + y * cellSize, cellSize - 1, cellSize - 1);
      }
    }

    this.ctx.fillStyle = '#fbbf24';
    this.ctx.fillRect(mmX + state.player.x * cellSize - 1, mmY + state.player.y * cellSize - 1, cellSize + 1, cellSize + 1);

    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = '10px monospace';
    this.ctx.textAlign = 'right';
    this.ctx.fillText('小地图', mmX + mmSize, mmY + mmSize + 14);
    this.ctx.restore();
  }

  private renderTextArea(): void {
    const topY = this.mapAreaHeight;
    const areaH = this.textAreaHeight;

    this.ctx.save();
    this.ctx.fillStyle = '#00000040';
    this.ctx.fillRect(0, topY, this.width, areaH);

    this.ctx.strokeStyle = '#ffffff15';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, topY + 0.5);
    this.ctx.lineTo(this.width, topY + 0.5);
    this.ctx.stroke();

    this.ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
    this.ctx.textBaseline = 'top';

    const lineHeight = FONT_SIZE + 6;
    const paddingTop = 10;
    let y = topY + paddingTop;

    const visibleLines = Math.floor((areaH - paddingTop - 6) / lineHeight);
    const startIdx = Math.max(0, this.textLines.length - visibleLines);

    for (let i = startIdx; i < this.textLines.length; i++) {
      const line = this.textLines[i];
      if (y + lineHeight > this.height) break;

      let color = COLORS.textEnvironment;
      switch (line.type) {
        case 'action': color = COLORS.textAction; break;
        case 'dialogue': color = COLORS.textDialogue; break;
        case 'environment': color = COLORS.textEnvironment; break;
        case 'system': color = COLORS.textSystem; break;
      }

      this.ctx.fillStyle = color;
      const displayText = line.text.substring(0, line.displayedChars);
      if (displayText) {
        this.ctx.fillText(displayText, this.textPaddingX, y);
      }
      if (!line.fullyDisplayed && Math.floor(this.animationTime / 300) % 2 === 0) {
        const metrics = this.ctx.measureText(displayText);
        const cursorX = this.textPaddingX + metrics.width;
        this.ctx.fillStyle = color;
        this.ctx.fillText('_', cursorX, y);
      }

      y += lineHeight;
    }

    this.ctx.restore();
  }

  isAllTextDisplayed(): boolean {
    return this.textLines.every(l => l.fullyDisplayed);
  }

  skipTextAnimation(): void {
    for (const line of this.textLines) {
      line.displayedChars = line.text.length;
      line.fullyDisplayed = true;
    }
  }
}

function isTreasureSpot(state: WorldState, x: number, y: number): boolean {
  return state.quests.doorUnlocked && x === 7 && y === 7 && !state.gameWon;
}
