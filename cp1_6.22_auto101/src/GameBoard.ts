import type { MapData, Wall, Chest, Position, HighlightCell, Effect, Player, Monster, FloatingText } from './types';

const FLOOR_COLOR = '#3a3d4a';
const GRID_LINE_COLOR = '#555a6a';
const WALL_COLOR = '#5c4033';
const WALL_DARK_COLOR = '#3d2a22';
const HIGHLIGHT_VALID = 'rgba(104, 211, 145, 0.5)';
const HIGHLIGHT_INVALID = 'rgba(160, 174, 192, 0.4)';

export class GameBoard {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  mapData!: MapData;
  walls: Set<string> = new Set();
  chests: Chest[] = [];
  highlights: HighlightCell[] = [];
  effects: Effect[] = [];
  floatingTexts: FloatingText[] = [];
  offsetX: number = 0;
  offsetY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setMapData(mapData: MapData): void {
    this.mapData = mapData;
    this.walls.clear();
    mapData.walls.forEach((w: Wall) => {
      this.walls.add(`${w.x},${w.y}`);
    });
    this.chests = mapData.chests.map((c: Chest) => ({ ...c, opened: false }));
  }

  calculateOffset(): void {
    if (!this.mapData) return;
    const mapPixelWidth = this.mapData.gridSize * this.mapData.cellSize;
    const mapPixelHeight = this.mapData.gridSize * this.mapData.cellSize;
    const rect = this.canvas.getBoundingClientRect();
    this.offsetX = (rect.width - mapPixelWidth) / 2;
    this.offsetY = (rect.height - mapPixelHeight) / 2 - 20;
  }

  isWall(x: number, y: number): boolean {
    return this.walls.has(`${x},${y}`);
  }

  isInBounds(x: number, y: number): boolean {
    if (!this.mapData) return false;
    return x >= 0 && x < this.mapData.gridSize && y >= 0 && y < this.mapData.gridSize;
  }

  isPassable(x: number, y: number, monsters: Monster[]): boolean {
    if (!this.isInBounds(x, y)) return false;
    if (this.isWall(x, y)) return false;
    for (const m of monsters) {
      if (!m.isDead && m.x === x && m.y === y) return false;
    }
    return true;
  }

  getChestAt(x: number, y: number): Chest | null {
    return this.chests.find(c => c.x === x && c.y === y) || null;
  }

  getMonsterAt(x: number, y: number, monsters: Monster[]): Monster | null {
    return monsters.find(m => !m.isDead && m.x === x && m.y === y) || null;
  }

  screenToGrid(screenX: number, screenY: number): Position | null {
    if (!this.mapData) return null;
    this.calculateOffset();
    const rect = this.canvas.getBoundingClientRect();
    const localX = screenX - rect.left - this.offsetX;
    const localY = screenY - rect.top - this.offsetY;
    const gx = Math.floor(localX / this.mapData.cellSize);
    const gy = Math.floor(localY / this.mapData.cellSize);
    if (this.isInBounds(gx, gy)) {
      return { x: gx, y: gy };
    }
    return null;
  }

  gridToScreen(x: number, y: number): Position {
    if (!this.mapData) return { x: 0, y: 0 };
    this.calculateOffset();
    return {
      x: this.offsetX + x * this.mapData.cellSize + this.mapData.cellSize / 2,
      y: this.offsetY + y * this.mapData.cellSize + this.mapData.cellSize / 2,
    };
  }

  setHighlights(cells: HighlightCell[]): void {
    this.highlights = cells;
  }

  clearHighlights(): void {
    this.highlights = [];
  }

  addEffect(effect: Omit<Effect, 'progress'>): void {
    this.effects.push({ ...effect, progress: 0 });
  }

