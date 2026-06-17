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

type TerrainRenderer = (ctx: CanvasRenderingContext2D, px: number, py: number, size: number) => void;

const TERRAIN_RENDERERS: Record<TerrainType, TerrainRenderer> = {
  brick: drawBrickPattern,
  grass: drawGrassPattern,
  spike: drawSpikePattern,
  platform: drawPlatformPattern,
};

function px(size: number, ratio: number): number {
  return Math.max(1, Math.floor(size * ratio));
}

function drawBrickPattern(ctx: CanvasRenderingContext2D, px0: number, py0: number, size: number): void {
  const half = size / 2;
  const lineW = px(size, 0.05);
  const inset = px(size, 0.05);

  ctx.fillStyle = COLORS.brickBase;
  ctx.fillRect(px0, py0, size, size);

  ctx.fillStyle = COLORS.brickDark;
  ctx.fillRect(px0, py0, size, lineW);
  ctx.fillRect(px0, py0 + half - lineW / 2, size, lineW);
  ctx.fillRect(px0, py0 + size - lineW, size, lineW);

  ctx.fillRect(px0, py0, lineW, half);
  ctx.fillRect(px0 + half - lineW / 2, py0 + half, lineW, half);
  ctx.fillRect(px0 + size - lineW, py0, lineW, half);

  ctx.fillStyle = COLORS.brickLight;
  ctx.fillRect(px0 + inset * 2, py0 + inset * 2, half - inset * 4, half - inset * 4);
  ctx.fillRect(px0 + half + inset * 2, py0 + half + inset * 2, half - inset * 4, half - inset * 4);
}

function drawGrassPattern(ctx: CanvasRenderingContext2D, px0: number, py0: number, size: number): void {
  const soilH = px(size, 0.15);
  const borderW = px(size, 0.03);
  const grassW = px(size, 0.05);
  const grassH = px(size, 0.08);

  ctx.fillStyle = COLORS.grassBase;
  ctx.fillRect(px0, py0, size, size);

  ctx.fillStyle = COLORS.grassDark;
  ctx.fillRect(px0, py0 + size - soilH, size, soilH);
  ctx.fillRect(px0, py0, size, borderW);
  ctx.fillRect(px0, py0, borderW, size);
  ctx.fillRect(px0 + size - borderW, py0, borderW, size);

  ctx.fillStyle = COLORS.grassLight;
  const seed = Math.floor((px0 * 7 + py0 * 13) / Math.max(1, size));
  const count = Math.max(6, Math.floor(size / 4));
  const rng = seededRandom(seed);
  for (let i = 0; i < count; i++) {
    const gx = px0 + Math.floor(rng() * (size - grassW * 2)) + grassW;
    const gy = py0 + Math.floor(rng() * (size - soilH - grassH * 2)) + grassH;
    ctx.fillRect(gx, gy, grassW, grassH);
  }
}

function drawSpikePattern(ctx: CanvasRenderingContext2D, px0: number, py0: number, size: number): void {
  const tipCount = 4;
  const spikeWidth = size / tipCount;
  const spikeHeight = size * 0.7;
  const baseY = py0 + size;
  const baseH = px(size, 0.1);
  const highlightW = px(size, 0.04);

  ctx.fillStyle = COLORS.spikeDark;
  ctx.fillRect(px0, baseY - baseH, size, baseH);

  for (let i = 0; i < tipCount; i++) {
    const sx = px0 + i * spikeWidth;
    const tipX = sx + spikeWidth / 2;
    const tipY = py0 + size - spikeHeight;

    ctx.fillStyle = COLORS.spikeBase;
    ctx.beginPath();
    ctx.moveTo(sx, baseY - baseH);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(sx + spikeWidth, baseY - baseH);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = COLORS.spikeLight;
    ctx.fillRect(
      Math.floor(tipX - highlightW / 2),
      tipY + px(size, 0.05),
      highlightW,
      spikeHeight * 0.4
    );
  }

  ctx.fillStyle = COLORS.spikeDark;
  ctx.fillRect(px0, baseY - px(size, 0.05), size, px(size, 0.05));
}

