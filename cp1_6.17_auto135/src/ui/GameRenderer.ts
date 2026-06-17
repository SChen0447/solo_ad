import type { GameState, Position, LaserSegment, LightColor } from '../game/types';
import { GameBoard } from '../game/GameBoard';

const CELL_SIZE = 48;
const COLORS: Record<LightColor, string> = {
  red: '#ff4444',
  green: '#44ff66',
  blue: '#4488ff',
};
const GLOW_COLORS: Record<LightColor, string> = {
  red: 'rgba(255, 68, 68, 0.5)',
  green: 'rgba(68, 255, 102, 0.5)',
  blue: 'rgba(68, 136, 255, 0.5)',
};

export class GameRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  animationFrame: number = 0;
  mousePos: Position | null = null;
  hoverCell: Position | null = null;
  startTime: number = Date.now();
  winParticles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    life: number;
  }> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
  }

  resize(gridSize: number): void {
    this.canvas.width = gridSize * CELL_SIZE;
    this.canvas.height = gridSize * CELL_SIZE;
  }

  setMousePos(pos: Position | null): void {
    this.mousePos = pos;
    if (pos) {
      this.hoverCell = {
        x: Math.floor(pos.x / CELL_SIZE),
        y: Math.floor(pos.y / CELL_SIZE),
      };
    } else {
      this.hoverCell = null;
    }
  }

  screenToCell(sx: number, sy: number): Position {
    return {
      x: Math.floor(sx / CELL_SIZE),
      y: Math.floor(sy / CELL_SIZE),
    };
  }

  render(state: GameState): void {
    const ctx = this.ctx;
    const size = state.gridSize;
    const w = size * CELL_SIZE;
    const h = size * CELL_SIZE;
    const time = Date.now() - this.startTime;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0d0e1c');
    grad.addColorStop(1, '#1a1b2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    this.drawGrid(size);
    this.drawFootprints(state);
    this.drawTargets(state, time);
    this.drawLightSources(state);
    this.drawBoxes(state);
    this.drawPlacedTools(state, time);
    this.drawLasers(state, time);
    this.drawPlayer(state, time);
    this.drawToolPreview(state);
    this.drawWinParticles();
    this.drawHitFlash(state);
  }

  drawGrid(size: number): void {
    const ctx = this.ctx;
    ctx.strokeStyle = '#2a2a3a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= size; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, size * CELL_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(size * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }
  }

  drawFootprints(state: GameState): void {
    const ctx = this.ctx;
    const now = Date.now();
    for (const fp of state.footprints) {
      const age = now - fp.time;
      if (age > 500) continue;
      const alpha = (1 - age / 500) * 0.3;
      ctx.fillStyle = `rgba(80, 150, 255, ${alpha})`;
      ctx.fillRect(
        fp.x * CELL_SIZE + 2,
        fp.y * CELL_SIZE + 2,
        CELL_SIZE - 4,
        CELL_SIZE - 4
      );
    }
  }

  drawTargets(state: GameState, time: number): void {
    const ctx = this.ctx;
    for (const t of state.targets) {
      const cx = t.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = t.y * CELL_SIZE + CELL_SIZE / 2;
      const pulse = (Math.sin(time / 400) + 1) / 2;
      const size = CELL_SIZE * 0.35 + pulse * 4;
      const color = COLORS[t.color];
      const glowAlpha = 0.4 + pulse * 0.4;

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 15 + pulse * 10;
      ctx.fillStyle = `${color}${t.activated ? 'ff' : '88'}`;
      ctx.beginPath();
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx + size * 0.7, cy);
      ctx.lineTo(cx, cy + size);
      ctx.lineTo(cx - size * 0.7, cy);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255,255,255,${0.5 + pulse * 0.3})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (!t.activated) {
        ctx.fillStyle = `rgba(255,255,255,${glowAlpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(255,255,255,0.9)`;
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawLightSources(state: GameState): void {
    const ctx = this.ctx;
    for (const s of state.lightSources) {
      const cx = s.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = s.y * CELL_SIZE + CELL_SIZE / 2;
      const color = COLORS[s.color];

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#333344';
      ctx.fillRect(
        s.x * CELL_SIZE + 4,
        s.y * CELL_SIZE + 4,
        CELL_SIZE - 8,
        CELL_SIZE - 8
      );
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        s.x * CELL_SIZE + 4,
        s.y * CELL_SIZE + 4,
        CELL_SIZE - 8,
        CELL_SIZE - 8
      );
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy);
      let angle = 0;
      switch (s.direction) {
        case 'right':
          angle = 0;
          break;
        case 'down':
          angle = Math.PI / 2;
          break;
        case 'left':
          angle = Math.PI;
          break;
        case 'up':
          angle = -Math.PI / 2;
          break;
      }
      ctx.rotate(angle);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(8, -5);
      ctx.lineTo(18, 0);
      ctx.lineTo(8, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  drawBoxes(state: GameState): void {
    const ctx = this.ctx;
    for (const b of state.boxes) {
      const x = b.x * CELL_SIZE;
      const y = b.y * CELL_SIZE;
      const pad = 3;

      const grad = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
      grad.addColorStop(0, '#8b5a2b');
      grad.addColorStop(0.5, '#a0693a');
      grad.addColorStop(1, '#6b4420');
      ctx.fillStyle = grad;
      ctx.fillRect(x + pad, y + pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2);

      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + pad, y + pad + (i * (CELL_SIZE - pad * 2)) / 4);
        ctx.lineTo(x + CELL_SIZE - pad, y + pad + (i * (CELL_SIZE - pad * 2)) / 4);
        ctx.stroke();
      }

      ctx.strokeStyle = '#4a2a10';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + pad, y + pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2);
    }
  }

  drawPlacedTools(state: GameState, time: number): void {
    const ctx = this.ctx;

    for (const m of state.placedMirrors) {
      this.drawMirror(m.x, m.y, m.orientation, false);
      if (
        state.placedHighlight &&
        GameBoard.posEq(state.placedHighlight, m)
      ) {
        const age = time;
        const alpha = Math.max(0, 1 - age / 500);
        ctx.save();
        ctx.shadowColor = '#aaaacc';
        ctx.shadowBlur = 20 * alpha;
        ctx.strokeStyle = `rgba(200, 220, 255, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(
          m.x * CELL_SIZE + 2,
          m.y * CELL_SIZE + 2,
          CELL_SIZE - 4,
          CELL_SIZE - 4
        );
        ctx.restore();
      }
    }

    for (const p of state.placedPrisms) {
      this.drawPrism(p.x, p.y, false);
      if (
        state.placedHighlight &&
        GameBoard.posEq(state.placedHighlight, p)
      ) {
        const age = time;
        const alpha = Math.max(0, 1 - age / 500);
        ctx.save();
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 20 * alpha;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(
          p.x * CELL_SIZE + 2,
          p.y * CELL_SIZE + 2,
          CELL_SIZE - 4,
          CELL_SIZE - 4
        );
        ctx.restore();
      }
    }
  }

  drawMirror(gx: number, gy: number, orientation: '/' | '\\', preview: boolean): void {
    const ctx = this.ctx;
    const cx = gx * CELL_SIZE + CELL_SIZE / 2;
    const cy = gy * CELL_SIZE + CELL_SIZE / 2;
    const size = CELL_SIZE * 0.42;

    ctx.save();
    if (preview) {
      ctx.globalAlpha = 0.5;
    }

    const grad = ctx.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
    grad.addColorStop(0, '#e8e8f0');
    grad.addColorStop(0.5, '#b8b8c8');
    grad.addColorStop(1, '#8888a0');

    ctx.translate(cx, cy);
    if (orientation === '\\') {
      ctx.rotate(Math.PI / 2);
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#666688';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-size * 0.6, size * 0.1);
    ctx.lineTo(size * 0.1, -size * 0.6);
    ctx.stroke();

    ctx.restore();
  }

  drawPrism(gx: number, gy: number, preview: boolean): void {
    const ctx = this.ctx;
    const cx = gx * CELL_SIZE + CELL_SIZE / 2;
    const cy = gy * CELL_SIZE + CELL_SIZE / 2;
    const size = CELL_SIZE * 0.4;

    ctx.save();
    if (preview) {
      ctx.globalAlpha = 0.5;
    }

    const grad = ctx.createLinearGradient(cx, cy - size, cx, cy + size);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.5, 'rgba(220, 240, 255, 0.9)');
    grad.addColorStop(1, 'rgba(180, 200, 220, 0.85)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size, cy + size * 0.6);
    ctx.lineTo(cx - size, cy + size * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(150, 200, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = preview ? 0.3 : 0.6;
    ctx.strokeStyle = '#44ff66';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.6, cy + size * 0.3);
    ctx.lineTo(cx - size * 0.2, cy + size * 0.5);
    ctx.stroke();
    ctx.strokeStyle = '#4488ff';
    ctx.beginPath();
    ctx.moveTo(cx + size * 0.2, cy + size * 0.5);
    ctx.lineTo(cx + size * 0.6, cy + size * 0.3);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  drawLasers(state: GameState, time: number): void {
    const ctx = this.ctx;
    for (const seg of state.laserPaths) {
      this.drawLaserSegment(seg, time);
    }
  }

  drawLaserSegment(seg: LaserSegment, time: number): void {
    const ctx = this.ctx;
    const color = COLORS[seg.color];
    const glow = GLOW_COLORS[seg.color];
    const x1 = seg.from.x * CELL_SIZE + CELL_SIZE / 2;
    const y1 = seg.from.y * CELL_SIZE + CELL_SIZE / 2;
    const x2 = seg.to.x * CELL_SIZE + CELL_SIZE / 2;
    const y2 = seg.to.y * CELL_SIZE + CELL_SIZE / 2;

    const scanProgress = Math.min(1, (time % 500) / 300);
    const endX = x1 + (x2 - x1) * scanProgress;
    const endY = y1 + (y2 - y1) * scanProgress;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    ctx.strokeStyle = glow;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.restore();
  }

  drawPlayer(state: GameState, time: number): void {
    const ctx = this.ctx;
    const p = state.player;
    const x = p.x * CELL_SIZE + 4;
    const y = p.y * CELL_SIZE + 4;
    const w = CELL_SIZE - 8;
    const h = CELL_SIZE - 8;
    const r = 8;

    ctx.save();
    const pulse = (Math.sin(time / 300) + 1) / 2;
    ctx.shadowColor = '#4488ff';
    ctx.shadowBlur = 8 + pulse * 4;

    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#5599ff');
    grad.addColorStop(1, '#3366cc');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(x + w * 0.35, y + h * 0.4, 3, 0, Math.PI * 2);
    ctx.arc(x + w * 0.65, y + h * 0.4, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawToolPreview(state: GameState): void {
    if (!this.hoverCell || !state.selectedTool) return;
    if (!GameBoard.isInBounds(this.hoverCell, state.gridSize)) return;

    const ctx = this.ctx;
    const cell = this.hoverCell;
    ctx.save();

    const isWall = state.walls.some((w) => GameBoard.posEq(w, cell));
    const isBox = state.boxes.some((b) => GameBoard.posEq(b, cell));
    const isMirror = state.placedMirrors.some((m) => GameBoard.posEq(m, cell));
    const isPrism = state.placedPrisms.some((p) => GameBoard.posEq(p, cell));
    const isTarget = state.targets.some((t) => GameBoard.posEq(t, cell));
    const isSrc = state.lightSources.some((s) => GameBoard.posEq(s, cell));
    const isPlayer = GameBoard.posEq(state.player, cell);
    const occupied = isWall || isBox || isMirror || isPrism || isTarget || isSrc || isPlayer;

    if (!occupied) {
      if (state.selectedTool === 'mirror') {
        this.drawMirror(cell.x, cell.y, state.selectedMirrorOrientation, true);
      } else if (state.selectedTool === 'prism') {
        this.drawPrism(cell.x, cell.y, true);
      }
    } else {
      ctx.fillStyle = 'rgba(255, 80, 80, 0.2)';
      ctx.fillRect(
        cell.x * CELL_SIZE,
        cell.y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE
      );
    }

    ctx.restore();
  }

  spawnWinParticles(state: GameState): void {
    for (const t of state.targets) {
      const cx = t.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = t.y * CELL_SIZE + CELL_SIZE / 2;
      const colors = ['#ff4444', '#44ff66', '#4488ff'];
      for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.5;
        const speed = 2 + Math.random() * 4;
        this.winParticles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1,
        });
      }
    }
  }

  drawWinParticles(): void {
    const ctx = this.ctx;
    this.winParticles = this.winParticles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= 0.015;
      if (p.life <= 0) return false;

      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    });
  }

  drawHitFlash(state: GameState): void {
    if (!state.hitFlash) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 0, 0, 0.25)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  }
}
