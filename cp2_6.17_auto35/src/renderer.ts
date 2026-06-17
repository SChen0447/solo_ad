export type TerrainType = 'brick' | 'grass' | 'spike' | 'platform';
export type EntityType = 'enemy' | 'collectible';
export type ToolType = TerrainType | EntityType | 'eraser';

export interface Tile {
  x: number;
  y: number;
  type: TerrainType;
}

export interface Enemy {
  x: number;
  y: number;
  patrolLeft: number;
  patrolRight: number;
  speed: number;
  direction: 1 | -1;
  initialX: number;
}

export interface Collectible {
  x: number;
  y: number;
  collected: boolean;
  rotation: number;
  collectAnim: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isDead: boolean;
  deathTimer: number;
  onGround: boolean;
  facing: 1 | -1;
  animFrame: number;
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

export interface LevelData {
  tiles: Tile[];
  enemies: Enemy[];
  collectibles: Collectible[];
  spawnPoint: { x: number; y: number };
}

export interface RenderData {
  mode: 'editor' | 'game';
  level: LevelData;
  player: Player;
  score: number;
  particles: Particle[];
  gridWidth: number;
  gridHeight: number;
  tileSize: number;
  hoverTile: { x: number; y: number } | null;
  currentTool: ToolType;
  transitionAlpha: number;
  offsetX: number;
  offsetY: number;
}

const COLORS = {
  background: '#2F2F2F',
  gridLine: '#3a3a3a',
  hoverHighlight: 'rgba(255, 255, 0, 0.53)',
  brickBase: '#8B4513',
  brickDark: '#654321',
  brickLight: '#A0522D',
  grassBase: '#228B22',
  grassDark: '#006400',
  grassLight: '#32CD32',
  spikeBase: '#CC0000',
  spikeDark: '#8B0000',
  spikeLight: '#FF4444',
  platformBase: '#B0C4DE',
  platformDark: '#708090',
  platformLight: '#E6E6FA',
  playerBody: '#4169E1',
  playerSkin: '#FFDBAC',
  playerPants: '#191970',
  playerShoe: '#8B4513',
  enemyBody: '#DC143C',
  enemyDark: '#8B0000',
  enemyEye: '#FFFFFF',
  enemyPupil: '#000000',
  starBase: '#FFD700',
  starDark: '#DAA520',
  starLight: '#FFFF00',
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private grassPatternCache: Map<number, HTMLCanvasElement> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not supported');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  render(data: RenderData): void {
    const { mode, transitionAlpha, offsetX, offsetY } = data;

    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);

    this.drawBackground(data);

    if (mode === 'editor') {
      this.drawGrid(data);
    }

    this.drawTiles(data);
    this.drawEntities(data);

    if (mode === 'game') {
      this.drawPlayer(data);
      this.drawParticles(data);
    }

    if (mode === 'editor') {
      this.drawHoverPreview(data);
    }

    this.ctx.restore();