function drawPlatformPattern(ctx: CanvasRenderingContext2D, px0: number, py0: number, size: number): void {
  const planks = 4;
  const plankHeight = size / planks;
  const lineW = px(size, 0.04);
  const borderW = px(size, 0.03);
  const highlightW = px(size, 0.1);
  const highlightH = px(size, 0.12);

  ctx.fillStyle = COLORS.platformBase;
  ctx.fillRect(px0, py0, size, size);

  ctx.fillStyle = COLORS.platformDark;
  for (let i = 1; i < planks; i++) {
    ctx.fillRect(px0, py0 + i * plankHeight - lineW / 2, size, lineW);
  }

  ctx.fillStyle = COLORS.platformLight;
  for (let i = 0; i < planks; i++) {
    ctx.fillRect(
      px0 + highlightW / 2,
      py0 + i * plankHeight + highlightH / 2,
      highlightW,
      plankHeight - highlightH
    );
  }

  ctx.fillStyle = COLORS.platformDark;
  ctx.fillRect(px0, py0, size, borderW);
  ctx.fillRect(px0, py0 + size - borderW, size, borderW);
  ctx.fillRect(px0, py0, borderW, size);
  ctx.fillRect(px0 + size - borderW, py0, borderW, size);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

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
    this.drawTiles(data);
    this.drawEntities(data);

    if (mode === 'game') {
      this.drawPlayer(data);
      this.drawParticles(data);
    }

    if (mode === 'editor') {
      this.drawGrid(data);
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
        const px1 = (i * 73) % w;
        const py1 = (i * 47) % h;
        const dotSize = Math.max(1, Math.floor(tileSize * 0.05));
        this.ctx.fillRect(px1, py1, dotSize, dotSize);
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
      const pxi = tile.x * tileSize;
      const pyi = tile.y * tileSize;
      this.drawTerrainTile(pxi, pyi, tileSize, tile.type, 1);
    }
  }

  drawTerrainTile(px0: number, py0: number, size: number, type: TerrainType, alpha: number = 1): void {
    this.ctx.save();
    if (alpha < 1) {
      this.ctx.globalAlpha = alpha;
    }

    const renderer = TERRAIN_RENDERERS[type];
    if (renderer) {
      renderer(this.ctx, px0, py0, size);
    }

    this.ctx.restore();
  }

  static drawTerrainIcon(ctx: CanvasRenderingContext2D, type: TerrainType, size: number): void {
    const renderer = TERRAIN_RENDERERS[type];
    if (renderer) {
      renderer(ctx, 0, 0, size);
    }
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

  drawEnemy(px0: number, py0: number, tileSize: number, direction: 1 | -1 = 1, animate: boolean = false): void {
    const size = tileSize * 0.8;
    const offsetX = (tileSize - size) / 2;
    const offsetY = tileSize - size;
    const x = px0 + offsetX;
    const y = py0 + offsetY;

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
      const x1 = Math.cos(angle) * r;
      const y1 = Math.sin(angle) * r;
      if (i === 0) {
        this.ctx.moveTo(x1, y1);
      } else {
        this.ctx.lineTo(x1, y1);
      }
    }
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = COLORS.starDark;
    for (let i = 0; i < points; i++) {
      const angle = (i * 2 * Math.PI) / points - Math.PI / 2;
      const x1 = Math.cos(angle) * (outerR * 0.5);
      const y1 = Math.sin(angle) * (outerR * 0.5);
      this.ctx.fillRect(x1 - 1, y1 - 1, 2, 2);
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
    const { player } = data;

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

    const pxi = Math.floor(x);
    const pyi = Math.floor(y);
    const w = Math.floor(width);
    const h = Math.floor(height);

    const headH = Math.floor(h * 0.28);
    const bodyH = Math.floor(h * 0.38);
    const legH = h - headH - bodyH;
    const headY = pyi;
    const bodyY = pyi + headH;
    const legY = pyi + headH + bodyH;

    this.ctx.fillStyle = COLORS.playerSkin;
    this.ctx.fillRect(pxi + 2, headY, w - 4, headH);

    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(pxi + w * 0.55, headY + headH * 0.4, 2, 2);
    this.ctx.fillRect(pxi + w * 0.3, headY + headH * 0.4, 2, 2);

    this.ctx.fillStyle = COLORS.playerBody;
    this.ctx.fillRect(pxi + 1, bodyY, w - 2, bodyH);

    this.ctx.fillStyle = COLORS.playerSkin;
    const armSwing = onGround ? (Math.abs(vx) > 0.5 ? Math.sin(Date.now() / 80) * 2 : 0) : -2;
    this.ctx.fillRect(pxi - 1, bodyY + 2 + armSwing, 3, bodyH * 0.6);
    this.ctx.fillRect(pxi + w - 2, bodyY + 2 - armSwing, 3, bodyH * 0.6);

    this.ctx.fillStyle = COLORS.playerPants;
    const legSwing = onGround ? (Math.abs(vx) > 0.5 ? Math.sin(Date.now() / 80) * 2 : 0) : 3;
    this.ctx.fillRect(pxi + 2, legY, Math.floor(w / 2) - 3, legH + legSwing);
    this.ctx.fillRect(pxi + Math.floor(w / 2) + 1, legY, Math.floor(w / 2) - 3, legH - legSwing);

    this.ctx.fillStyle = COLORS.playerShoe;
    this.ctx.fillRect(pxi + 1, legY + legH - 2 + legSwing, Math.floor(w / 2) - 1, 3);
    this.ctx.fillRect(pxi + Math.floor(w / 2), legY + legH - 2 - legSwing, Math.floor(w / 2) - 1, 3);

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

    const pxi = hoverTile.x * tileSize;
    const pyi = hoverTile.y * tileSize;

    this.ctx.fillStyle = COLORS.hoverHighlight;
    this.ctx.fillRect(pxi, pyi, tileSize, tileSize);

    if (currentTool === 'eraser') {
      this.ctx.strokeStyle = '#FF0000';
      this.ctx.lineWidth = 2;
      const margin = Math.max(8, Math.floor(tileSize * 0.2));
      this.ctx.beginPath();
      this.ctx.moveTo(pxi + margin, pyi + margin);
      this.ctx.lineTo(pxi + tileSize - margin, pyi + tileSize - margin);
      this.ctx.moveTo(pxi + tileSize - margin, pyi + margin);
      this.ctx.lineTo(pxi + margin, pyi + tileSize - margin);
      this.ctx.stroke();
    } else if (currentTool === 'enemy') {
      this.drawEnemy(pxi, pyi, tileSize, 1, false);
    } else if (currentTool === 'collectible') {
      this.drawCollectible(pxi + tileSize / 2, pyi + tileSize / 2, tileSize, 0, 0);
    } else {
      this.drawTerrainTile(pxi, pyi, tileSize, currentTool as TerrainType, 0.6);
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
