import {
  Tile,
  CropType,
  COLORS,
  GRID_COLS,
  GRID_ROWS,
  TILE_SIZE,
  GRID_LINE_WIDTH,
  CROP_CONFIGS,
} from './types';

export class GridRenderer {
  ctx: CanvasRenderingContext2D;
  offsetX: number = 0;
  offsetY: number = 0;
  tileSize: number = TILE_SIZE;
  private time: number = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  setLayout(offsetX: number, offsetY: number, tileSize: number): void {
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.tileSize = tileSize;
  }

  getGridPos(canvasX: number, canvasY: number): { col: number; row: number } | null {
    const relX = canvasX - this.offsetX;
    const relY = canvasY - this.offsetY;
    const col = Math.floor(relX / this.tileSize);
    const row = Math.floor(relY / this.tileSize);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
      return null;
    }
    return { col, row };
  }

  render(tiles: Tile[][], dt: number): void {
    this.time += dt;
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        this.renderTile(tiles[row][col]);
      }
    }
  }

  private renderTile(tile: Tile): void {
    const px = this.offsetX + tile.col * this.tileSize;
    const py = this.offsetY + tile.row * this.tileSize;
    const s = this.tileSize;
    const ctx = this.ctx;

    const pressedOffset = tile.pressed > 0 ? Math.sin((1 - tile.pressed / 0.15) * Math.PI) * 2 : 0;
    const drawY = py + pressedOffset;

    ctx.fillStyle = COLORS.grassLight;
    ctx.fillRect(px + GRID_LINE_WIDTH, drawY + GRID_LINE_WIDTH, s - GRID_LINE_WIDTH * 2, s - GRID_LINE_WIDTH * 2);

    this.drawGrassTexture(px + GRID_LINE_WIDTH, drawY + GRID_LINE_WIDTH, s - GRID_LINE_WIDTH * 2, s - GRID_LINE_WIDTH * 2);

    ctx.fillStyle = COLORS.wood;
    ctx.fillRect(px, drawY, s, GRID_LINE_WIDTH);
    ctx.fillRect(px, drawY + s - GRID_LINE_WIDTH, s, GRID_LINE_WIDTH);
    ctx.fillRect(px, drawY, GRID_LINE_WIDTH, s);
    ctx.fillRect(px + s - GRID_LINE_WIDTH, drawY, GRID_LINE_WIDTH, s);

    ctx.fillStyle = COLORS.woodDark;
    ctx.fillRect(px, drawY + s - GRID_LINE_WIDTH, s, GRID_LINE_WIDTH / 2);
    ctx.fillRect(px + s - GRID_LINE_WIDTH, drawY, GRID_LINE_WIDTH / 2, s);

    if (tile.decoration) {
      this.drawDecoration(tile.decoration, px, drawY, s);
    }

    if (tile.crop) {
      this.drawCrop(tile.crop.type, tile.crop.stage, tile.crop.growthProgress, px, drawY, s);
      this.drawProgressBar(tile.crop.growthProgress, px, drawY, s);
      if (tile.crop.stage === 2) {
        this.drawHarvestIndicator(px, drawY, s);
      }
    }

    if (tile.watered && !tile.crop) {
      ctx.fillStyle = COLORS.water;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(px + GRID_LINE_WIDTH, drawY + GRID_LINE_WIDTH, s - GRID_LINE_WIDTH * 2, s - GRID_LINE_WIDTH * 2);
      ctx.globalAlpha = 1;
    }

    if (tile.waterAnimation > 0) {
      this.drawWaterAnimation(px, drawY, s, tile.waterAnimation);
    }

    if (tile.harvestAnimation > 0) {
      this.drawHarvestFlash(px, drawY, s, tile.harvestAnimation);
    }
  }

  private drawGrassTexture(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    const dotSize = Math.max(2, Math.floor(this.tileSize / 20));
    ctx.fillStyle = COLORS.grassDark;
    const seed = Math.floor(x * 13 + y * 7);
    for (let i = 0; i < 6; i++) {
      const pseudo = ((seed + i * 31) % 100) / 100;
      const pseudo2 = ((seed + i * 47) % 100) / 100;
      const dx = x + pseudo * (w - dotSize);
      const dy = y + pseudo2 * (h - dotSize);
      ctx.fillRect(Math.floor(dx), Math.floor(dy), dotSize, dotSize);
    }
    ctx.fillStyle = COLORS.grass;
    for (let i = 0; i < 4; i++) {
      const pseudo = ((seed + i * 53 + 17) % 100) / 100;
      const pseudo2 = ((seed + i * 29 + 11) % 100) / 100;
      const dx = x + pseudo * (w - dotSize);
      const dy = y + pseudo2 * (h - dotSize);
      ctx.fillRect(Math.floor(dx), Math.floor(dy), dotSize, dotSize);
    }
  }

  private drawCrop(type: CropType, stage: number, progress: number, px: number, py: number, s: number): void {
    const ctx = this.ctx;
    const cx = px + s / 2;
    const cy = py + s / 2;
    const config = CROP_CONFIGS[type];

    if (stage === 0) {
      const size = Math.max(4, Math.floor(s * 0.12));
      ctx.fillStyle = config.color;
      ctx.fillRect(Math.floor(cx - size / 2), Math.floor(cy - size / 2), size, size);
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(Math.floor(cx - size / 2 - 1), Math.floor(cy + size / 2), size + 2, 2);
    } else if (stage === 1) {
      const baseW = Math.floor(s * 0.25);
      const baseH = Math.floor(s * 0.1);
      const topW = Math.floor(s * 0.15);
      const topH = Math.floor(s * 0.12);
      ctx.fillStyle = '#3a6b1e';
      ctx.fillRect(Math.floor(cx - baseW / 2), Math.floor(cy), baseW, baseH);
      ctx.fillStyle = config.color;
      ctx.fillRect(Math.floor(cx - topW / 2), Math.floor(cy - topH), topW, topH);
      ctx.fillStyle = '#2d5016';
      ctx.fillRect(Math.floor(cx - 1), Math.floor(cy - topH * 1.5), 2, topH);
    } else {
      this.drawMatureCrop(type, cx, cy, s, progress);
    }
  }

  private drawMatureCrop(type: CropType, cx: number, cy: number, s: number, _progress: number): void {
    const ctx = this.ctx;
    const bounce = Math.sin(this.time * 3 + cx) * 1;

    if (type === 'carrot') {
      const bodyW = Math.floor(s * 0.2);
      const bodyH = Math.floor(s * 0.35);
      ctx.fillStyle = '#2d5016';
      ctx.fillRect(Math.floor(cx - 2), Math.floor(cy - bodyH / 2 - 10 + bounce), 4, 8);
      ctx.fillStyle = CROP_CONFIGS.carrot.color;
      ctx.fillRect(Math.floor(cx - bodyW / 2), Math.floor(cy - bodyH / 2 + bounce), bodyW, bodyH);
      ctx.fillRect(Math.floor(cx - bodyW / 2 + 2), Math.floor(cy + bodyH / 2 - 4 + bounce), bodyW - 4, 4);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(Math.floor(cx - bodyW / 2 + 1), Math.floor(cy - bodyH / 2 + 2 + bounce), 2, bodyH - 4);
    } else if (type === 'wheat') {
      const stemH = Math.floor(s * 0.35);
      ctx.fillStyle = '#a16207';
      ctx.fillRect(Math.floor(cx - 1), Math.floor(cy - stemH / 2 + bounce), 2, stemH);
      ctx.fillStyle = CROP_CONFIGS.wheat.color;
      for (let i = 0; i < 3; i++) {
        const kernelW = Math.floor(s * 0.08);
        const kernelH = Math.floor(s * 0.1);
        ctx.fillRect(
          Math.floor(cx - kernelW / 2 - s * 0.1 + i * s * 0.1),
          Math.floor(cy - stemH / 2 - s * 0.05 + i * 4 + bounce),
          kernelW,
          kernelH
        );
      }
      ctx.fillStyle = '#fde047';
      ctx.fillRect(Math.floor(cx - s * 0.15), Math.floor(cy - stemH / 2 - s * 0.15 + bounce), Math.floor(s * 0.3), Math.floor(s * 0.05));
    } else if (type === 'tomato') {
      const stemH = Math.floor(s * 0.2);
      ctx.fillStyle = '#2d5016';
      ctx.fillRect(Math.floor(cx - 1), Math.floor(cy - stemH / 2 + bounce), 2, stemH);
      ctx.fillStyle = '#3a6b1e';
      ctx.fillRect(Math.floor(cx - s * 0.15), Math.floor(cy + bounce), Math.floor(s * 0.3), Math.floor(s * 0.06));
      const r = Math.floor(s * 0.15);
      ctx.fillStyle = CROP_CONFIGS.tomato.color;
      ctx.fillRect(Math.floor(cx - r), Math.floor(cy - stemH / 2 - r * 0.5 + bounce), r * 2, r * 1.5);
      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(Math.floor(cx - r + 3), Math.floor(cy - stemH / 2 - r * 0.5 + 3 + bounce), Math.floor(r * 0.5), Math.floor(r * 0.5));
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(Math.floor(cx - 3), Math.floor(cy - stemH / 2 - r * 0.5 - 3 + bounce), 6, 3);
    } else if (type === 'sunflower') {
      const stemH = Math.floor(s * 0.4);
      ctx.fillStyle = '#2d5016';
      ctx.fillRect(Math.floor(cx - 1), Math.floor(cy - stemH / 2 + 5 + bounce), 2, stemH);
      ctx.fillStyle = '#3a6b1e';
      ctx.fillRect(Math.floor(cx - s * 0.1), Math.floor(cy + stemH / 4 + bounce), Math.floor(s * 0.2), Math.floor(s * 0.05));
      const centerR = Math.floor(s * 0.1);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(Math.floor(cx - centerR), Math.floor(cy - stemH / 2 - centerR + bounce), centerR * 2, centerR * 2);
      ctx.fillStyle = CROP_CONFIGS.sunflower.color;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const petalSize = Math.floor(s * 0.08);
        const dist = centerR + petalSize / 2;
        const ppx = cx + Math.cos(angle) * dist;
        const ppy = cy - stemH / 2 + Math.sin(angle) * dist;
        ctx.fillRect(Math.floor(ppx - petalSize / 2), Math.floor(ppy - petalSize / 2 + bounce), petalSize, petalSize);
      }
    }
  }

  private drawProgressBar(progress: number, px: number, py: number, s: number): void {
    const ctx = this.ctx;
    const barW = s - GRID_LINE_WIDTH * 4;
    const barH = Math.max(4, Math.floor(this.tileSize / 15));
    const barX = px + GRID_LINE_WIDTH * 2;
    const barY = py + s - barH - GRID_LINE_WIDTH * 2;

    ctx.fillStyle = COLORS.black;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.globalAlpha = 1;

    const fillW = Math.max(0, Math.floor(barW * Math.min(1, progress)));
    const gradient = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    gradient.addColorStop(0, COLORS.progressStart);
    gradient.addColorStop(1, COLORS.progressEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, fillW, barH);

    ctx.fillStyle = COLORS.white;
    ctx.fillRect(barX, barY, barW, 1);
    ctx.fillRect(barX, barY, 1, barH);
  }

  private drawHarvestIndicator(px: number, py: number, s: number): void {
    const ctx = this.ctx;
    const blink = Math.sin(this.time * 8) > 0;
    if (!blink) return;

    const ix = px + s - s * 0.25;
    const iy = py + s * 0.1;
    const fontSize = Math.floor(s * 0.35);
    ctx.font = `bold ${fontSize}px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    ctx.strokeText('!', ix, iy + fontSize);
    ctx.fillText('!', ix, iy + fontSize);
  }

  private drawWaterAnimation(px: number, py: number, s: number, animTime: number): void {
    const ctx = this.ctx;
    const progress = 1 - animTime / 0.5;
    const dropY = py + (progress < 0.6 ? progress / 0.6 * s * 0.8 : s * 0.8);
    const dropSize = Math.floor(s * 0.08);

    if (progress < 0.6) {
      ctx.fillStyle = COLORS.water;
      ctx.fillRect(Math.floor(px + s / 2 - dropSize / 2), Math.floor(dropY), dropSize, dropSize * 1.3);
    } else {
      ctx.strokeStyle = COLORS.water;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1 - (progress - 0.6) / 0.4;
      const splashR = (progress - 0.6) / 0.4 * s * 0.25;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        const sx = px + s / 2 + Math.cos(angle) * splashR;
        const sy = py + s * 0.8 + Math.sin(angle) * splashR * 0.5;
        ctx.fillStyle = COLORS.water;
        ctx.fillRect(Math.floor(sx - 1), Math.floor(sy - 1), 3, 3);
      }
      ctx.globalAlpha = 1;
    }
  }

  private drawHarvestFlash(px: number, py: number, s: number, animTime: number): void {
    const ctx = this.ctx;
    ctx.globalAlpha = animTime / 0.4 * 0.6;
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(px + GRID_LINE_WIDTH, py + GRID_LINE_WIDTH, s - GRID_LINE_WIDTH * 2, s - GRID_LINE_WIDTH * 2);
    ctx.globalAlpha = 1;
  }

  private drawDecoration(type: string, px: number, py: number, s: number): void {
    const ctx = this.ctx;
    const cx = px + s / 2;
    const cy = py + s / 2;

    if (type === 'scarecrow') {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(Math.floor(cx - 2), Math.floor(py + s * 0.2), 4, s * 0.6);
      ctx.fillRect(Math.floor(px + s * 0.15), Math.floor(cy - 2), s * 0.7, 4);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(Math.floor(cx - s * 0.1), Math.floor(py + s * 0.1), s * 0.2, s * 0.15);
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(Math.floor(cx - s * 0.06), Math.floor(py + s * 0.15), 3, 3);
      ctx.fillRect(Math.floor(cx + s * 0.03), Math.floor(py + s * 0.15), 3, 3);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(Math.floor(px + s * 0.15), Math.floor(py + s * 0.28), s * 0.15, s * 0.2);
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(Math.floor(cx + s * 0.02), Math.floor(py + s * 0.28), s * 0.13, s * 0.2);
    } else if (type === 'fence') {
      ctx.fillStyle = '#92400e';
      for (let i = 0; i < 3; i++) {
        const px2 = px + s * 0.15 + i * s * 0.3;
        ctx.fillRect(Math.floor(px2), Math.floor(py + s * 0.2), Math.floor(s * 0.12), Math.floor(s * 0.6));
        ctx.fillStyle = '#78350f';
        ctx.fillRect(Math.floor(px2), Math.floor(py + s * 0.2), Math.floor(s * 0.12), 3);
        ctx.fillStyle = '#92400e';
      }
      ctx.fillStyle = '#b45309';
      ctx.fillRect(Math.floor(px + s * 0.1), Math.floor(py + s * 0.35), Math.floor(s * 0.8), Math.floor(s * 0.06));
      ctx.fillRect(Math.floor(px + s * 0.1), Math.floor(py + s * 0.55), Math.floor(s * 0.8), Math.floor(s * 0.06));
    } else if (type === 'windmill') {
      ctx.fillStyle = '#fef3c7';
      const baseW = s * 0.35;
      const baseH = s * 0.5;
      ctx.fillRect(Math.floor(cx - baseW / 2), Math.floor(cy), Math.floor(baseW), Math.floor(baseH));
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(Math.floor(cx - s * 0.05), Math.floor(cy + s * 0.15), Math.floor(s * 0.1), Math.floor(s * 0.12));
      const angle = this.time * 2;
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const a = angle + (Math.PI * 2 * i) / 4;
        const bladeLen = s * 0.28;
        const endX = cx + Math.cos(a) * bladeLen;
        const endY = cy + Math.sin(a) * bladeLen;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.fillStyle = '#e5e7eb';
        const bladeW = s * 0.06;
        ctx.fillRect(
          Math.floor(cx + Math.cos(a) * bladeLen * 0.5 - bladeW / 2),
          Math.floor(cy + Math.sin(a) * bladeLen * 0.5 - bladeW / 2),
          Math.floor(bladeW),
          Math.floor(bladeLen * 0.5)
        );
      }
      ctx.fillStyle = '#78350f';
      ctx.fillRect(Math.floor(cx - 3), Math.floor(cy - 3), 6, 6);
    }
  }

  renderParticles(particles: { x: number; y: number; life: number; maxLife: number; type: string; color?: string; size: number }[]): void {
    const ctx = this.ctx;
    for (const p of particles) {
      const px = this.offsetX + p.x * this.tileSize;
      const py = this.offsetY + p.y * this.tileSize;
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color || '#ffffff';
      const size = Math.floor(p.size * (this.tileSize / TILE_SIZE));
      if (p.type === 'coin') {
        ctx.fillRect(Math.floor(px - size / 2), Math.floor(py - size / 2), size, size);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(Math.floor(px - size / 4), Math.floor(py - size / 4), Math.ceil(size / 2), Math.ceil(size / 2));
      } else {
        ctx.fillRect(Math.floor(px - size / 2), Math.floor(py - size / 2), size, size);
      }
      ctx.globalAlpha = 1;
    }
  }

  renderFloatingTexts(texts: { x: number; y: number; life: number; maxLife: number; text: string; color: string }[]): void {
    const ctx = this.ctx;
    for (const t of texts) {
      const px = this.offsetX + t.x * this.tileSize;
      const py = this.offsetY + t.y * this.tileSize;
      const alpha = t.life / t.maxLife;
      const fontSize = Math.floor(12 * (this.tileSize / TILE_SIZE));
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${fontSize}px 'Press Start 2P', monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = t.color;
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      ctx.strokeText(t.text, px, py);
      ctx.fillText(t.text, px, py);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
  }

  renderSoundTexts(texts: { x: number; y: number; life: number; maxLife: number; text: string }[]): void {
    const ctx = this.ctx;
    for (const t of texts) {
      const px = this.offsetX + t.x * this.tileSize;
      const py = this.offsetY + t.y * this.tileSize;
      const alpha = t.life / t.maxLife;
      const fontSize = Math.floor(10 * (this.tileSize / TILE_SIZE));
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${fontSize}px 'Press Start 2P', monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      ctx.strokeText(t.text, px, py);
      ctx.fillText(t.text, px, py);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
  }

  renderSelectedTile(col: number, row: number): void {
    const ctx = this.ctx;
    const px = this.offsetX + col * this.tileSize;
    const py = this.offsetY + row * this.tileSize;
    const s = this.tileSize;
    const blink = Math.sin(this.time * 6) > 0;
    if (blink) {
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.strokeRect(px + 1, py + 1, s - 2, s - 2);
    }
  }
}