    if (transitionAlpha > 0) {
      this.drawTransition(transitionAlpha);
    }
  }

  private drawBackground(data: RenderData): void {
    const { gridWidth, gridHeight, tileSize } = data;
    const w = gridWidth * tileSize;
    const h = gridHeight * tileSize;

    this.ctx.fillStyle = COLORS.background;
    this.ctx.fillRect(0, 0, w, h);

    if (data.mode === 'game') {
      this.ctx.fillStyle = '#3a3a3a';
      for (let i = 0; i < 20; i++) {
        const px = (i * 73) % w;
        const py = (i * 47) % h;
        this.ctx.fillRect(px, py, 2, 2);
      }
    }
  }

  private drawGrid(data: RenderData): void {
    const { gridWidth, gridHeight, tileSize } = data;
    const w = gridWidth * tileSize;
    const h = gridHeight * tileSize;

    this.ctx.strokeStyle = COLORS.gridLine;
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= gridWidth; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * tileSize + 0.5, 0);
      this.ctx.lineTo(x * tileSize + 0.5, h);
      this.ctx.stroke();
    }

    for (let y = 0; y <= gridHeight; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * tileSize + 0.5);
      this.ctx.lineTo(w, y * tileSize + 0.5);
      this.ctx.stroke();
    }
  }

  private drawTiles(data: RenderData): void {
    const { level, tileSize } = data;

    for (const tile of level.tiles) {
      const px = tile.x * tileSize;
      const py = tile.y * tileSize;
      this.drawTerrainTile(px, py, tileSize, tile.type, 1);
    }
  }

  drawTerrainTile(px: number, py: number, size: number, type: TerrainType, alpha: number = 1): void {
    this.ctx.save();
    if (alpha < 1) {
      this.ctx.globalAlpha = alpha;
    }

    switch (type) {
      case 'brick':
        this.drawBrickTile(px, py, size);
        break;
      case 'grass':
        this.drawGrassTile(px, py, size);
        break;
      case 'spike':
        this.drawSpikeTile(px, py, size);
        break;
      case 'platform':
        this.drawPlatformTile(px, py, size);
        break;
    }

    this.ctx.restore();
  }

  private drawBrickTile(px: number, py: number, size: number): void {
    const half = size / 2;

    this.ctx.fillStyle = COLORS.brickBase;
    this.ctx.fillRect(px, py, size, size);

    this.ctx.fillStyle = COLORS.brickDark;
    this.ctx.fillRect(px, py, size, 2);
    this.ctx.fillRect(px, py + half - 1, size, 2);
    this.ctx.fillRect(px, py + size - 2, size, 2);

    this.ctx.fillRect(px, py, 2, half);
    this.ctx.fillRect(px + half - 1, py + half, 2, half);
    this.ctx.fillRect(px + size - 2, py, 2, half);

    this.ctx.fillStyle = COLORS.brickLight;
    this.ctx.fillRect(px + 2, py + 2, half - 4, half - 4);
    this.ctx.fillRect(px + half + 2, py + half + 2, half - 4, half - 4);
  }

  private drawGrassTile(px: number, py: number, size: number): void {
    this.ctx.fillStyle = COLORS.grassBase;
    this.ctx.fillRect(px, py, size, size);

    this.ctx.fillStyle = COLORS.grassDark;
    this.ctx.fillRect(px, py + size - 4, size, 4);
    this.ctx.fillRect(px, py, size, 1);
    this.ctx.fillRect(px, py, 1, size);
    this.ctx.fillRect(px + size - 1, py, 1, size);

    this.ctx.fillStyle = COLORS.grassLight;
    const seed = Math.floor((px * 7 + py * 13) / 40);
    const grassPositions = this.getGrassPositions(seed, size);
    for (const g of grassPositions) {
      this.ctx.fillRect(px + g.x, py + g.y, 2, 3);
    }
  }

  private getGrassPositions(seed: number, size: number): Array<{ x: number; y: number }> {
    if (this.grassPatternCache.has(seed)) {
      const cached = this.grassPatternCache.get(seed)!;
      const positions: Array<{ x: number; y: number }> = [];
      const ctx = cached.getContext('2d')!;
      const imgData = ctx.getImageData(0, 0, size, size);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          if (imgData.data[idx + 3] > 0) {
            positions.push({ x, y });
          }
        }
      }
      return positions;
    }

    const positions: Array<{ x: number; y: number }> = [];
    const rng = this.seededRandom(seed);
    for (let i = 0; i < 12; i++) {
      positions.push({
        x: Math.floor(rng() * (size - 4)) + 2,
        y: Math.floor(rng() * (size - 8)) + 2,
      });
    }

    const offscreen = document.createElement('canvas');
    offscreen.width = size;
    offscreen.height = size;
    const offCtx = offscreen.getContext('2d')!;
    offCtx.fillStyle = COLORS.grassLight;
    for (const p of positions) {
      offCtx.fillRect(p.x, p.y, 2, 3);
    }
    this.grassPatternCache.set(seed, offscreen);

    return positions;
  }

  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  private drawSpikeTile(px: number, py: number, size: number): void {
    const tipCount = 4;
    const spikeWidth = size / tipCount;
    const spikeHeight = size * 0.7;
    const baseY = py + size;

    this.ctx.fillStyle = COLORS.spikeDark;
    this.ctx.fillRect(px, baseY - 4, size, 4);

    for (let i = 0; i < tipCount; i++) {
      const sx = px + i * spikeWidth;
      const tipX = sx + spikeWidth / 2;
      const tipY = py + size - spikeHeight;

      this.ctx.fillStyle = COLORS.spikeBase;
      this.ctx.beginPath();
      this.ctx.moveTo(sx, baseY - 4);
      this.ctx.lineTo(tipX, tipY);
      this.ctx.lineTo(sx + spikeWidth, baseY - 4);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = COLORS.spikeLight;
      this.ctx.fillRect(Math.floor(tipX - 1), tipY + 2, 2, spikeHeight * 0.4);
    }

    this.ctx.fillStyle = COLORS.spikeDark;
    this.ctx.fillRect(px, baseY - 2, size, 2);
  }

  private drawPlatformTile(px: number, py: number, size: number): void {
    const plankHeight = size / 4;

    this.ctx.fillStyle = COLORS.platformBase;
    this.ctx.fillRect(px, py, size, size);

    this.ctx.fillStyle = COLORS.platformDark;
    for (let i = 1; i < 4; i++) {
      this.ctx.fillRect(px, py + i * plankHeight - 1, size, 2);
    }

    this.ctx.fillStyle = COLORS.platformLight;
    for (let i = 0; i < 4; i++) {
      this.ctx.fillRect(px + 2, py + i * plankHeight + 2, 4, plankHeight - 6);
    }

    this.ctx.fillStyle = COLORS.platformDark;
    this.ctx.fillRect(px, py, size, 1);
    this.ctx.fillRect(px, py + size - 1, size, 1);
    this.ctx.fillRect(px, py, 1, size);
    this.ctx.fillRect(px + size - 1, py, 1, size);
  }

  private drawEntities(data: RenderData): void {
    const { level, tileSize, mode } = data;

    for (const enemy of level.enemies) {
      this.drawEnemy(enemy.x * tileSize, enemy.y * tileSize, tileSize, enemy.direction, mode === 'game');
    }

    for (const collectible of level.collectibles) {
      if (!collectible.collected || collectible.collectAnim > 0) {
        this.drawCollectible(
          collectible.x * tileSize + tileSize / 2,
          collectible.y * tileSize + tileSize / 2,
          tileSize,
          collectible.rotation,
          collectible.collectAnim
        );
      }
    }
  }

  drawEnemy(px: number, py: number, tileSize: number, direction: 1 | -1 = 1, animate: boolean = false): void {
    const size = tileSize * 0.8;
    const offsetX = (tileSize - size) / 2;
    const offsetY = tileSize - size;
    const x = px + offsetX;
    const y = py + offsetY;

    this.ctx.fillStyle = COLORS.enemyBody;
    this.ctx.beginPath();
    this.ctx.arc(x + size / 2, y + size * 0.6, size / 2, Math.PI, 0, false);
    this.ctx.lineTo(x + size, y + size * 0.85);
    this.ctx.quadraticCurveTo(x + size / 2, y + size * 1.1, x, y + size * 0.85);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = COLORS.enemyDark;
    this.ctx.fillRect(x + 2, y + size * 0.65, size - 4, 2);

    const eyeY = y + size * 0.4;
    const eyeSize = size * 0.2;
    const eyeOffset = direction === 1 ? size * 0.15 : -size * 0.15;

    this.ctx.fillStyle = COLORS.enemyEye;
    this.ctx.fillRect(x + size * 0.3 + eyeOffset, eyeY, eyeSize, eyeSize);
    this.ctx.fillRect(x + size * 0.55 + eyeOffset, eyeY, eyeSize, eyeSize);

    this.ctx.fillStyle = COLORS.enemyPupil;
    const pupilOffset = direction === 1 ? eyeSize * 0.3 : 0;
    this.ctx.fillRect(x + size * 0.3 + eyeOffset + pupilOffset, eyeY + eyeSize * 0.3, eyeSize * 0.4, eyeSize * 0.4);
    this.ctx.fillRect(x + size * 0.55 + eyeOffset + pupilOffset, eyeY + eyeSize * 0.3, eyeSize * 0.4, eyeSize * 0.4);

    if (animate) {
      this.ctx.fillStyle = COLORS.enemyDark;
      this.ctx.fillRect(x + size * 0.2, y + size * 0.85, 4, 2);
      this.ctx.fillRect(x + size * 0.6, y + size * 0.9, 4, 2);
    }
  }

  drawCollectible(cx: number, cy: number, tileSize: number, rotation: number = 0, collectAnim: number = 0): void {
    const size = tileSize * 0.5;
    const scale = collectAnim > 0 ? 1 - collectAnim / 0.3 : 1;
    const actualSize = size * scale;

    if (scale <= 0) return;

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(rotation);

    const points = 5;
    const outerR = actualSize / 2;
    const innerR = actualSize / 4;

    this.ctx.fillStyle = COLORS.starBase;
    this.ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = COLORS.starDark;
    for (let i = 0; i < points; i++) {
      const angle = (i * 2 * Math.PI) / points - Math.PI / 2;
      const x = Math.cos(angle) * (outerR * 0.5);
      const y = Math.sin(angle) * (outerR * 0.5);
      this.ctx.fillRect(x - 1, y - 1, 2, 2);
    }

    this.ctx.fillStyle = COLORS.starLight;
    this.ctx.fillRect(-1, -outerR * 0.3, 2, outerR * 0.4);
    this.ctx.fillRect(-outerR * 0.3, -1, outerR * 0.4, 2);

    if (collectAnim === 0) {
      this.ctx.fillStyle = `rgba(255, 255, 0, ${0.3 + Math.sin(rotation * 2) * 0.2})`;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, outerR * 1.2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private drawPlayer(data: RenderData): void {
    const { player, tileSize } = data;

    if (player.isDead && Math.floor(player.deathTimer * 20) % 2 === 0) {
      return;
    }

    this.drawPlayerSprite(player.x, player.y, player.width, player.height, player.facing, player.onGround, player.vx);
  }

  drawPlayerSprite(x: number, y: number, width: number, height: number, facing: 1 | -1, onGround: boolean, vx: number): void {
    this.ctx.save();

    if (facing === -1) {
      this.ctx.translate(x + width, y);
      this.ctx.scale(-1, 1);
      x = 0;
      y = 0;
    }

    const px = Math.floor(x);
    const py = Math.floor(y);
    const w = Math.floor(width);
    const h = Math.floor(height);

    const headH = Math.floor(h * 0.28);
    const bodyH = Math.floor(h * 0.38);
    const legH = h - headH - bodyH;
    const headY = py;
    const bodyY = py + headH;
    const legY = py + headH + bodyH;

    this.ctx.fillStyle = COLORS.playerSkin;
    this.ctx.fillRect(px + 2, headY, w - 4, headH);

    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(px + w * 0.55, headY + headH * 0.4, 2, 2);
    this.ctx.fillRect(px + w * 0.3, headY + headH * 0.4, 2, 2);

    this.ctx.fillStyle = COLORS.playerBody;
    this.ctx.fillRect(px + 1, bodyY, w - 2, bodyH);

    this.ctx.fillStyle = COLORS.playerSkin;
    const armSwing = onGround ? (Math.abs(vx) > 0.5 ? Math.sin(Date.now() / 80) * 2 : 0) : -2;
    this.ctx.fillRect(px - 1, bodyY + 2 + armSwing, 3, bodyH * 0.6);
    this.ctx.fillRect(px + w - 2, bodyY + 2 - armSwing, 3, bodyH * 0.6);

    this.ctx.fillStyle = COLORS.playerPants;
    const legSwing = onGround ? (Math.abs(vx) > 0.5 ? Math.sin(Date.now() / 80) * 2 : 0) : 3;
    this.ctx.fillRect(px + 2, legY, Math.floor(w / 2) - 3, legH + legSwing);
    this.ctx.fillRect(px + Math.floor(w / 2) + 1, legY, Math.floor(w / 2) - 3, legH - legSwing);

    this.ctx.fillStyle = COLORS.playerShoe;
    this.ctx.fillRect(px + 1, legY + legH - 2 + legSwing, Math.floor(w / 2) - 1, 3);
    this.ctx.fillRect(px + Math.floor(w / 2), legY + legH - 2 - legSwing, Math.floor(w / 2) - 1, 3);

    this.ctx.restore();
  }

  private drawParticles(data: RenderData): void {
    for (const p of data.particles) {
      const alpha = p.life / p.maxLife;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    this.ctx.globalAlpha = 1;
  }

  private drawHoverPreview(data: RenderData): void {
    const { hoverTile, currentTool, tileSize, gridWidth, gridHeight } = data;

    if (!hoverTile) return;
    if (hoverTile.x < 0 || hoverTile.x >= gridWidth || hoverTile.y < 0 || hoverTile.y >= gridHeight) return;

    const px = hoverTile.x * tileSize;
    const py = hoverTile.y * tileSize;

    this.ctx.fillStyle = COLORS.hoverHighlight;
    this.ctx.fillRect(px, py, tileSize, tileSize);

    if (currentTool === 'eraser') {
      this.ctx.strokeStyle = '#FF0000';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(px + 8, py + 8);
      this.ctx.lineTo(px + tileSize - 8, py + tileSize - 8);
      this.ctx.moveTo(px + tileSize - 8, py + 8);
      this.ctx.lineTo(px + 8, py + tileSize - 8);
      this.ctx.stroke();
    } else if (currentTool === 'enemy') {
      this.drawEnemy(px, py, tileSize, 1, false);
    } else if (currentTool === 'collectible') {
      this.drawCollectible(px + tileSize / 2, py + tileSize / 2, tileSize, 0, 0);
    } else {
      this.drawTerrainTile(px, py, tileSize, currentTool as TerrainType, 0.6);
    }
  }

  private drawTransition(alpha: number): void {
    this.ctx.fillStyle = `rgba(47, 47, 47, ${alpha})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
}