  addFloatingText(text: FloatingText): void {
    this.floatingTexts.push({ ...text });
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].progress += dt / this.effects[i].duration;
      if (this.effects[i].progress >= 1) {
        this.effects.splice(i, 1);
      }
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].progress += dt / this.floatingTexts[i].duration;
      if (this.floatingTexts[i].progress >= 1) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  render(player: Player, monsters: Monster[], time: number): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    this.calculateOffset();
    this.drawBackground();
    this.drawGrid(time);
    this.drawHighlights();
    this.drawChests(time);
    this.drawMonsters(monsters, time);
    this.drawPlayer(player, time);
    this.drawEffects(time);
    this.drawFloatingTexts();
  }

  drawBackground(): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const gradient = ctx.createRadialGradient(rect.width / 2, rect.height / 2, 0, rect.width / 2, rect.height / 2, rect.width);
    gradient.addColorStop(0, '#222938');
    gradient.addColorStop(1, '#0f1318');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);
  }

  drawGrid(time: number): void {
    if (!this.mapData) return;
    const ctx = this.ctx;
    const cs = this.mapData.cellSize;
    const gs = this.mapData.gridSize;

    for (let y = 0; y < gs; y++) {
      for (let x = 0; x < gs; x++) {
        const px = this.offsetX + x * cs;
        const py = this.offsetY + y * cs;
        ctx.fillStyle = FLOOR_COLOR;
        ctx.fillRect(px, py, cs, cs);
        ctx.strokeStyle = GRID_LINE_COLOR;
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, cs - 1, cs - 1);
        if (this.isWall(x, y)) {
          this.drawWall(px, py, cs);
        }
      }
    }
  }

  drawWall(px: number, py: number, cs: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = WALL_DARK_COLOR;
    ctx.fillRect(px + 2, py + 4, cs - 4, cs - 4);
    ctx.fillStyle = WALL_COLOR;
    ctx.fillRect(px + 4, py + 2, cs - 8, cs - 6);
    ctx.strokeStyle = '#8b6343';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 4.5, py + 2.5, cs - 9, cs - 7);
    ctx.strokeStyle = '#3d2a22';
    ctx.beginPath();
    ctx.moveTo(px + cs * 0.3, py + 4);
    ctx.lineTo(px + cs * 0.3, py + cs * 0.5);
    ctx.moveTo(px + cs * 0.6, py + cs * 0.5);
    ctx.lineTo(px + cs * 0.6, py + cs - 4);
    ctx.moveTo(px + 4, py + cs * 0.5);
    ctx.lineTo(px + cs - 4, py + cs * 0.5);
    ctx.stroke();
  }

  drawHighlights(): void {
    if (!this.mapData) return;
    const ctx = this.ctx;
    const cs = this.mapData.cellSize;
    for (const h of this.highlights) {
      const px = this.offsetX + h.x * cs;
      const py = this.offsetY + h.y * cs;
      ctx.fillStyle = h.valid ? HIGHLIGHT_VALID : HIGHLIGHT_INVALID;
      ctx.fillRect(px + 4, py + 4, cs - 8, cs - 8);
      ctx.strokeStyle = h.valid ? '#68d391' : '#a0aec0';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 4.5, py + 4.5, cs - 9, cs - 9);
    }
  }

  drawChests(time: number): void {
    if (!this.mapData) return;
    const ctx = this.ctx;
    const cs = this.mapData.cellSize;
    for (const chest of this.chests) {
      const pos = this.gridToScreen(chest.x, chest.y);
      const size = cs * 0.5;
      const flash = chest.opened ? 0 : Math.sin(time / 200) * 0.2 + 0.8;
      const rotAnim = chest.opened ? Math.min(this.getChestAnimProgress(chest), 1) : 0;

      ctx.save();
      ctx.translate(pos.x, pos.y);

      if (rotAnim > 0) {
        const scale = 1 + rotAnim * 0.3;
        ctx.scale(scale, scale);
        ctx.rotate(rotAnim * Math.PI * 2);
      }

      ctx.shadowBlur = 20 * flash;
      ctx.shadowColor = '#ecc94b';
      ctx.fillStyle = chest.opened ? '#8b6914' : '#b8860b';
      ctx.fillRect(-size / 2, -size / 3, size, size * 0.7);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#5c4a0a';
      ctx.lineWidth = 2;
      ctx.strokeRect(-size / 2, -size / 3, size, size * 0.7);

      if (!chest.opened) {
        ctx.fillStyle = '#ecc94b';
        ctx.fillRect(-size / 2, -size / 3, size, size * 0.15);
        ctx.fillStyle = '#5c4a0a';
        ctx.fillRect(-size * 0.08, -size * 0.15, size * 0.16, size * 0.2);
      } else {
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(-size / 2 + 4, -size / 3 + 4, size - 8, size * 0.7 - 8);
      }
      ctx.restore();
    }
  }

  private chestAnimStart: Map<Chest, number> = new Map();

  triggerChestAnimation(chest: Chest): void {
    this.chestAnimStart.set(chest, performance.now());
  }

  getChestAnimProgress(chest: Chest): number {
    const start = this.chestAnimStart.get(chest);
    if (!start) return 1;
    const elapsed = performance.now() - start;
    return Math.min(elapsed / 1000, 1);
  }

  drawMonsters(monsters: Monster[], time: number): void {
    if (!this.mapData) return;
    const ctx = this.ctx;
    const cs = this.mapData.cellSize;
    for (const m of monsters) {
      if (m.isDead) continue;
      const pos = this.gridToScreen(m.x, m.y);
      const bob = Math.sin(time / 300 + m.x * 1.3) * 3;
      const flash = (m.hitFlashTimer || 0) > 0;
      const size = cs * 0.5;

      ctx.save();
      ctx.translate(pos.x, pos.y + bob);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(0, size * 0.6, size * 0.5, size * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 12;
      ctx.shadowColor = m.color;
      ctx.fillStyle = flash ? '#ffffff' : m.color;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(-size * 0.18, -size * 0.1, size * 0.08, 0, Math.PI * 2);
      ctx.arc(size * 0.18, -size * 0.1, size * 0.08, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff3333';
      ctx.beginPath();
      ctx.arc(-size * 0.18, -size * 0.1, size * 0.04, 0, Math.PI * 2);
      ctx.arc(size * 0.18, -size * 0.1, size * 0.04, 0, Math.PI * 2);
      ctx.fill();

      const hpRatio = m.hp / m.maxHp;
      const barW = size * 1.2;
      const barH = 5;
      ctx.fillStyle = '#4a0000';
      ctx.fillRect(-barW / 2, -size * 0.9, barW, barH);
      ctx.fillStyle = hpRatio > 0.5 ? '#68d391' : hpRatio > 0.25 ? '#ecc94b' : '#fc8181';
      ctx.fillRect(-barW / 2, -size * 0.9, barW * hpRatio, barH);
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.strokeRect(-barW / 2 + 0.5, -size * 0.9 + 0.5, barW - 1, barH - 1);

      ctx.restore();

      if (m.hitFlashTimer !== undefined && m.hitFlashTimer > 0) {
        m.hitFlashTimer -= 16;
      }
    }
  }

  drawPlayer(player: Player, time: number): void {
    if (!this.mapData) return;
    const ctx = this.ctx;
    const cs = this.mapData.cellSize;
    let drawX = player.x;
    let drawY = player.y;
    if (player.moveAnimProgress !== undefined && player.moveAnimProgress < 1
        && player.moveAnimFrom && player.moveAnimTo) {
      const t = this.easeOutCubic(player.moveAnimProgress);
      drawX = player.moveAnimFrom.x + (player.moveAnimTo.x - player.moveAnimFrom.x) * t;
      drawY = player.moveAnimFrom.y + (player.moveAnimTo.y - player.moveAnimFrom.y) * t;
    }

    const pos = {
      x: this.offsetX + drawX * cs + cs / 2,
      y: this.offsetY + drawY * cs + cs / 2,
    };

    const flash = (player.hitFlashTimer || 0) > 0;
    const bob = Math.sin(time / 250) * 2;
    const size = cs * 0.48;

    ctx.save();
    ctx.translate(pos.x, pos.y + bob);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.65, size * 0.55, size * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 15;
    ctx.shadowColor = '#63b3ed';

    ctx.fillStyle = flash ? '#ffffff' : '#4a5568';
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.6);
    ctx.lineTo(-size * 0.35, size * 0.2);
    ctx.lineTo(-size * 0.5, size * 0.5);
    ctx.lineTo(size * 0.5, size * 0.5);
    ctx.lineTo(size * 0.35, size * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#1a202c';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = flash ? '#ffffff' : '#cbd5e0';
    ctx.beginPath();
    ctx.arc(0, -size * 0.75, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a202c';
    ctx.stroke();

    ctx.fillStyle = '#1a202c';
    ctx.fillRect(-size * 0.32, -size * 0.85, size * 0.64, size * 0.1);

    ctx.fillStyle = '#1a202c';
    ctx.fillRect(-size * 0.2, -size * 0.78, size * 0.12, size * 0.08);
    ctx.fillRect(size * 0.08, -size * 0.78, size * 0.12, size * 0.08);

    const hpRatio = player.hp / player.maxHp;
    const barW = size * 1.3;
    const barH = 6;
    ctx.fillStyle = '#4a0000';
    ctx.fillRect(-barW / 2, -size * 1.3, barW, barH);
    ctx.fillStyle = hpRatio > 0.5 ? '#68d391' : hpRatio > 0.25 ? '#ecc94b' : '#fc8181';
    ctx.fillRect(-barW / 2, -size * 1.3, barW * hpRatio, barH);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(-barW / 2 + 0.5, -size * 1.3 + 0.5, barW - 1, barH - 1);

    ctx.restore();

    if (player.hitFlashTimer !== undefined && player.hitFlashTimer > 0) {
      player.hitFlashTimer -= 16;
    }
  }

  drawEffects(time: number): void {
    const ctx = this.ctx;
    for (const eff of this.effects) {
      const t = eff.progress;
      switch (eff.type) {
        case 'slash':
          this.drawSlashEffect(eff, t);
          break;
        case 'arrow':
          this.drawArrowEffect(eff, t);
          break;
        case 'fireball':
          this.drawFireballEffect(eff, t);
          break;
        case 'explosion':
          this.drawExplosionEffect(eff, t);
          break;
        case 'heal':
          this.drawHealEffect(eff, t);
          break;
      }
    }
  }

  drawSlashEffect(eff: Effect, t: number): void {
    if (!this.mapData || eff.targetX === undefined || eff.targetY === undefined) return;
    const ctx = this.ctx;
    const cs = this.mapData.cellSize;
    const from = this.gridToScreen(eff.x, eff.y);
    const to = this.gridToScreen(eff.targetX, eff.targetY);
    const cx = from.x + (to.x - from.x) * t;
    const cy = from.y + (to.y - from.y) * t;
    const alpha = 1 - t;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * Math.PI);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ecc94b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-cs * 0.4, -cs * 0.3);
    ctx.lineTo(cs * 0.4, cs * 0.3);
    ctx.stroke();
    ctx.strokeStyle = `rgba(236, 201, 75, ${alpha * 0.5})`;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.restore();
  }

  drawArrowEffect(eff: Effect, t: number): void {
    if (!this.mapData || eff.targetX === undefined || eff.targetY === undefined) return;
    const ctx = this.ctx;
    const from = this.gridToScreen(eff.x, eff.y);
    const to = this.gridToScreen(eff.targetX, eff.targetY);
    const cx = from.x + (to.x - from.x) * t;
    const cy = from.y + (to.y - from.y) * t;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = '#8b6343';
    ctx.fillRect(-18, -2, 28, 4);
    ctx.beginPath();
    ctx.moveTo(10, -6);
    ctx.lineTo(18, 0);
    ctx.lineTo(10, 6);
    ctx.closePath();
    ctx.fillStyle = '#a0aec0';
    ctx.fill();
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fc8181';
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(-24, -6);
    ctx.lineTo(-22, 0);
    ctx.lineTo(-24, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawFireballEffect(eff: Effect, t: number): void {
    if (!this.mapData || eff.targetX === undefined || eff.targetY === undefined) return;
    const ctx = this.ctx;
    const cs = this.mapData.cellSize;
    const from = this.gridToScreen(eff.x, eff.y);
    const to = this.gridToScreen(eff.targetX, eff.targetY);
    const cx = from.x + (to.x - from.x) * t;
    const cy = from.y + (to.y - from.y) * t;
    ctx.save();
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#ff4400';
    const r = cs * 0.2 * (1 + Math.sin(t * 30) * 0.15);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#ffff00');
    grad.addColorStop(0.6, '#ff6600');
    grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawExplosionEffect(eff: Effect, t: number): void {
    if (!this.mapData) return;
    const ctx = this.ctx;
    const cs = this.mapData.cellSize;
    const pos = this.gridToScreen(eff.x, eff.y);
    const maxR = cs * (eff.data?.blastRadius || 2) * 0.9;
    const r = maxR * this.easeOutQuad(t);
    const alpha = 1 - t;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#ff4400';
    for (let i = 0; i < 3; i++) {
      const ir = r * (1 - i * 0.2);
      const ialpha = alpha * (1 - i * 0.3);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, ir);
      grad.addColorStop(0, `rgba(255, 255, 200, ${ialpha})`);
      grad.addColorStop(0.3, `rgba(255, 200, 0, ${ialpha * 0.8})`);
      grad.addColorStop(0.6, `rgba(255, 80, 0, ${ialpha * 0.5})`);
      grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, ir, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawHealEffect(eff: Effect, t: number): void {
    if (!this.mapData) return;
    const ctx = this.ctx;
    const cs = this.mapData.cellSize;
    const pos = this.gridToScreen(eff.x, eff.y);
    const alpha = 1 - t;
    const floatY = -t * cs * 0.5;
    ctx.save();
    ctx.translate(pos.x, pos.y + floatY);
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#68d391';
    ctx.font = `${cs * 0.4}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#68d391';
    ctx.fillText('💚', 0, 0);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + t * 3;
      const dist = cs * 0.35;
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist;
      ctx.fillStyle = `rgba(104, 211, 145, ${alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, 3 + (1 - t) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawFloatingTexts(): void {
    if (!this.mapData) return;
    const ctx = this.ctx;
    const cs = this.mapData.cellSize;
    for (const ft of this.floatingTexts) {
      const pos = this.gridToScreen(ft.x, ft.y);
      const t = ft.progress;
      const alpha = 1 - t;
      const floatY = -t * cs * 0.8;
      const scale = 1 + t * 0.3;
      ctx.save();
      ctx.translate(pos.x, pos.y + floatY);
      ctx.scale(scale, scale);
      ctx.font = 'bold 22px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 10;
      ctx.shadowColor = ft.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, 0, 0);
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = alpha;
      ctx.fillText(ft.text, 0, 0);
      ctx.restore();
    }
  }

  easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }

  easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
}
